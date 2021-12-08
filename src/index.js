const express = require("express");
const morgan = require("morgan");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer);
app.use(morgan("dev"));

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  io.on("message", (message) => {
    socket.emit(message);
  });
  socket.on("disconnect", () => console.log("Client disconnected"));
});

httpServer.listen(PORT);
