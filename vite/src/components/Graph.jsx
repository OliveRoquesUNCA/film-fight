import { BasicNvlWrapper } from "@neo4j-nvl/react";
import { NVL } from "@neo4j-nvl/base";
import React, { useState, useEffect } from "react";
import { queryServer } from "../server-requests";
import neo4j from "neo4j-driver";

export default function Graph() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  async function getNodes() {
    const records = await queryServer(
      "MATCH (n:Person)-[a:ACTED_IN]-(m:Movie) RETURN ID(n) AS person_id,n.name,ID(a) AS edge_id,a.roles,ID(m) AS movie_id, m.title LIMIT 15"
    );
    console.log(records);
    setNodes(records[0]);
    setEdges(records[1]);
    console.log(nodes);
    console.log(edges);
  }

  return (
    <div style={{ width: "100%", height: 500 }}>
      <BasicNvlWrapper
        nodes={nodes}
        rels={edges}
        nvlOptions={{ initialZoom: 1.2 }}
        nvlCallbacks={{ onLayoutDone: () => console.log("layout done") }}
      />
      <button onClick={getNodes}>Get 15 nodes</button>
    </div>
  );
}
