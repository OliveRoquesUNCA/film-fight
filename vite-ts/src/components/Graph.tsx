import { useState, useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import MovieNode from "./MovieNode";
import ActedInEdge from "./ActedInEdge";
import { getTestGraph } from "../server-requests";

const initialNodes: Node[] = [
  { id: "1", data: { label: "Node 1" }, position: { x: 5, y: 5 } },
  { id: "2", data: { label: "Node 2" }, position: { x: 5, y: 100 } },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

const nodeTypes = {
  personNode: PersonNode,
  movieNode: MovieNode,
};

const edgeTypes = {
  actedInEdge: ActedInEdge,
};

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

const onNodeDrag: OnNodeDrag = (_, node) => {
  console.log("drag event", node.data);
};

export default function Graph() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );
  function randomCoordinates(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    const x: number = Math.random() * (maxX - minX) + minX;
    const y: number = Math.random() * (maxY - minY) + minY;
    return [x, y];
  }
  async function getTestNodes() {
    let records = await getTestGraph();
    console.log(records);
    if (records !== undefined) {
      //console.log(records[0]);
      const personRecords: string[] = records[0];
      const movieRecords: string[] = records[1];
      const edgeRecords: string[] = records[2];
      let personNodes: Node[] = [];
      let movieNodes: Node[] = [];
      let edges: Edge[] = [];
      let usedXPositions: number[] = [];
      let usedYPositions: number[] = [];

      //get person nodes
      for (let i = 0; i < personRecords.length; i++) {
        let position: number[] = randomCoordinates(1, 1200, 1, 700);
        while (
          usedXPositions.includes(position[0]) ||
          usedYPositions.includes(position[1])
        ) {
          position = randomCoordinates(1, 1200, 1, 700);
        }
        usedXPositions.push(position[0]);
        usedYPositions.push(position[1]);

        //parse json
        const personRecord = JSON.parse(personRecords[i]);
        console.log(personRecord);
        const person: Node = {
          id: `${personRecord.id}`,
          type: "personNode",
          data: { label: `${personRecord.data.name}` },
          position: { x: position[0], y: position[1] },
        };
        console.log(person);
        personNodes.push(person);
      }
      console.log("personNodes:");
      console.log(personNodes);

      //get movie nodes
      for (let i = 0; i < movieRecords.length; i++) {
        let position: number[] = randomCoordinates(1, 1200, 1, 700);
        while (
          usedXPositions.includes(position[0]) ||
          usedYPositions.includes(position[1])
        ) {
          position = randomCoordinates(1, 1200, 1, 700);
        }
        usedXPositions.push(position[0]);
        usedYPositions.push(position[1]);

        //parse json
        const movieRecord = JSON.parse(movieRecords[i]);

        //check if movie has already been added; if so, skip to next record
        let unique = true;
        movieNodes.forEach((element) => {
          if (element.id === movieRecord.id) {
            unique = false;
          }
        });
        if (unique !== true) {
          continue;
        }
        const movie: Node = {
          id: `${movieRecord.id}`,
          type: "movieNode",
          data: {
            label: `${movieRecord.data.title} /n released in ${movieRecord.data.released}`,
          },
          position: { x: position[0], y: position[1] },
        };
        movieNodes.push(movie);
      }

      //get edges
      for (let i = 0; i < edgeRecords.length; i++) {
        const edgeRecord = JSON.parse(edgeRecords[i]);

        const edge: Edge = {
          id: `e${edgeRecord.from}-${edgeRecord.to}`,
          type: "actedInEdge",
          source: `${edgeRecord.from}`,
          target: `${edgeRecord.to}`,
        };
      }
    }
  }
  return (
    <div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <button onClick={getTestNodes}>Click to get Test Graph</button>
    </div>
  );
}
