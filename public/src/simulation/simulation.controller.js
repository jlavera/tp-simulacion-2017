(function(){
  angular.module('simulationApp')
  .controller('simulationController', SimulationController);

  SimulationController.$inject = ['HV']
  function SimulationController(HV){
    let ctrl = this;

    // Datos
    // Intervalo entre Arribos
    function IA(){
      //TODO es fdp
      return 3;
    }

    // Tiempo Fermentación
    function TFER(){
      return 20;
    };

    // Tiempo Cocción
    function TC(){
      return 1;
    }

    // Cantidad Comprada
    function CC(){
      //TODO es fdp
      return 15;
    }

    // Control
    ctrl.CF = 5; // Cantidad Fermentadores
    ctrl.stockMaximo = 100;
    ctrl.CDF = 20; // Capacidad De Fermentadores;
    ctrl.CDC = 20; // Capacidad De Cocina;
    ctrl.TF = 1000; // Tiempo Final

    // Array de resultados
    ctrl.resultados = [];

    initState();

    ctrl.startSimulation = function(){
      initState();
      ctrl.simulating = true;
      let proxFermentadorIdx;
      let fermentadorLibre;
      let tiempoFermentacion;
      let tiempoCoccion;
      let intervaloArribo;
      let cantidadComprada;

      let resultado;

      while (ctrl.T <= ctrl.TF) {
        proxFermentadorIdx = getIndexProximoFermentador();

        if (ctrl.TPC <= ctrl.TPV){
          if (ctrl.TPC <= ctrl.TPF[proxFermentadorIdx]){
            ramaCoccion();
          } else {
            ramaTPF(proxFermentadorIdx);
          }
        } else {
          if (ctrl.TPF[proxFermentadorIdx] <= ctrl.TPV){
            ramaTPF(proxFermentadorIdx);
          } else {
            ramaVenta();
          }
        }
      };

      resultado = calcularResultado();
      ctrl.resultados.push(resultado);
      ctrl.simulating = false;
    };

    function ramaCoccion(){
      ctrl.T = ctrl.TPC;
      fermentadorLibre = getFermentadorLibre();

      if (typeof fermentadorLibre === 'undefined') {
        ctrl.ITOC = ctrl.T;
        ctrl.TPC = HV;

      } else {
        tiempoFermentacion = TFER();
        tiempoCoccion = TC();

        ctrl.TPC = ctrl.T + tiempoCoccion;
        ctrl.TPF[fermentadorLibre] = ctrl.TPC + tiempoFermentacion;

        ctrl.STOF[fermentadorLibre] += (ctrl.T - ctrl.ITOF[fermentadorLibre]);

        ctrl.CLP += ctrl.CDC;
      }
    }

    function ramaTPF(indiceProximaFermentadora){
      ctrl.T = ctrl.TPF[indiceProximaFermentadora];
      ctrl.TPF[indiceProximaFermentadora] = HV;
      ctrl.SA += ctrl.CDF;

      if (ctrl.SA < ctrl.stockMaximo){
        if (ctrl.TPC === HV){
          tiempoCoccion = TC();
          ctrl.TPC = ctrl.T + tiempoCoccion;
          ctrl.STOC += (ctrl.T - ctrl.ITOC);

        } else {
          // Do nothing
        }
      } else {
        ctrl.CLD += (ctrl.SA - ctrl.stockMaximo);
        ctrl.SA = ctrl.stockMaximo;

        ctrl.TPC = HV;
        ctrl.ITOC = ctrl.T;
      }

      ctrl.ITOF[indiceProximaFermentadora] = ctrl.T;
    }

    function ramaVenta(){
      intervaloArribo = IA();
      cantidadComprada = CC();

      ctrl.T = ctrl.TPV;
      ctrl.TPV = ctrl.T + intervaloArribo;

      if (cantidadComprada <= ctrl.SA){
        ctrl.SA -= cantidadComprada;
        ctrl.CLC += cantidadComprada;

        if (ctrl.TPC === HV){
          tiempoCoccion = TC();
          ctrl.TPC = ctrl.T + tiempoCoccion;

          ctrl.STOC += (ctrl.T - ctrl.ITOC);
        } else {
          // Nada...
        }

      } else {
        ctrl.CLNE += cantidadComprada;
      }
    }

    function calcularResultado(){
      let resultados = [];

      // Porcentaje Tiempo Ocioso Fermentador
      let PTOF = [];
      ctrl.STOF.forEach( STOFI => PTOF.push(100 * ( STOFI / ctrl.T)) );
      PTOF = PTOF.map( (value, idx) => {
        return {
          description: `Porcentaje Tiempo Ocioso Fermentador ${idx}`,
          value: value
        };
      });
      PTOF.forEach( _ => resultados.push(_));

      // Porcentaje Tiempo Ocioso equipo de Cocción
      let PTOC = {
        description: `Porcentaje Tiempo Ocioso equipo de Cocción`,
        value: 100 * (ctrl.STOC / ctrl.T)
      };
      resultados.push(PTOC);

      // Porcentaje Litros No Entregados
      let PLNE = {
        description: `Porcentaje Litros No Entregados`,
        value: 100 * (ctrl.CLNE / (ctrl.CLNE + ctrl.CLC))
      };
      resultados.push(PLNE);

      // Promedio de Desperdicio
      let PDD = {
        description: `Promedio de Desperdicio`,
        value: 100 * (ctrl.CLD / ctrl.CLP)
      };
      resultados.push(PDD);

      return {
        labels: ['Promedio Desperdicio', 'Porcentaje No Entregados'],
        series: ['Desperdicio', 'No Entregado'],
        data: [[PDD], [PLNE]],
        cantidadFermentadores: ctrl.CF,
        stockMaximo: ctrl.stockMaximo,
        duracion: ctrl.TF,
        resultados
      };
    }

    function initArrayWith(arraySize, value){
      let array = [];
      for (let i = 0; i < arraySize; i++) array[i] = value;

      return array;
    }

    function getIndexProximoFermentador(){
      let index,
          min;

      ctrl.TPF.forEach( (current, idx) => {
        if (!min) {
          min = current;
          index = idx;
        } else if (current < min) {
          min = current;
          index = idx;
        }
      });

      return index;
    }

    function getFermentadorLibre(){
      let idx;
      let fermentadores = ctrl.TPF;

      for (let i = 0; i < fermentadores.length; i++) {
        if (fermentadores[i] === HV){
          idx = i;
          break;
        }
      }

      return idx;
    };

    function initState(){
      // Resultado
      ctrl.PTOF = initArrayWith(ctrl.CF, 0); // Porcentaje Tiempo Ocioso Fermentador
      ctrl.PTOC = 0; // Porcentaje Tiempo Ocioso equipo de Cocción
      ctrl.PLNE = 0; // Porcentaje Litros No Entregados
      ctrl.PDD = 0; // Promedio de Desperdicio

      // Estado
      ctrl.SA = 0; // Stock Actual

      // TEF
      ctrl.TPC = 0; //Tiempo Próxima Cocción
      ctrl.TPV = 21; //Tiempo Próxima Venta
      ctrl.TPF = initArrayWith(ctrl.CF, HV); //Tiempo Próximo Fermentador

      // Auxiliares
      ctrl.T = 0;
      ctrl.ITOF = initArrayWith(ctrl.CF, 0); // Inicio Tiempo Ocioso Fermentador
      ctrl.STOF = initArrayWith(ctrl.CF, 0); // Sumatoria Tiempo Ocioso Fermentador
      ctrl.ITOC = 0; // Inicio Tiempo Ocioso Cocina
      ctrl.STOC = 0; // Sumatoria Tiempo Ocioso Cocina
      ctrl.CLP = 0; // Cantidad Litros Producidos
      ctrl.CLD = 0; // Cantidad Litros Desperdicio
      ctrl.CLC = 0; // Cantidad Litros Comprados
      ctrl.CLNE = 0; // Cantidad Litros No Entregados
    }
  }
})();
