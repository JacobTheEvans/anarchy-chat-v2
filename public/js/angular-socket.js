var app = angular.module("chat.io",[]);

app.service("io", [function() {
  this.connect = function(token) {
    return io("/",{user_token: token});
  };
  this.emitChat = function(socket,message,token) {
    var data = {
      message: message,
      token: token
    };
    socket.emit("message", data);
  };
  this.getChat = function(socket,onSuc) {
    socket.on("message", function(data) {
      onSuc(data);
    });
  };
}]);
