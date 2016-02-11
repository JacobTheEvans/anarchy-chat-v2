var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var path = require("path");

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
app.get("/", function(req,res) {
  res.render("index.html");
});

app.post("/login", function(req,res) {
  //See if username is taken if not add with expiration
  //Then issue a JWT Token
});

app.use(function(req,res,next) {
  var token = req.body.token;
  //Check if user JWT Token is Valid
});

//Socket.io chat section
//Allow votes to kick user
//Echo when users enters
//Echo when user leaves or is kicked then remvoe them from server
//Echo chat request to all users

app.listen(8080, function() {
  console.log("[+] Anarchy Server Started At Port 8080");
})
