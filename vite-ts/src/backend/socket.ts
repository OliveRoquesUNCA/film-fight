import { Socket } from "socket.io-client";
import { io } from "socket.io-client";
const URL = "http://152.18.69.204:3000";
export const socket: Socket = io(URL, {
  transports: ["websocket"],
  autoConnect: true,
});

// Optionally reconnect if dropped
socket.on("disconnect", (reason) => {
  console.warn("Socket disconnected:", reason);
});
socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});
