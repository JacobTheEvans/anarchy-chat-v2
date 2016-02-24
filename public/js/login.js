var app = angular.module("login",["angularSlideables","ngCookies"]);

app.service("requests", ["$http", function($http) {
  this.reqLogin = function(username,isSuc,isFail) {
    var data = {
      "username": username
    };
    $http.post("http://localhost:8080/login",data).then(isSuc,isFail);
  };
}]);

app.controller("loginController", ["requests", "$scope", "$cookies", function(requests,$scope,$cookies) {
  var cookie_user_token = $cookies.get("user_token");
  if(cookie_user_token != undefined) {
    window.location.replace("/chat");
  }
  $scope.buttonVis = true;
  $scope.username = "";
  $scope.toggleLogButtonShow = function() {
    $(".logo-box").slideUp();
    $scope.buttonVis = false;
  };
  $scope.login = function(username) {
    requests.reqLogin(username,$scope.setToken,$scope.logError);
  };
  $scope.setToken = function(response) {
    var date = new Date();
    var expiresDate = new Date(date.getTime() + 25 * 60000);
    $cookies.put("user_token", response.data.token, {"expires": expiresDate});
    window.location.replace("/chat");
  };
  $scope.logError = function(response) {
    if(response.status == 422) {
      alert("Username already in use in chat");
      $scope.username = "";
    } else {
      console.log("ERROR, Status code: " + response.status + ", Status text: " + response.statusText);
    }
  };
  $scope.updateMDL = function() {
    componentHandler.upgradeAllRegistered();
  };
  setTimeout(function() {
    $scope.updateMDL();
  }, 2000);
}]);
