import Lobby from "./Lobby";
import { SocketProvider } from "./SocketContext";

function App() {
  return (
    <div>
      <SocketProvider>
        <Lobby></Lobby>
      </SocketProvider>
    </div>
  );
}

export default App;
