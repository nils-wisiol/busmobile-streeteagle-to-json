angular.module('busmobile.controllers').controller('HomeController', function($scope, socket, geolocation) {
  $scope.data = {};
  function setData(data) {
    Object.keys(data).forEach(function(k) {
      $scope.data[k] = data[k];
    });
  }
  socket.on('data', function(data) {
    setData(data);
    console.log("data updated");
    console.log(data);
  });
  socket.on('staticdata', function(staticdata) {
    setData(staticdata);
    console.log("static data updated");
    console.log(staticdata);
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

