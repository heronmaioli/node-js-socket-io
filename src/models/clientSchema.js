const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  boards: Array,
  nickName: String,
  email: String,
  password: String,
  createdAt: Date,
});

module.exports = mongoose.model("clientsSchema", clientSchema);
