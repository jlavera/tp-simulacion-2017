(function(){
  angular.module('simulationApp')
  .controller('simulationController', SimulationController);

  SimulationController.$inject = ['HV', '$filter']
  function SimulationController(HV, $filter){
    let ctrl = this;

    // Datos
    // Intervalo entre Arribos
    function IA(rand){
      return Math.round(Math.log((1/rand) - 1) * 3.3459 + 5.2727);
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
    function CC(rand){
      return Math.round(-4.84 * Math.log(1 - rand));
    }

    function randomForFdpFactory(fdp){
      switch (fdp) {
        case 'CC': return getRandomArbitrary(0.2, 0.95);
        case 'IA': return getRandomArbitrary(0.01, 0.8);
      }
    }

    function getRandomArbitrary(min, max) {
      return Math.random() * (max - min) + min;
    }

    // Control
    ctrl.CF = 5; // Cantidad Fermentadores
    ctrl.stockMaximo = 100;
    ctrl.CDF = 10; // Capacidad De Fermentadores;
    ctrl.CDC = 10; // Capacidad De Cocina;
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

      let resultado;

      while (ctrl.T < ctrl.TF) {
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
      let fermentadorLibre = getFermentadorLibre();

      if (typeof fermentadorLibre === 'undefined') {
        ctrl.ITOC = ctrl.T;
        ctrl.TPC = HV;

      } else {
        let tiempoFermentacion = TFER();
        let tiempoCoccion = TC();

        ctrl.TPC = ctrl.T + tiempoCoccion;
        ctrl.TPF[fermentadorLibre] = ctrl.TPC + tiempoFermentacion;

        ctrl.STOF[fermentadorLibre] += (ctrl.T + tiempoCoccion - ctrl.ITOF[fermentadorLibre]);

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
      let iaRand = randomForFdpFactory('IA');
      let intervaloArribo = IA(iaRand);

      let ccRand = randomForFdpFactory('CC');
      let cantidadComprada = CC(ccRand);

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
      let cociente = ctrl.CLNE + ctrl.CLC;
      let PLNE = {
        description: `Porcentaje Litros No Entregados`,
        value: cociente === 0 ? 0 : 100 * (ctrl.CLNE / (ctrl.CLNE + ctrl.CLC))
      };
      resultados.push(PLNE);

      // Promedio de Desperdicio
      let PDD = {
        description: `Promedio de Desperdicio`,
        value: 100 * (ctrl.CLD / ctrl.CLP)
      };
      resultados.push(PDD);

      let pddValue = $filter('number')(PDD.value, 2);
      let plneValue = $filter('number')(PLNE.value, 2);

      return {
        colors: [getChartColorFor(parseInt(pddValue)), getChartColorFor(parseInt(plneValue))],
        labels: ['Promedio Desperdicio', 'Porcentaje No Entregados'],
        series: ['Desperdicio', 'No Entregado'],
        data: [pddValue, plneValue],
        cantidadFermentadores: ctrl.CF,
        stockMaximo: ctrl.stockMaximo,
        duracion: ctrl.TF,
        resultados
      };
    }

    function getChartColorFor(value){
      if (value < 5) return "rgb(66,244,69)";
      else if (value < 25) return "rgb(9,14,160)";
      else if (value < 50) return "rgb(247,255,43)";
      else if (value < 75) return "rgb(242,124,33)";
      else return "rgb(186,26,1)";
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
