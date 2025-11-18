import React from "react";

interface HintDisplayProps {
  nodes: String[];
}

const HintDisplay: React.FC<HintDisplayProps> = ({ nodes }) => {
  function nodesToString() {
    let stringedNodes = "";
    for (let i = 0; i < nodes.length; i++) {
      stringedNodes += nodes[i];
      if (i < nodes.length - 1) {
        stringedNodes += ", ";
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

export default HintDisplay;
