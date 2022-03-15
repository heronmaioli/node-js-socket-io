const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema({
  boardMacId: String,
  stats: {
    highHour: String,
    lowHour: String,
    lightState: String,
    ventState: Boolean,
    inExaust: Boolean,
    outExaust: Boolean,
    humidity: Number,
    maxHumidity: Number,
    temperature: Number,
    maxTemperature: Number,
  },
  createdAt: Date,
});
module.exports = mongoose.model("boardsSchema", boardSchema);
