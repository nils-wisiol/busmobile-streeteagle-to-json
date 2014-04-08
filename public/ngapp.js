// Declare app level module which depends on filters, and services
angular.module('busmobile.controllers',[]);
angular.module('busmobile.services',[]);
angular.module('busmobile', ['ngRoute', 'busmobile.controllers', 'busmobile.services']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/index',
        controller: 'HomeController'
      }).
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(false);
  }]);

