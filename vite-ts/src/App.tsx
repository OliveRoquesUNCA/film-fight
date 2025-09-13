import "./App.css";
import Home from "./Home";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Admin from "./Admin";
import Game from "./Game";

function App() {
  return (
    <>
      <div>
        <div>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="admin" element={<Admin />} />
              <Route path="game" element={<Game />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </>
  );
}

export default App;
