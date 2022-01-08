const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema({
  boardMacId: String,
  clientId: String,
  stats: {
    highHour: String,
    lowHour: String,
    lightState: String,
    ventState: Boolean,
    inExaust: Boolean,
    outExaust: Boolean,
  },
  sensors: {
    humidity: String,
    temperature: String,
  },
  createdAt: Date,
});
module.exports = mongoose.model("boardsSchema", boardSchema);
