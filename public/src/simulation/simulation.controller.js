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
      return 6;
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
      return 4;
    }

    // Control
    this.CF; // Cantidad Fermentadores
    this.stockMaximo;
    this.CDF = 20; // Capacidad De Fermentadores;
    this.CDC = 20; // Capacidad De Cocina;

    // Array de resultados
    this.resultados = [];

    initState();

    this.startSimulation = function(){
      let proxFermentadorIdx;
      let fermentadorLibre;
      let tiempoFermentacion;
      let tiempoCoccion;
      let intervaloArribo;
      let cantidadComprada;

      proxFermentadorIdx = getIndexProximoFermentador();

      if (this.TPC <= this.TPV){
        if (this.TPC <= this.TPF[proxFermentadorIdx]]){
            this.T = this.TPC;
            fermentadorLibre = getFermentadorLibre();

            if (fermentadorLibre) {
              this.ITOC = this.T;
              this.TPC = HV;

            } else {
              tiempoFermentacion = this.TFER();
              tiempoCoccion = this.TC();

              this.TPC = this.T + tiempoCoccion;
              this.TPF[fermentadorLibre] = this.TPC + tiempoFermentacion;

              this.STOF[fermentadorLibre] += (this.T - this.ITOF[fermentadorLibre]);

              this.FMT[fermentadorLibre] = 1;
              this.STOC += (this.T - this.ITOC);
              this.CLP += this.CDC;
            }

        } else {

        }
      } else {
        if (this.TPF[proxFermentadorIdx] <= this.TPV){

        } else {
          intervaloArribo = this.IA();
          cantidadComprada = this.CC();

          this.T = this.TPV;
          this.TPV = this.T + intervaloArribo;

          if (cantidadComprada <= this.SA){
            
          } else {

          }

        }
      }
    };

    function initArrayWith(arraySize, value){
      let array = [];
      for (let i = 0; i < arraySize; i++) array[i] = value;

      return array;
    }

    function getIndexProximoFermentador(){
      let index;
      let min;

      this.TPF.forEach( (current, idx)) => {
        if (!min) {
          min = current;
          index = idx;
        } else if (current < min) {
          min = current;
          index = idx;
        }
      }

      return index;
    }

    function getFermentadorLibre(){
      let idx;
      let fermentadores = this.TPF.length;

      for (let i = 0; i < fermentadores; i++) {
        if (fermentadores[i] === HV){
          idx = i;
          break;
        }
      }

      return idx;
    };

    function initState(){
      // Resultado
      this.PTOF = initArrayWith(this.CF, 0); // Porcentaje Tiempo Ocioso Fermentador
      this.PTOC = initArrayWith(this.CF, 0); // Porcentaje Tiempo Ocioso equipo de Cocción
      this.PDD = 0; // Promedio de Desperdicio

      // Estado
      this.FMT = initArrayWith(this.CF, 0); // Array de fermentadores
      this.SA = 0; // Stock Actual

      // TEF
      this.TPC = 0; //Tiempo Próxima Cocción
      this.TPV = 21; //Tiempo Próxima Venta
      this.TPF = initArrayWith(this.CF, HV); //Tiempo Próximo Fermentador

      // Auxiliares
      this.T = 0;
      this.TF = 0;
      this.ITOF = initArrayWith(this.CF, 0); // Inicio Tiempo Ocioso Fermentador
      this.STOF = initArrayWith(this.CF, 0); // Sumatoria Tiempo Ocioso Fermentador
      this.ITOC = 0; // Inicio Tiempo Ocioso Cocina
      this.STOC = 0; // Sumatoria Tiempo Ocioso Cocina
      this.CLP = 0; // Cantidad Litros Producidos
      this.CLD = 0; // Cantidad Litros Desperdicio
      this.CLC = 0; // Cantidad Litros Comprados
      this.CLNV = 0; // Cantidad Litros No Vendidos
    }
  }
})();
