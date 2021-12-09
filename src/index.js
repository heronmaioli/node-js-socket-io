require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const boardSchema = require("./models/boardSchema");
const clientSchema = require("./models/clientSchema");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  allowEIO3: true,
  rememberUpgrade: true,
});

mongoose.connect(process.env.DB_CONECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
const PORT = process.env.PORT || 80;

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);
  socket.send(socket.id);
  socket._id = "1234";

  socket.on("bootcheck", (message) => {
    const asyncFunction = async () => {
      const board = await boardSchema.findOne({ boardMacId: message });
      console.log(board);

      if (board === null) {
        const clientId = await clientSchema.create({
          boardMacId: message,
          password: "",
          profile: {
            fName: "",
            lName: "",
          },
          createdAt: new Date(),
        });

        await boardSchema.create({
          boardMacId: message,
          clientId: clientId._id,
          boardMacId: message,
          stats: {
            highHour: "05:00:00",
            lowHour: "11:00:00",
            lightState: "OFF",
            ventState: false,
            inExaust: false,
            outExaust: false,
          },
          sensors: {
            humidity: 0,
            temperature: 0,
          },
          createdAt: new Date(),
        });
      }
    };
    asyncFunction();
    socket.send("checado");
    console.log(message);
  });

  socket.on("desligar", (message) => {
    console.log(socket._id);
  });

  io.on("message", (message) => {
    socket.emit(message);
    console.log(message);
  });
  socket.on("disconnect", () => console.log("Client disconnected"));
});

io.httpServer.listen(PORT);
