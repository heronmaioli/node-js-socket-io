require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const boardSchema = require("./models/boardSchema");
const clientSchema = require("./models/clientSchema");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { ServerResponse } = require("http");
const { resourceUsage } = require("process");
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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const PORT = process.env.PORT || 80;

app.put("/registerUser", async (req, res) => {
  const data = req.body;
  try {
    const nickname = await clientSchema.findOne({ nickName: data.nickName });
    const email = await clientSchema.findOne({ email: data.email });
    if (nickname != undefined) {
      return res.status(401).send("User already exists!");
    } else if (email != undefined) {
      return res.status(401).send("Email already used!");
    } else {
      const create = await clientSchema.create(data);
      console.log(create._id);
      return res.status(200).send(create._id);
    }
  } catch (err) {
    console.log(err);
    return res.status(400).send("User create failed!");
  }
});

app.post("/login", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    const response = await clientSchema.findOne({ nickName: data.nickName });
    console.log(response);
    if (!response) {
      res.status(401).send("Invalid user or password");
    } else if (response.password != data.password) {
      res.status(401).send("Invalid password");
    } else {
      res.send(response);
    }
  } catch (err) {
    res.status(401).send("deu erro");
  }
});

app.get("/getStatus", async (req, res) => {
  const status = await boardSchema.findOne({ boardMacId: req.query.boardId });
  res.send(status?.stats);
});

app.get("/verify", async (req, res) => {
  try {
    const status = await clientSchema.findOne({ _id: req.query.user });
    if (!status) throw "User not founded";
    return res.send(status);
  } catch (err) {
    res.status(404).send(err);
  }
});

app.put("/registerBoard", async (req, res) => {
  const { userId, ...boardInfo } = req.body;
  console.log(req.body);
  try {
    const checkBoard = await boardSchema.findOne({
      boardMacId: boardInfo.boardId,
    });
    if (!checkBoard) throw "Board not registred!";

    const client = await clientSchema.findOne({ _id: userId });
    const verify = client.boards.find((board) => {
      return board.boardId === boardInfo.boardId;
    });
    console.log(verify);
    if (verify) throw "Board already registred!";

    const teste = await clientSchema.updateOne(
      { _id: userId },
      {
        $push: {
          boards: [boardInfo],
        },
      }
    );
    console.log(teste);
    res.send(boardInfo);
  } catch (err) {
    console.log(err);
    return res.status(400).send(err);
  }
});

io.use(async (socket, next) => {
  if (socket.handshake.query.boardId != undefined) {
    const boardId = socket.handshake.query.boardId;
    const board = await boardSchema.findOne({ boardMacId: boardId });
    if (board === null) {
      await boardSchema.create({
        boardMacId: boardId,
        stats: {
          highHour: "05:00:00",
          lowHour: "23:00:00",
          lightState: "AUTO",
          ventState: false,
          inExaust: false,
          outExaust: false,
          humidity: 0,
          maxHumidity: 0,
          temperature: 0,
          maxTemperature: 0,
        },
        sensors: {},
        createdAt: new Date(),
      });
      console.log("New board registred!");
    } else {
      console.log("Board alreary registred!");
    }
  }
  next();
});

io.engine.generateId = (req) => {
  if (req._query.boardId != undefined) {
    return req._query.boardId;
  } else {
    return 1;
  }
};

io.on("connection", async (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  if (socket.handshake.query.boardId !== undefined) {
    const board = await boardSchema.findOne({
      boardMacId: socket.handshake.query.boardId,
    });
    socket.emit("bootcheck", board.stats);
    console.log("Bootcheck done");
  }

  socket.on("sensorsUpdate", async (message) => {
    const { boardId, ...doc } = message;
    io.to(boardId).emit("sensorReads", doc);
    await boardSchema.updateOne(
      { boardMacId: boardId },
      {
        $set: {
          "stats.temperature": doc.temperature,
          "stats.humidity": doc.humidity,
        },
      }
    );

    console.log(message);
  });

  socket.on("newTimingSetup", async (message, boardID) => {
    socket.to(boardID).emit("newTimingSetup", message);

    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.highHour": message.highHour,
          "stats.lowHour": message.lowHour,
        },
      }
    );
    console.log(message);
  });

  socket.on("joinRoom", (roomID) => {
    console.log("joinado");
    socket.join(roomID);
  });

  socket.on("leaveRoom", (roomID) => {
    socket.leave(roomID);
  });

  socket.on("disconnect", (reason) => {
    socket.leave(socket.rooms[1]);
    console.log(`Desconectado:  ${socket.id}/${reason}`);
  });

  socket.on("lightOn", async (boardID) => {
    console.log(socket.rooms);
    socket.to(boardID).emit("setLightOn");

    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.lightState": "ON",
        },
      }
    );
  });

  socket.on("lightOff", async (boardID) => {
    socket.to(boardID).emit("setLightOff");
    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.lightState": "OFF",
        },
      }
    );
  });

  socket.on("lightAuto", async (boardID) => {
    socket.to(boardID).emit("setLightAuto");
    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.lightState": "AUTO",
        },
      }
    );
  });

  socket.on("changeVentState", async (boardID, status) => {
    socket.to(boardID).emit("changeVentState", status);
    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.ventState": status,
        },
      }
    );
  });

  socket.on("changeInState", async (boardID, status) => {
    socket.to(boardID).emit("changeInState", status);

    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.inExaust": status,
        },
      }
    );
  });

  socket.on("changeOutState", async (boardID, status) => {
    socket.to(boardID).emit("changeOutState", status);
    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.outExaust": status,
        },
      }
    );
  });

  socket.on("teste", () => {
    console.log(socket.id);
    console.log(io.sockets.adapter.rooms);
  });
});

io.httpServer.listen(PORT);
