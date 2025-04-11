import { useState } from "react";
import Graph from "./components/Graph";
import "./App.css";

function App() {
  return (
    <>
      <div style={{ height: 1280, width: 720 }}>
        <Graph></Graph>
      </div>
    </>
  );
}

export default App;
