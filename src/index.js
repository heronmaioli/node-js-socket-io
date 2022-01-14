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

var sockets = [];

app.post("/checkboardId", async (req, res) => {
  const board = await boardSchema.findOne({ boardMacId: req.body.data });
  board ? res.send(true) : res.send(false);
});

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

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on("bootcheck", async (boardID) => {
    const { boardId } = boardID;
    const verify = sockets.find((item) => item.boardId === boardId);
    if (verify === undefined) {
      sockets.push({
        boardId: boardId,
        sessionId: socket.id,
      });
    } else {
      const findTarget = (valor) => {
        if (valor.boardId != boardId) return valor;
      };
      const filtered = sockets.filter(findTarget);
      sockets = filtered;
      sockets.push({
        boardId: boardId,
        sessionId: socket.id,
      });
      console.log("placa já existe");
    }
    const board = await boardSchema.findOne({ boardMacId: boardId });
    if (board === null) {
      const client = await clientSchema.create({
        boardMacId: boardId,
        password: "",
        nickName: "",
        email: "",
        profile: {
          fName: "",
          lName: "",
        },
        createdAt: new Date(),
      });
      await boardSchema.create({
        boardMacId: boardId,
        clientId: client._id,
        boardMacId: boardId,
        stats: {
          highHour: "05:00:00",
          lowHour: "23:00:00",
          lightState: "AUTO",
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
      console.log("New user created");
      return;
    }
    socket.emit("bootcheck", board.stats);
    console.log("Bootcheck done");
  });

  socket.on("sensorsUpdate", async (message) => {
    let { boardId, ...doc } = message;
    const board = await boardSchema.findOneAndUpdate(
      { boardMacId: boardId },
      { sensors: doc }
    );
    const findTarget = (client) => {
      if (client.clientId === boardId) {
        return client;
      }
    };
    const clientTarget = sockets.filter(findTarget);
    socket.to(clientTarget[0]?.sessionId).emit("sensorReads", doc);
    console.log(message);
  });

  socket.on("newTimingSetup", async (message, boardID) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    console.log(message);
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("newTimingSetup", message);

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: {
        ...response.stats,
        highHour: message.highHour,
        lowHour: message.lowHour,
      },
    });
  });

  socket.on("selfRegister", async (clientId) => {
    const filtered = sockets.filter((valor) => {
      return valor.clientId != clientId;
    });
    let fil = filtered;

    fil.push({
      clientId: clientId,
      sessionId: socket.id,
    });
    console.log("Client já existe: " + clientId);
    console.log(fil);
    console.log(sockets);
    console.log(
      "_______________________________________________________________"
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(`Desconectado: ${reason}`);
  });

  socket.on("lightOn", async (boardID) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("setLightOn");

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, lightState: "ON" },
    });
  });

  socket.on("lightOff", async (boardID) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };

    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("setLightOff");
    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, lightState: "OFF" },
    });
  });

  socket.on("lightAuto", async (boardID) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("setLightAuto");

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, lightState: "AUTO" },
    });
  });

  socket.on("changeVentState", async (boardID, status) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    console.log(status);
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("changeVentState");

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, ventState: status },
    });
  });

  socket.on("changeInState", async (boardID, status) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    console.log(status);
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("changeInState");

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, inExaust: status },
    });
  });

  socket.on("changeOutState", async (boardID, status) => {
    const findTarget = (board) => {
      if (board.boardId === boardID) {
        return board;
      }
    };
    console.log(status);
    const boardTarget = sockets.filter(findTarget);
    socket.to(boardTarget[0]?.sessionId).emit("changeOutState");

    const response = await boardSchema.findOne({ boardMacId: boardID });
    const update = await boardSchema.updateOne(response, {
      stats: { ...response.stats, outExaust: status },
    });
  });

  socket.on("teste", async (clientId) => {
    const filtered = sockets.filter((valor) => {
      return valor.clientId != clientId;
    });
    let fil = filtered;

    fil.push({
      clientId: clientId,
      sessionId: socket.id,
    });
    console.log("Client já existe: " + clientId);
    console.log(fil);
    console.log(sockets);
    console.log(
      "_______________________________________________________________"
    );
  });
});

io.httpServer.listen(PORT);
