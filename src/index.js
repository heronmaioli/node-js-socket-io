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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const PORT = process.env.PORT || 80;

app.put("/registerUser", async (req, res) => {
  const { boardId, ...data } = req.body;

  const board = await clientSchema.findOneAndUpdate(
    { boardMacId: boardId },
    data
  );
  board ? res.send(true) : res.send(false);
});

app.post("/getStatus", async (req, res) => {
  const status = await boardSchema.findOne({ boardMacId: req.body.boardId });
  res.send(status?.stats);
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

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on("bootcheck", async (boardID) => {
    const { boardId } = boardID;
    const board = await boardSchema.findOne({ boardMacId: boardId });
    socket.emit("bootcheck", board.stats);
    console.log("Bootcheck done");
  });

  socket.on("sensorsUpdate", async (message) => {
    const { boardId, ...doc } = message;
    socket.broadcast.emit("sensorReads", doc);

    await boardSchema.updateOne(
      { boardMacId: boardId },
      {
        $set: {
          "stats.temperature": doc.temperature,
          "stats.humidity": doc.humidity,
        },
      }
    );

    console.log(doc);
  });

  socket.on("newTimingSetup", async (message, boardID) => {
    socket.broadcast.emit("newTimingSetup", message);

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
    socket.join(roomID);
  });

  socket.on("leaveRoom", (roomID) => {
    socket.leave(roomID);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Desconectado:  ${socket.id}/${reason}`);
  });

  socket.on("lightOn", async (boardID) => {
    console.log(socket.rooms);
    socket.broadcast.emit("setLightOn");
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
    socket.broadcast.emit("setLightOff");
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
    socket.broadcast.emit("setLightAuto");
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
    socket.to(boardID).emit("changeVentState");
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
    socket.to(boardID).emit("changeInState");

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
    socket.to(boardID).emit("changeOutState");
    await boardSchema.updateOne(
      { boardMacId: boardID },
      {
        $set: {
          "stats.outExaust": status,
        },
      }
    );
  });
});

io.httpServer.listen(PORT);
