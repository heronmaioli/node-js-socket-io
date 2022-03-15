const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  boards: Array,
  nickName: String,
  email: String,
  password: { type: String, select: false },
  createdAt: Date,
});
module.exports = mongoose.model("clientsSchema", clientSchema);
