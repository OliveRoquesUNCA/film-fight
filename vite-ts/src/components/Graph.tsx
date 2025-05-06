/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { getConnectedActors, getRandomActor } from "../server-requests";
/*@typescript-eslint  no-explicit-any: "off"*/
const initialNodes: Node[] = [
  { id: "1", data: { label: "Node 1" }, position: { x: 5, y: 5 } },
  { id: "2", data: { label: "Node 2" }, position: { x: 5, y: 100 } },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

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
  const [currentNodeName, setCurrentNodeName] = useState<string>();
  const [currentNodeId, setCurrentNodeId] = useState<string>();

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

  function trimDuplicateNodes(nodes: any[]) {
    const result = nodes.reduce((accumulator, current) => {
      const exists = accumulator.find((item: any) => {
        return item.id === current.id;
      });
      if (!exists) {
        accumulator = accumulator.concat(current);
      }
      return accumulator;
    }, []);
    return result;
  }

  async function startGame() {
    resetNodes();
    let records = await getRandomActor(undefined);
    const startingActorArray: Node[] = [];
    let name: string = "";
    console.log(records);
    if (records !== undefined) {
      const startingRecord = JSON.parse(JSON.stringify(records[0]));

      const startingActor: Node = {
        id: `${startingRecord["id"].low}`,
        type: "personNode",
        data: { label: `${startingRecord["data"].name}` },
        position: { x: 0, y: 0 },
      };
      startingActorArray.push(startingActor);
      setNodes(startingActorArray);
      name = startingRecord["data"].name;
      setCurrentNodeName(name);
      setCurrentNodeId(startingActor["id"]);
    } else {
      return;
    }
    records = await getRandomActor(currentNodeName);
  }

  async function getConnectedNodes(name: string) {
    const records = await getConnectedActors(name);
    if (records !== undefined) {
      const personRecords: string[] = records[0];
      const personNodes: Node[] = [];
      let startingXPosition: number = nodes[0].position.x;
      const startingYPosition: number = nodes[0].position.y;

      //get person nodes
      for (let i = 0; i < personRecords.length; i++) {
        startingXPosition = 70;
        const position: number[] = [startingXPosition, startingYPosition];
        //parse json
        //console.log(personRecords[i]);
        const personRecord = JSON.parse(JSON.stringify(personRecords[i]));

        //console.log(personRecord);
        //console.log(personRecord["id"].low);
        const person: Node = {
          id: `${personRecord["id"].low}`,
          type: "personNode",
          data: {
            label: `${personRecord["data"].name}`,
            movie: `${personRecord["data"].movie}`,
          },
          position: { x: position[0], y: position[1] },
        };
        //console.log(person);
        personNodes.push(person);
      }

      // console.log("personNodes:");
      // console.log(trimDuplicateNodes(personNodes));
      // console.log("movieNodes:");
      // console.log(trimDuplicateNodes(movieNodes));
      // console.log("edges:");
      // console.log(edges);

      //trim duplicate objects
      const uniquePersonNodes = trimDuplicateNodes(personNodes);
      return [uniquePersonNodes];
    }
  }

  async function search(formData: any) {
    const query = formData.get("query");
    if (currentNodeName !== undefined) {
      const connectedNodes = await getConnectedNodes(currentNodeName);
      if (connectedNodes !== undefined) {
        const connectedActorNodes: Node[] = connectedNodes[0];
        for (let i = 0; i < connectedActorNodes.length; i++) {
          const newNode: Node = connectedActorNodes[i];
          if (query === newNode.data.label) {
            const edge: Edge[] = [
              {
                id: `e${currentNodeId}-${newNode["id"]}`,
                type: "actedInEdge",
                source: `${currentNodeId}`,
                target: `${newNode["id"]}`,
                label: `${newNode.data.movie}`,
              },
            ];
            const newNodes: Node[] = nodes.concat(newNode);
            setNodes(newNodes);
            const newEdges: Edge[] = edges.concat(edge);
            setEdges(newEdges);
            setCurrentNodeName(String(newNode.data.label));
            setCurrentNodeId(newNode.id);
            break;
          }
        }
        return;
      }
    }
  }
  function resetNodes() {
    setNodes([]);
    setEdges([]);
  }
  return (
    <div style={{ height: 700, width: 1000 }}>
      <button id="gamebutton" onClick={startGame}>
        Click to start game
      </button>
      <button id="reset board" onClick={resetNodes}>
        Click to reset board
      </button>
      <form action={search}>
        Guess the next actor:
        <input name="query"></input>
        <button type="submit">Submit</button>
      </form>

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
