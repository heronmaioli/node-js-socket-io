const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  boardMacId: String,
  nickName: String,
  email: String,
  password: String,
  profile: {
    fName: String,
    lName: String,
  },
  createdAt: Date,
});
module.exports = mongoose.model("clientsSchema", clientSchema);
