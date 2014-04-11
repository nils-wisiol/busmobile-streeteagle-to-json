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
  $scope.geolocDistance = function(loc) {
    var lat1 = loc.latitude;
    var radianLat1 = lat1 * (Math.PI / 180);
    var lng1 = loc.longitude;
    var radianLng1 = lng1 * (Math.PI / 180);
    var lat2 = $scope.geolocation.latitude;
    var radianLat2 = lat2 * (Math.PI / 180);
    var lng2 = $scope.geolocation.longitude;
    var radianLng2 = lng2 * (Math.PI / 180);
    var earth_radius = 6371;
    var diffLat = (radianLat1 - radianLat2);
    var diffLng = (radianLng1 - radianLng2);
    var sinLat = Math.sin(diffLat / 2);
    var sinLng = Math.sin(diffLng / 2);
    var a = Math.pow(sinLat, 2.0) + Math.cos(radianLat1) * Math.cos(radianLat2) * Math.pow(sinLng, 2.0);
    var distance = earth_radius * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
    return distance.toFixed(3);
  };
});

