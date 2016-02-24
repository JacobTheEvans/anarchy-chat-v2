var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: { type: Date, expires: "25m", default: Date.now }
});

module.exports = {
  User: mongoose.model("user", userSchema)
};
