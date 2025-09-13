import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";

interface Session {
  players: string[];
  scores: Record<string, number>;
  times: Record<string, number>;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3001/game/", methods: ["GET", "POST"] },
});

const sessions: Record<string, Session> = {};

io.on("connection", (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join-session", (sessionId: string) => {
    const playerId = socket.id;
    if (!sessions[sessionId]) {
      sessions[sessionId] = { players: [], scores: {}, times: {} };
    }

    const session = sessions[sessionId];
    session.players.push(playerId);
    session.scores[playerId] = 0;
    socket.join(playerId);

    socket.emit("session-joined", { playerId });

    socket.on("score-update", ({ playerId }) => {
      if (session.scores[playerId] != null) {
        session.scores[playerId] += 1;
        console.log(
          "updating score for session" +
            playerId +
            " : " +
            session.scores[playerId]
        );
        io.emit("update-scores", session.scores);
      }
    });
    socket.on("time-update", ({ playerId, time }) => {
      if (session.times[playerId] != null) {
        session.times[playerId] = time;
        console.log(
          "updating time for session" +
            playerId +
            " : " +
            session.times[playerId]
        );
        io.emit("update-times", session.times);
      }
    });
  });

  socket.on("disconnect", () => {});
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
