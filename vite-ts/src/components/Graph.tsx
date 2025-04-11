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
    const minCeiledX: number = Math.ceil(minX);
    const maxFlooredX: number = Math.floor(maxX);
    const minCeiledY: number = Math.ceil(minY);
    const maxFlooredY: number = Math.floor(maxY);
    const x: number = Math.floor(
      Math.random() * (maxFlooredX - minCeiledX + 1) + minCeiledX
    );
    const y: number = Math.floor(
      Math.random() * (maxFlooredY - minCeiledY + 1) + minCeiledY
    );
    return [x, y];
  }

  function trimDuplicateNodes(nodes: any[]) {
    let result = nodes.reduce((accumulator, current) => {
      let exists = accumulator.find((item: any) => {
        return item.id === current.id;
      });
      if (!exists) {
        accumulator = accumulator.concat(current);
      }
      return accumulator;
    }, []);
    return result;
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
      let startingXPosition: number = 5;
      let startingYPosition: number = 5;

      //get person nodes
      for (let i = 0; i < personRecords.length; i++) {
        startingXPosition += 30;
        startingYPosition += 30;
        let position: number[] = [startingXPosition, startingYPosition];
        //parse json
        console.log(personRecords[i]);
        let personRecord = JSON.parse(JSON.stringify(personRecords[i]));

        //console.log(personRecord);
        //console.log(personRecord["id"].low);
        const person: Node = {
          id: `${personRecord["id"].low}`,
          type: "personNode",
          data: { label: `${personRecord["data"].name}` },
          position: { x: position[0], y: position[1] },
        };
        console.log(person);
        personNodes.push(person);
      }

      //get movie nodes
      for (let i = 0; i < movieRecords.length; i++) {
        startingXPosition += 30;
        startingYPosition += 30;
        let position: number[] = [startingXPosition, startingYPosition];

        //parse json
        const movieRecord = JSON.parse(JSON.stringify(movieRecords[i]));
        console.log("movie record");
        console.log(movieRecord);
        //check if movie has already been added; if so, skip to next record

        const movie: Node = {
          id: `${movieRecord["id"]}`,
          type: "movieNode",
          data: {
            label: `${movieRecord["data"].title}, ${movieRecord["data"].released.low}`,
          },
          position: { x: position[0], y: position[1] },
        };
        movieNodes.push(movie);
      }

      //get edges
      for (let i = 0; i < edgeRecords.length; i++) {
        const edgeRecord = JSON.parse(JSON.stringify(edgeRecords[i]));
        console.log("edge record");
        console.log(edgeRecord);
        const edge: Edge = {
          id: `e${edgeRecord["data"].from.low}-${edgeRecord["data"].to}`,
          type: "actedInEdge",
          source: `${edgeRecord["data"].from.low}`,
          target: `${edgeRecord["data"].to}`,
        };
        edges.push(edge);
      }
      console.log("personNodes:");
      console.log(trimDuplicateNodes(personNodes));
      console.log("movieNodes:");
      console.log(trimDuplicateNodes(movieNodes));
      console.log("edges:");
      console.log(edges);

      //trim duplicate objects
      setNodes(
        trimDuplicateNodes(personNodes).concat(trimDuplicateNodes(movieNodes))
      );
      setEdges(edges);
    }
  }
  return (
    <div style={{ height: 700, width: 1000 }}>
      <button onClick={getTestNodes}>Click to get Test Graph</button>
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
    </div>
  );
}
