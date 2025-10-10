// server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

export interface Player {
  id: string;
  name: string;
  score: number;

  startTime?: number;

  finishTime?: number;
}

const players = new Map<string, Player>();

function broadcastPlayerList() {
  io.emit("playersUpdated", Array.from(players.values()));
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create and store a player profile for this connection
  const player: Player = {
    id: socket.id,
    name: `Player_${Math.floor(Math.random() * 1000)}`,
    score: 0,
  };
  players.set(socket.id, player);

  // Send player info to the client
  socket.emit("playerInfo", player);

  // Send updated list to all players
  broadcastPlayerList();

  //client requests increment
  socket.on("incrementScore", () => {
    const player = players.get(socket.id);
    if (player) {
      player.score++;
      // Send updated list to all players
      broadcastPlayerList();
      console.log(`${player.name}'s score: ${player.score}`);
    }
  });

  // Allow the client to reset its score
  socket.on("resetScore", () => {
    const player = players.get(socket.id);
    if (player) {
      player.score = 0;
      // Send updated list to all players
      broadcastPlayerList();
    }
  });

  socket.on("startGame", () => {
    const player = players.get(socket.id);
    if (player) {
      player.startTime = Date.now();
      broadcastPlayerList();
      console.log(`${player.name} started at ${player.startTime}`);
    }
  });

  socket.on("winGame", () => {
    const player = players.get(socket.id);
    if (player && player.startTime) {
      player.finishTime = Date.now();
      broadcastPlayerList();
      const duration = player.finishTime - player.startTime;
      console.log(`${player.name} finished in ${duration} ms`);

      // Check if the player is the fastest so far
      const otherTimes = Object.values(players)
        .filter((p) => p.finishTime && p.id !== socket.id)
        .map((p) => p.finishTime! - p.startTime!);

      const isFastest =
        otherTimes.length === 0 || duration < Math.min(...otherTimes);

      if (isFastest) {
        socket.emit("incrementScore");
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`${player.name} disconnected`);
    players.delete(socket.id);
    // Send updated list to all players
    broadcastPlayerList();
  });
});

server.listen(3000, () => console.log("Socket.IO server running on :3000"));
