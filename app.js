var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var path = require("path");

//user schema
var User = require("./model.js").User;

//secret for JWT encryption
var secret = require("./config.js").secret;

//socket.io setup
var server = require("http").createServer(app);
var io = require("socket.io")(server);

//connect to mongoDB
mongoose.connect("mongodb://localhost/anarchy");

var app = express();

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

app.get("/chat", function(req, res) {
  res.render("chat.html");
});

//verification middleware
app.use(function(req, res, next) {
  var token = req.body.token;
  if(token) {
    jwt.verify(token, secret, function(err, decoded) {
      if(err) {
        res.status(403).json({pass: false, message: "JWT token is not valid"});
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.status(403).json({pass: false, message: "No JWT token given"});
  }
});

//Socket.io chat section
//Allow votes to kick user
//Echo when users enters
//Echo when user leaves or is kicked then remove them from server
//Echo chat request to all users

app.listen(8080, function() {
  console.log("[+] Anarchy Server Started At Port 8080");
});
