(function(){
  angular.module('simulationApp', ['chart.js'])
  .constant('HV', +Infinity)
  .config(['ChartJsProvider', function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            max: 100,
            min: 0
          }
        }]
      }
    });

    // Configure all line charts
    ChartJsProvider.setOptions('bar', {
      showLines: true
    });
  }]);

})();
