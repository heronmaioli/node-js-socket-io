const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  boardMacId: String,
  password: String,
  profile: {
    fName: String,
    lName: String,
  },
  createdAt: Date,
});
module.exports = mongoose.model("clientsSchema", clientSchema);
