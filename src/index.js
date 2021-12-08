const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 80;

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}.`);
});

const io = require("socket.io")(server); //Bind socket.io to our express server.

app.get("/", (req, res) => {
  res.send("<h1>Welcome to NodeMCU Socket API</h1>");
});

io.on("connection", (socket) => {
  console.log("Someone has connected.");

  socket.on("message", (message) => {
    console.log(message);
  });
});
