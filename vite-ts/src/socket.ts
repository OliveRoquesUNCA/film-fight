import { Socket } from "socket.io-client";
import { io } from "socket.io-client";
const URL = "http://localhost:3000";
export const socket: Socket = io(URL, {
  transports: ["websocket"],
  autoConnect: false,
});
