import { socket } from "./socket";

export const ensureConnected = async (): Promise<void> => {
  if (socket.connected) return;

  return new Promise((resolve) => {
    socket.once("connect", () => {
      console.log("Socket connected:", socket.id);
      resolve();
    });
    socket.connect();
  });
};
