const express = require("express");
const morgan = require("morgan");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
const PORT = process.env.PORT || 80;

app.get("/", (req, res) => {
  res.send("recebido");
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
