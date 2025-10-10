"use client";

import { useState } from "react";
import PathDisplay from "./PathDisplay";

export default function PathDisplayWrapper({ nodes }: { nodes: any[] }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow((prev) => !prev)}>
        {show ? "Hide Path" : "Show Path"}
      </button>
      <pre style={{ color: "lightblue" }}>Shortest path:</pre>
      {show && <PathDisplay nodes={nodes} />}
    </div>
  );
}
