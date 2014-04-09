angular.module('busmobile.controllers').controller('HomeController', function($scope, socket, geolocation) {
  socket.on('data', function(data) {
    $scope.data = data;
    console.log("data updated");
    console.log(data);
  });
  $scope.map = {
      center: {latitude: 43.001559, longitude: -78.786035}, // ub north campus
      zoom: 14
  };  
  $scope.geolocation = null;
  geolocation.getLocation().then(function(data){
    $scope.geolocation = {latitude: data.coords.latitude, longitude: data.coords.longitude};
  });
});

