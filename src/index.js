const express = require("express");
const morgan = require("morgan");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  allowEIO3: true,
  rememberUpgrade: true,
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
const PORT = process.env.PORT || 80;

app.get("/", (req, res) => {
  res.send("recebido");
});

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);
  socket.send(socket.id);

  io.on("bootcheck", (message) => {
    socket.send(message);
  });

  socket.on("desligar", (message) => {
    socket.send(message);
  });

  io.on("message", (message) => {
    socket.emit(message);
    console.log(message);
  });
  socket.on("disconnect", () => console.log("Client disconnected"));
});
io.httpServer.listen(PORT);
