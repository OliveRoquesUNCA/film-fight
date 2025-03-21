import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App.jsx";

async function main() {
  // this script kicks off the React App:
  const rootEl = document.getElementById("app");
  const root = createRoot(rootEl);
  root.render(<App />);
}

main();
