angular.module('busmobile.controllers').controller('HomeController', function($scope, socket) {
  socket.on('data', function(data) {
    $scope.data = data;
    console.log("data updated");
    console.log(data);
  });
});
