import React from "react";

type Node = {
  start: { labels: string[]; properties: any };
  end: { labels: string[]; properties: any };
};

interface PathDisplayProps {
  nodes: Node[];
}

const PathDisplay: React.FC<PathDisplayProps> = ({ nodes }) => {
  function nodesToString() {
    let stringedNodes = "";
    for (let i = 0; i < nodes.length; i++) {
      stringedNodes += nodes[i];
      if (i < nodes.length - 1) {
        stringedNodes += "=>";
      } else {
        stringedNodes += " ";
      }
    }
    return stringedNodes;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ color: "lightblue" }}>{nodesToString()}</div>
    </div>
  );
};

export default PathDisplay;
