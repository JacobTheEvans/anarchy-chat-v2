var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var path = require("path");

//server setup
var app = express();
var server = app.listen(8080);
var io = require("socket.io")(server);

//user schema
var User = require("./model.js").User;

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

//server endpoints
app.get("/", function(req, res) {
  res.render("index.html");
});

app.post("/login", function(req,res) {
  if(!req.body.username) {
    res.status(400).send({pass: false, message: "Username not provided in JSON request"});
  } else {
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
            token: token
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
//Allow votes to kick user
//Echo when users enters
//Echo when user leaves or is kicked then remove them from server
//DONE Echo chat request to all users

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
                io.emit("message", {"user": user.username, "message": data.message, "update": false, "time": today});
              } else {
                io.sockets.connected[socket.id].emit("message", {"user": "Server", "message": "Invalid token. Please revalidated token", "update": false, "time": today});
              }
            }
          });
        }
      });
    }
  });
  socket.on("disconnect", function() {
    console.log("User has disconnected");
  });
});
