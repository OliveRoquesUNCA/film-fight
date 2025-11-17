// server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  getConnectedActors,
  getRandomActors,
  shortestPath,
} from "./server-requests";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

export interface Player {
  id: string;
  name: string;
  score: number;

  room?: string;

  startTime?: number;

  finishTime?: number;
}

interface GameRoom {
  roomId: string;
  players: Record<string, Player>;

  winner?: string;

  difficulty: string;
}

const players = new Map<string, Player>();
const waitingRoom = new Set<string>();
const gameRooms: Record<string, GameRoom> = {};
const pendingChallenges: Record<
  string,
  { from: string; to: string; difficulty: string }
> = {};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);
  });

  // Register player
  socket.on("registerPlayer", (name: string) => {
    players.set(socket.id, { id: socket.id, name, score: 0 });
    waitingRoom.add(socket.id);
    console.log(`registered player ${name}`);
    io.emit("lobbyUpdate", getLobbyPlayers());
  });

  // Challenge someone
  socket.on(
    "challenge",
    ({ targetId, difficulty }: { targetId: string; difficulty: string }) => {
      pendingChallenges[targetId] = {
        from: socket.id,
        to: targetId,
        difficulty,
      };
      const challenger = players.get(socket.id);
      const target = players.get(targetId);
      if (!challenger || !target) return;
      io.to(targetId).emit("challengeRequest", {
        fromId: challenger.id,
        fromName: challenger.name,
        difficulty,
      });
    }
  );

  // Accept challenge
  socket.on("acceptChallenge", async (challengerId) => {
    let records = await getRandomActors();
    console.log("records from socket call");
    console.log(records);
    const pending = Object.values(pendingChallenges).find(
      (c) => c.from === challengerId && c.to === socket.id
    );
    const difficulty = pending?.difficulty || "easy";
    const challenger = players.get(challengerId);
    const accepter = players.get(socket.id);
    if (!challenger || !accepter) return;

    const roomId = `game-${challenger.id}-${accepter.id}`;
    const room: GameRoom = {
      roomId,
      players: {
        [challenger.id]: { ...challenger },
        [accepter.id]: { ...accepter },
      },
      difficulty,
    };

    gameRooms[roomId] = room;
    challenger.room = roomId;
    accepter.room = roomId;

    waitingRoom.delete(challenger.id);
    waitingRoom.delete(accepter.id);

    socket.join(roomId);
    io.to(challenger.id).socketsJoin(roomId);

    io.to(roomId).emit("gameStart", {
      roomId,
      difficulty,
      records,
      players: [challenger, accepter],
    });

    io.emit("lobbyUpdate", getLobbyPlayers());
  });

  // Player starts race
  socket.on("startGame", () => {
    const player = players.get(socket.id);
    if (!player?.room) return;
    const room = gameRooms[player.room];
    if (!room) return;

    player.startTime = Date.now();
    room.players[socket.id].startTime = player.startTime;

    io.to(player.room).emit("playerStarted", {
      playerId: socket.id,
      name: player.name,
    });
  });

  // Player finishes race
  socket.on("winGame", () => {
    console.log(`win game socket call received from ${socket.id}`);
    const player = players.get(socket.id);
    console.log(`lookup result: ${JSON.stringify(player, null, 2)}`);
    if (!player?.room) {
      console.log("error: no room found for player");
      return;
    }
    const room = gameRooms[player.room];
    if (!room) {
      console.log("error: no game room associated with player room");
      return;
    }

    if (room.winner) {
      console.log(`Winner of room already declared: ${room.winner}`);
    }

    const now = Date.now();
    player.finishTime = now;
    room.players[socket.id].finishTime = now;

    const finalTime = player.finishTime - (player.startTime || 0);

    room.winner = player.name;
    player.score = (player.score || 0) + 1;

    const playerList = Object.values(room.players).map((p) => ({
      name: p.name,
      score: p.score || 0,
    }));

    console.log(`${player.name} wins room ${player.room}!`);

    io.to(room.roomId).emit("gameOver", {
      winner: player.name,
      finalTime: finalTime,
      players: playerList,
    });
  });

  //send queries to server-requests API
  io.on("getConnectedActors", async (name) => {
    console.log("sending getConnectedActors request to server-requests");
    let records = await getConnectedActors(name);
    if (records !== undefined) {
      socket.emit("getConnectedActorsResponse", records);
    }
  });

  io.on("getShortestPath", async (startNodeName, destNodeName) => {
    console.log(
      `sending shortest path request between ${startNodeName} and ${destNodeName}`
    );
    let records = await shortestPath(startNodeName, destNodeName);
    if (records !== undefined) {
      socket.emit("getShortestPathResponse", records);
    }
  });

  // Return players to lobby
  socket.on("returnToLobby", () => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomId = player.room;
    if (roomId && gameRooms[roomId]) {
      // Remove player from room
      socket.leave(roomId);
      delete gameRooms[roomId].players[socket.id];

      // Clean up empty rooms
      if (Object.keys(gameRooms[roomId].players).length === 0) {
        delete gameRooms[roomId];
      }
    }
    player.room = undefined;
    player.startTime = undefined;
    player.finishTime = undefined;
    waitingRoom.add(socket.id);

    io.emit("lobbyUpdate", getLobbyPlayers());
  });

  socket.on("disconnect", (reason) => {
    const player = players.get(socket.id);
    console.log(`Socket ${socket.id} disconnected (${reason})`);
    setTimeout(() => {
      if (!io.sockets.sockets.get(socket.id)) {
        players.delete(socket.id);
      }
    }, 3000);
    if (!player) return;

    waitingRoom.delete(socket.id);
    if (player.room && gameRooms[player.room]) {
      io.to(player.room).emit("playerLeft", player.name);
      delete gameRooms[player.room].players[socket.id];
      if (Object.keys(gameRooms[player.room].players).length === 0) {
        delete gameRooms[player.room];
      }
    }
    players.delete(socket.id);
    io.emit("lobbyUpdate", getLobbyPlayers());
  });
});

function getLobbyPlayers() {
  return Array.from(waitingRoom)
    .map((id) => players.get(id))
    .filter(Boolean);
}

server.listen(3000, () => console.log("Socket.IO server running on :3000"));
