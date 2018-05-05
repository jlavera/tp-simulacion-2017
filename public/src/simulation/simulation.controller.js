(function(){
  angular.module('simulationApp')
  .controller('simulationController', SimulationController);

  SimulationController.$inject = ['HV', '$filter'];

  function SimulationController(HV, $filter){
    let ctrl = this;

    // Datos
    // Intervalo entre Arribos
    function IA(){
      return ctrl.IAFunc();
    }

    // Tiempo de respuesta
    function TA() {
      return ctrl.TAFunc();
    }

    // Control
    ctrl.CI = 5; // Cantidad Instancias
    ctrl.MS = 100; // Maximo Fila
    ctrl.TF = 10; // Tiempo Final

    // Array de resultados
    ctrl.resultados = [];

    ctrl.startSimulation = function() {
      initState();

      ctrl.simulating = true;

      let proxInstanciaSalidaIdx;

      do {
        proxInstanciaSalidaIdx = buscarMenorTPSIdx();

        // Llegada
        if (ctrl.TPLL <= ctrl.TPS[proxInstanciaSalidaIdx]){
          ctrl.T = ctrl.TPLL;

          let intervaloArribo = IA();

          ctrl.TPLL = ctrl.T + intervaloArribo;
		  
		  ctrl.NT += 1;

          // Rechazar por sistema lleno
          if (ctrl.NS === ctrl.MS) {
            ctrl.CR = ctrl.CR + 1;
          } else {
            ctrl.NS = ctrl.NS + 1;
			
			ctrl.STLL += ctrl.TPLL;

            if (ctrl.NS <= ctrl.CI) {
              let instanciaDisponibleIdx = buscarInstanciaLibreIdx();

              let tiempoRespuesta = TA();

              ctrl.TPS[instanciaDisponibleIdx] = ctrl.T + tiempoRespuesta;
			  
			  ctrl.STOI[instanciaDisponibleIdx] += ctrl.T - ctrl.ITOI[instanciaDisponibleIdx];
            }
          }
        } else {
          // Salida
          ctrl.T = ctrl.TPS[proxInstanciaSalidaIdx];
		  
		  ctrl.STS += ctrl.TPS[proxInstanciaSalidaIdx];

          ctrl.NS = ctrl.NS - 1;

          if (ctrl.NS >= ctrl.CI) {
            let tiempoRespuesta = TA();

            ctrl.TPS[proxInstanciaSalidaIdx] = ctrl.T + tiempoRespuesta;
          } else {
            ctrl.TPS[proxInstanciaSalidaIdx] = HV;
          }
        } 
      } while ((function () {
        if (ctrl.T <= ctrl.TF) {
          return true;
        }

        if (ctrl.NS !== 0) {
          ctrl.TPLL = HV;

          return true;
        }

        return false;
      })());

      // ctrl.resultados.push(calcularResultado());
      ctrl.simulating = false;
    };

    function calcularResultado(){
		let resultados = [];
		
		// Porcentaje Tiempo Ocioso por instancia
		let PTOI = [];
		ctrl.STOI.forEach( STOII => PTOI.push(100 * ( STOII / ctrl.T)) );
		PTOI = PTOI.map( (value, idx) => {
			return {
				description: 'Porcentaje Tiempo Ocioso Instancia ${idx}',
				value: value
			};
		});
		PTOI.forEach( _ => resultados.push(_));
		
		// Tiempo Promedio de Respuesta
		let PTR = {
			description: 'Promedio Tiempo de Respuesta',
			value: (ctrl.STS - ctrl.STLL) / ctrl.NT
		};
		resultados.push(PTR);
		
		// Porcentaje Cantidad de Rechazos
		let PCR = {
			description: 'Porcentaje Cantidad de Rechazos',
			value: 100 * (ctrl.CR / ctrl.NT)
		};
		resultados.push(PCR);
		
		let pcrValue = $filter('number')(PCR.value, 2);
		
		return {
			colors: [getChartColorFor(parseInt(pcrValue))],
			labels: ['Porcentaje Rechazos'],
			series: ['Rechazos'],
			data: [pcrValue],
			cantidadInstancias: ctrl.CI,
			filaMaxima: ctrl.MS,
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

      for (let i = 0; i < arraySize; i++) {
        array.push(value);
      }

      return array;
    }

    function buscarMenorTPSIdx() {
      let index;
      let min;

      ctrl.TPS.forEach((current, idx) => {
        if (!min || current < min) {
          min = current;
          index = idx;
        }
      });

      return index;
    }

    function buscarInstanciaLibreIdx() {
      let index = -1;

      ctrl.TPS.forEach((current, idx) => {
        if (index < 0 && current === HV) {
          index = idx;
        }
      });

      return index;
    }

    function initState(){
      // Resultado
      ctrl.PCR  = 0; // Porcentaje Cantidad de rechazos
      ctrl.PTOI = initArrayWith(ctrl.CI, 0); // Porcentaje de Tiempo Ocioso por Instancia
      ctrl.PTR  = 0; // Promedio Tiempo de Respuesta

      // Estado
      ctrl.NS   = 0; // Cantidad de Llamadas en el Sistema

      // TEF
      ctrl.TPLL = 0; // Tiempo Proxima Llegada
      ctrl.TPS  = initArrayWith(ctrl.CI, HV); // Tiempo Proximas Salidas Instancias

      // Auxiliares
      ctrl.IAFunc = Prob.lognormal(2, 1);
      ctrl.TAFunc = Prob.lognormal(2, 0.5);
      ctrl.T      = 0;
      ctrl.ITOI   = initArrayWith(ctrl.CI, 0); // Inicio Tiempo Ocioso Instancia
      ctrl.STOI   = initArrayWith(ctrl.CI, 0); // Sumatoria Tiempo Ocioso Instancia
      ctrl.STLL   = 0; // Sumatoria Tiempo de Llegada
      ctrl.STS    = 0; // Sumatoria Tiempo de Salida
	  ctrl.NT     = 0; // Cantidad total de llamadas al sistema
	  ctrl.CR     = 0; // Cantidad de rechazos
    }
  }
})();
