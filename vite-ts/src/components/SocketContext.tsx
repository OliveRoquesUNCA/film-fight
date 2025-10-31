import { createContext, useContext, useEffect } from "react";
import { socket } from "../socket";

const SocketContext = createContext(socket);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: any }) => {
  useEffect(() => {
    socket.on("connect", () => console.log("Connected:", socket.id));
    socket.on("disconnect", (r) => console.log("Disconnected:", r));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
