var app = angular.module("chat",["angularSlideables","ngCookies","chat.io"]);

app.service("requests", ["$http", function($http) {
  this.reqLogout = function(token,isSuc,isFail) {
    var data = {
      "token": token
    };
    $http.post("http://localhost:8080/logout",data).then(isSuc,isFail);
  };
  this.getUsers = function(token,isSuc,isFail) {
    var data = {
      "token": token
    }
    $http.post("http://localhost:8080/users",data).then(isSuc,isFail);
  };
}]);

app.controller("chatController", ["requests", "$scope", "$cookies", "io", function(requests,$scope,$cookies,io) {
  var cookie_user_token = $cookies.get("user_token");
  var socket = {};
  $scope.users = [];
  $scope.userMessage = "";
  $scope.numOfUsers = 0;
  $scope.chats = [];
  if(cookie_user_token == undefined) {
    window.location.replace("/");
  }
  $scope.updateMDL = function() {
    componentHandler.upgradeAllRegistered();
  };
  $scope.scrollDown = function() {
    var objDiv = document.getElementById("chat-box");
    objDiv.scrollTop = objDiv.scrollHeight;
  };
  $scope.logout = function() {
    requests.reqLogout(cookie_user_token,$scope.removeCookie,$scope.logError);
  };
  $scope.removeCookie = function(response) {
    $cookies.remove("user_token");
    window.location.replace("/");
  };
  $scope.logError = function(response) {
    console.log("ERROR, Status code: " + response.status + ", Status text: " + response.statusText);
  };
  $scope.startIo = function() {
    socket = io.connect(cookie_user_token);
    io.getChat(socket,$scope.update);
  };
  $scope.postChat = function() {
    io.emitChat(socket,$scope.userMessage,cookie_user_token);
    $scope.userMessage = "";
  };
  $scope.setUsers = function(response) {
    $scope.users = response.data.users;
    $scope.numOfUsers = $scope.users.length;
  };
  $scope.formatDate = function(date) {
    if(typeof(date) != "object") {
      date = new Date(date);
    }
    hour = 0;
    minutes = 0;
    timeFrame = "";

    if(date.getHours > 12) {
      hours = date.getHours % 12;
      timeFrame = "P.M";
    } else {
      hours = date.getHours();
      timeFrame = "A.M";
    }

    if (date.getMinutes().toString.length <= 1) {
      minutes = "0" + date.getMinutes();
    } else {
      minutes = date.getMinutes();
    }

    return hours.toString() + ":" + minutes.toString() + " " + timeFrame;
  }
  $scope.update = function(data) {
    if(data.update == false) {
      var newChat = {
        user: data.user,
        message: data.message,
        created_at: new Date(data.time)
      };
      $scope.chats.push(newChat);
      $scope.$apply();
      $scope.scrollDown();
    } else {
      requests.getUsers(cookie_user_token,$scope.setUsers,$scope.logError);
    }
  };
  setTimeout(function() {
    $scope.updateMDL();
  }, 2000);
}]);
