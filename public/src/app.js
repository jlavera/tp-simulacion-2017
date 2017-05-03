(function(){
  angular.module('simulationApp', ['chart.js'])
  .constant('HV', +Infinity)
  .config(['ChartJsProvider', function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
      chartColors: ['#FF5252', '#FF8A80'],
      responsive: true
    });
    // Configure all line charts
    ChartJsProvider.setOptions('bar', {
      showLines: true
    });
  }]);

})();
