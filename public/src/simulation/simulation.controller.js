(function(){
  angular.module('simulationApp')
  .controller('simulationController', SimulationController);

  SimulationController.$inject = ['HV', '$filter'];

  function SimulationController(HV, $filter){
    let ctrl = this;

    ctrl.resultados = [];

    function exponencial(b) {
      return x => -Math.log(Math.pow(1 - x, b));
    }

    // Datos
    //  FdP de la lluvia
    function fpdLluvia() {
      let fn;

      switch  (ctrl.estacion) {
        case 'verano':
          fn = exponencial(0.072254);
          break;
        case 'primavera':
          fn = exponencial(0.11571);
          break;
        case 'invierno':
          fn = exponencial(0.089158);
          break;
        case 'otono':
          fn = exponencial(0.095987);
          break;
        default:
          throw Error('Estacion no encontrada');
      }

      return fn(Math.random());
    }

    //  Desagote Maldonado
    function fpdMaldonado() {
      return 5;
    }

    //  Desagote Vega
    function fdpVega() {
      return 6;
    }

    //  Desagote Medrano
    function fdpMedrano() {
      return 7;
    }

    // Control
    ctrl.TF   = 24 * 90; // Tiempo final
    ctrl.ABSR = 0;  // Absorcion por reservorio
    ctrl.ABSV = 0;  // Absorcion por vegetacion
    ctrl.DVR  = 9999999;  // Dias vaciado de reservorio
    ctrl.estacion = 'verano';

    ctrl.startSimulation = function() {
      initState();

      ctrl.simulating = true;

      do {
        ctrl.T    = ctrl.T + 1;
        ctrl.DUVR = ctrl.DUVR + 1;

        // Vaciar reservorios
        if (ctrl.DVR <= ctrl.DUVR) {
          ctrl.DUVR = 0;
          ctrl.ABSR_AUX = ctrtl.ABSR;
        }

        let lluviaCaida = fpdLluvia();

        // Contar dias con lluvia
        if (lluviaCaida > 0) {
          ctrl.lluviaTotal   = ctrl.lluviaTotal + lluviaCaida;
          ctrl.diasConLluvia = ctrl.diasConLluvia + 1;
        }

        // Acumular lluvia
        ctrl.AASC = ctrl.AASC + lluviaCaida;

        // Capacidad de desagote
        let desagoteTotal = fpdMaldonado() + fdpVega() + fdpMedrano();

        // Desagotar agua acumulada
        if (ctrl.AASC > 0) {
          ctrl.AASC = ctrl.AASC - desagoteTotal;
        } else if (ctrl.AASC < 0) {
          ctrl.AASC = 0;
        }

        // Contar distintas absorciones
        if (ctrl.AASC > 0) {
          let lt = 0;
          lt = ctrl.AASC * ctrl.areaComuna;

          // Primero absorve el reservorio
          if (lt >= ctrl.ABSR_AUX) {
            lt = lt - ctrl.ABSR_AUX;
            ctrl.ACUMR = ctrl.ACUMR + ctrl.ABSR_AUX;
            ctrl.ABSR_AUX = 0;

            // Luego absorve la vegetación
            if (lf >= ctrl.ABSV_AUX) {
              lt = lt - ctrl.ABSV_AUX;
              ctrl.ACUMV = ctrl.ACUMV + ctrl.ABSV_AUX;
            } else {
              ctrl.ACUMV = ctrl.ACUMV + lt;
              lt = 0;
            }
          } else {
            ctrl.ACUMR = ctrl.ACUMR + lt;
            ctrl.ABSR_AUX = ctrl.ABSR_AUX - lt;
            lt = 0;
          }

          ctrl.AASC = lt / ctrl.areaComuna;

          if (ctrl.AASC > 0) {
            ctrl.CHAA = ctrl.CHAA = 1;
            if (ctrl.MaxRI < ctrl.AASC) {
              ctrl.MaxRI = ctrl.AASC;
            }

            ctrl.CantInund = ctrl.CantInund + 1;
          }
        }
      } while (ctrl.T <= ctrl.TF);

      ctrl.resultados.unshift(calcularResultado());
      console.log(ctrl.resultados);
      ctrl.simulating = false;
    };

    function calcularResultado(){
      let resultados = [];

      // ctrl.MMMI = -1; // Máximo registro de mm inundados (mm)
      // ctrl.CHAA = 0; // Cantidad de horas con agua acumulada (horas)
      // ctrl.PHI = 0; // Porcentaje de horas con inundación registrada respecto al total de horas que se detectó precipitación (%)
      // ctrl.PAV = 0; // Porcentaje de agua absorbida por vegetación respecto al total de precipitaciones (%)
      // ctrl.PAR = 0; // Porcentaje de agua absorbida por reservorios respecto al total de precipitaciones (%)

      resultados.push({
        description: 'Máximo registro de inundación (mm.)',
        value:       ctrl.MMMI
      });

      resultados.push({
        description: 'Tiempo con agua acumulada (horas)',
        value:       ctrl.CHHA
      });

      // resultados.push({
      //   description: 'Porcentaje de horas con inundación registrada respecto al total de horas que se detectó precipitación (%)',
      //   value:       ctrl.CHAA / ctrl.TF
      // });

      // // Porcentaje Tiempo Ocioso por instancia
      // let PTOI = [];
      // ctrl.STOI.forEach(STOII => PTOI.push(100 * (STOII / ctrl.T)));
      // PTOI = PTOI.map((value, idx) => {
      //   return {
      //     description: `Porcentaje Tiempo Ocioso Instancia ${idx + 1}`,
      //     value:       `${Math.round(value)}%`
      //   };
      // });
      // PTOI.forEach(resultado => resultados.push(resultado));

      // // Tiempo Promedio de Respuesta
      // let PTR = {
      //   description: 'Promedio Tiempo de Respuesta',
      //   value:        (ctrl.STS - ctrl.STLL) / (ctrl.NT - ctrl.CR)
      // };
      // resultados.push(PTR);

      // // Porcentaje Cantidad de Rechazos
      // const PCRValue = Math.round(100 * (ctrl.CR / ctrl.NT));
      // let PCR = {
      //   description: 'Porcentaje Cantidad de Rechazos',
      //   value:       `${PCRValue}%`
      // };
      // resultados.push(PCR);

      // let pcrValue = $filter('number')(PCRValue, 2);

      return {
        colors:                [getChartColorFor(parseInt(ctrl.CHAA / ctrl.TF))],
        labels:                ['Porcentaje horas con inundación'],
        series:                ['Rechazos'],
        data:                  [ctrl.CHAA / ctrl.TF],
        absorcionReservorio:   ctrl.ABSR,
        absorcionVegetacion:   ctrl.ABSV,
        diasVaciadoReservorio: ctrl.DVR,
        duracion:              ctrl.TF,
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

    function initState(){
      // Resultado
      ctrl.MMMI = -1; // Máximo registro de mm inundados (mm)
      ctrl.CHAA = 0; // Cantidad de horas con agua acumulada (horas)
      ctrl.PHI = 0; // Porcentaje de horas con inundación registrada respecto al total de horas que se detectó precipitación (%)
      ctrl.PAV = 0; // Porcentaje de agua absorbida por vegetación respecto al total de precipitaciones (%)
      ctrl.PAR = 0; // Porcentaje de agua absorbida por reservorios respecto al total de precipitaciones (%)

      // Estado
      ctrl.AASC = 0; // Agua acumulada sobre la superficie (mm)

      // Auxiliares
      ctrl.areaComuna = 14600000;
      ctrl.T          = 0;
      ctrl.ABSR_AUX   = ctrl.ABSR;  // Absorcion por reservorio (aux)
      ctrl.ABSV_AUX   = ctrl.ABSV;  // Absorcion por vegetacion (aux)
      ctrl.DUVR       = 0; // Dias desde ultimo vaciamiento de reservorio (dias)

    }
  }
})();
