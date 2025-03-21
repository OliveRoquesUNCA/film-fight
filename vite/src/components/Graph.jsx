import { BasicNvlWrapper } from "@neo4j-nvl/react";
import { NVL } from "@neo4j-nvl/base";
import React, { useState, useEffect } from "react";
import { queryServer } from "../server-requests";
import neo4j from "neo4j-driver";

export default function Graph() {
  const [nodes, setNodes] = useState([{ id: "0" }, { id: "1" }]);
  const [edges, setEdges] = useState([]);
  async function getNodes() {
    const records = await queryServer(
      "MATCH (n:Person)-[a:ACTED_IN]-(m:Movie) RETURN n.name,a.roles,m.title"
    );
    console.log(records);
    setNodes(records[0]);
    setEdges(records[1]);
    console.log(nodes);
    console.log(edges);
  }

  return (
    <div>
      <BasicNvlWrapper
        nodes={nodes}
        rels={edges}
        nvlOptions={{ initialZoom: 2 }}
        nvlCallbacks={{ onLayoutDone: () => console.log("layout done") }}
      />
      <button onClick={getNodes}>Add Graph Elements</button>
    </div>
  );
}
