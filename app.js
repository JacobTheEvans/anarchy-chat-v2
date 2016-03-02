var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var path = require("path");
var ipfilter = require("express-ipfilter")

//server setup
var app = express();
var server = app.listen(8080);
var io = require("socket.io")(server);

//data schemas
var User = require("./model.js").User;
var Ip = require("./model.js").Ip;

//secret for JWT encryption
var secret = require("./config.js").secret;

//connect to mongoDB
mongoose.connect("mongodb://localhost/anarchy");

//setup JSON requests
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

//setup public facing files
app.use(express.static(path.join(__dirname + "/public")));
app.set("views", __dirname + "/public/views");

//setup view engine
app.engine("html", require("ejs").renderFile);
app.set("view engine", "ejs");

//filter blocked ips
app.use(ipfilter(
  Ip.find({}, function(err, ips) {
    result = [];
    for(var i = 0; i < ips.length; i++) {
      result.push(ips.ip);
    }
    return result;
  })
));

//server endpoints
app.get("/", function(req, res) {
  res.render("index.html");
});

app.post("/login", function(req,res) {
  if(!req.body.username) {
    res.status(400).send({pass: false, message: "Username not provided in JSON request"});
  } else {
    if(req.body.username.indexOf(" ") != -1) {
      res.status(422).send({pass: false, message: "Username contains spaces"});
    }
    User.findOne({username: req.body.username}, function(err, user) {
      if(err) {
        res.status(500).send(err);
      } else {
        if(!user) {
          var userObject = {username: req.body.username};
          var token = jwt.sign(userObject, secret, {
             expiresIn: "25m"
          });
          var userData = {
            username: req.body.username,
            token: token,
            users_kick: ["Server"]
          };
          var newUser = new User(userData);
          newUser.save(function(err, data) {
            if(err) {
              res.status(500).send(err);
            } else {
              res.status(200).send({pass: true, token: token});
            }
          });
        } else {
          res.status(422).send({pass: false, message: "Username was provided but was already in use"});
        }
      }
    });
  }
});

app.post("/logout", function(req, res) {
  if(!req.body.token) {
    res.status(400).send({pass: false, message: "User token was not provided in JSON request"});
  } else {
    jwt.verify(req.body.token, secret, function(err, decoded) {
      if(err) {
        res.status(400).send({pass: false, message: "User token is invalid"});
      } else {
        User.findOne({token: req.body.token}, function(err, user) {
          if(err) {
            res.status(500).send(err);
          } else {
            if(user) {
              user.remove();
              user.save();
              res.send({pass: true, message: "User was removed"});
            } else {
              res.send({pass: false, message: "User was not found"});
            }
          }
        });
      }
    });
  }
});

app.post("/users", function(req, res) {
  if(!req.body.token) {
    res.status(400).send({pass: false, message: "User token was not provided in JSON request"});
  } else {
    jwt.verify(req.body.token, secret, function(err, decoded) {
      if(err) {
        res.status(400).send({pass: false, message: "User token is invalid"});
      } else {
        User.findOne({token: req.body.token}, function(err, user) {
          if(err) {
            res.status(500).send(err);
          } else {
            if(user) {
              User.find({}, function(err, users) {
                data = [];
                for(var i = 0; i < users.length; i++) {
                  data.push(users[i].username);
                }
                res.send({pass: true, users: data});
              });
            } else {
              res.send({pass: false, message: "User was not found"});
            }
          }
        });
      }
    });
  }
});

app.get("/chat", function(req, res) {
  res.render("chat.html");
});

//Socket.io chat section
io.use(function(socket, next) {
  var handshakeData = socket.request;
  if(!handshakeData.headers.cookie) {
    console.log("[-] Error handshakeData not set do not procces");
  } else {
    index = handshakeData.headers.cookie.indexOf("user_token=");
    length = handshakeData.headers.cookie.length
    token = handshakeData.headers.cookie.slice(index + 11,length);
    verify = true;
    jwt.verify(token, secret, function(err, decoded) {
      if(err) {
        verify = false;
      } else {
        if(verify) {
          next();
        }
      }
    });
  }
});

io.on("connection", function(socket) {
  io.emit("message", {"user": "server", "message": "update", "update": true});
  socket.on("message", function(data) {
    var date = new Date();
    today = date.getTime();
    if(!data.token) {
      io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Must be logged to use service", "update": false, "time": today});
    } else {
      jwt.verify(token, secret, function(err, decoded) {
        if(err) {
          io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Invalid token. Please revalidated token", "update": false, "time": today});
        } else {
          User.findOne({token: token}, function(err, user) {
            if(err) {
              console.log(err);
            } else {
              if(user) {
                if(data.message != "") {
                  io.emit("message", {"user": user.username, "message": data.message, "update": false, "time": today});
                } else {
                  io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Your message must contain text", "update": false, "time": today});
                }
              } else {
                io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Invalid token. Please revalidated token", "update": false, "time": today});
              }
            }
          });
        }
      });
    }
  });
  socket.on("kick", function(data) {
    var date = new Date();
    today = date.getTime();
    if(!data.token) {
      io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Must be logged to use service", "update": false, "time": today});
    } else if(!data.selected_user) {
      io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Must supply a username to vote to kick", "update": false, "time": today});
    } else {
      jwt.verify(token, secret, function(err, decoded) {
        if(err) {
          io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Invalid token. Please revalidated token", "update": false, "time": today});
        } else {
          User.findOne({token: token}, function(err, user) {
            if(err) {
              console.log(err);
            } else {
              if(user) {
                User.findOne({username: data.selected_user}, function(err, selectedUser) {
                  if(selectedUser) {
                    var selected_userName = selectedUser.username;
                    if(selectedUser.users_kick.indexOf(user.username) == -1) {
                      selectedUser.users_kick.push(user.username);
                      selectedUser.save();
                      io.emit("message", {"user": "Server", "message": user.username + " has voted to kick " + selected_userName, "update": false, "time": today});
                      User.find({}, function(err, users) {
                        var online = users.length;
                        var amount = -1;
                        if (online <= 3) {
                          amount = -1;
                        } else if(online <= 10) {
                          amount = Math.round(online * .75);
                        } else if(online <= 20) {
                          amount = Math.round(online * .50);
                        } else if(online <= 50) {
                          amount = Math.round(online * .30);
                        } else if(online <= 100) {
                          amount = Math.round(online * .10);
                        } else {
                          amount = Math.round(online  * .07);
                        }
                        if(selectedUser.users_kick.length >= amount && amount != -1) {
                          username = selectedUser.username;
                          selectedUser.remove();
                          selectedUser.save();
                          var client_ip_address = socket.request.connection.remoteAddress;
                          io.emit("message", {"user": "Server", "message": "User " + username +" has been kicked and blocked. IP: " + client_ip_address.toString(), "update": false, "time": today});
                          var data = {
                            ip: client_ip_address
                          };
                          var newIp = new Ip(data);
                          newIp.save();
                        } else {
                          if(amount == -1) {
                            io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Not enough users online to start kick", "update": false, "time": today});
                          }
                        }
                      });
                    } else {
                      io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "You have already voted to kick that user", "update": false, "time": today});
                    }
                  } else {
                    io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "That user does not exist", "update": false, "time": today});
                  }
                });
              } else {
                io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Invalid token. Please revalidated token", "update": false, "time": today});
              }
            }
          });
        }
      });
    }
  });
});
