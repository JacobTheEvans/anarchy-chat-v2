var app = angular.module("chat",["angularSlideables","ngCookies"]);

app.service("requests", ["$http", function($http) {
  this.reqLogout = function(token,isSuc,isFail) {
    var data = {
      "token": token
    };
    $http.post("http://localhost:8080/logout",data).then(isSuc,isFail);
  };
}]);

app.controller("chatController", ["requests", "$scope", "$cookies", function(requests,$scope,$cookies) {
  var cookie_user_token = $cookies.get("user_token");
  if(cookie_user_token == undefined) {
    window.location.replace("/");
  }
  $scope.updateMDL = function() {
    componentHandler.upgradeAllRegistered();
  };
  $scope.logout = function() {
    requests.reqLogout(cookie_user_token,$scope.removeCookie,$scope.logError);
  };
  $scope.removeCookie = function(response) {
    $cookies.remove("user_token");
    window.location.replace("/");
  };
  $scope.logError = function(response) {
    onsole.log("ERROR, Status code: " + response.status + ", Status text: " + response.statusText);
  };
  setTimeout(function() {
    $scope.updateMDL();
  }, 2000);
}]);
