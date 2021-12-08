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

app.get("/", (req, res) => {
  res.send("recebido");
  console.log("qualquer coisa");
});

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  io.on("message", (message) => {
    socket.emit(message);
    console.log(message);
  });
  socket.on("disconnect", () => console.log("Client disconnected"));
});

httpServer.listen(PORT);
