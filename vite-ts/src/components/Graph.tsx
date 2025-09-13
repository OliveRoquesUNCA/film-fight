/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
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
import { socket } from "../socket";

interface GraphProps {
  playerId: string;
}

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

const onNodeDrag: OnNodeDrag = (_, node) => {
  console.log("drag event", node.data);
};

export default function Graph({ sessionId }: { sessionId: string }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [currentNodeName, setCurrentNodeName] = useState<string>();
  const [currentNodeId, setCurrentNodeId] = useState<string>();
  const [destinationNodeName, setDestinationNodeName] = useState<string>();
  const [time, setTime] = useState<number>();
  const [playerId, setPlayerId] = useState<string>("");
  const [sharedScores, setSharedScores] = useState<Record<string, number>>({});
  const [sharedTimes, setSharedTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    socket.connect();
    socket.on("connect", () => {
      console.log("connected with ID:", socket.id);
      socket.emit("join-session", sessionId);
    });

    socket.on("session-joined", ({ playerId }: GraphProps) => {
      console.log("session joined as:", playerId);
      setPlayerId(playerId);
    });

    socket.on("update-scores", (newScores: Record<string, number>) => {
      console.log("receiving updated score");
      setSharedScores(newScores);
    });

    socket.on("update-times", (newTimes: Record<string, number>) => {
      console.log("receiving updated time");
      setSharedTimes(newTimes);
      checkTimes();
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

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
    await resetNodes();
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
      const newNodes: Node[] = nodes.concat(startingActorArray);
      setNodes(newNodes);
      name = startingRecord["data"].name;
      setCurrentNodeName(name);
      setCurrentNodeId(startingActor["id"]);
      setTime(Date.now());
    } else {
      return;
    }
    records = await getRandomActor(currentNodeName);
    const destinationActorArray = [];
    console.log(records);
    if (records !== undefined) {
      const destinationRecord = JSON.parse(JSON.stringify(records[0]));

      const destinationActor: Node = {
        id: `${destinationRecord["id"].low}`,
        type: "personNode",
        data: { label: `${destinationRecord["data"].name}` },
        position: { x: 200, y: 200 },
        style: {
          color: `blue`,
        },
      };
      destinationActorArray.push(destinationActor);
      const newNodesDestination: Node[] = nodes.concat(destinationActorArray);
      setNodes((nodes) => nodes.concat(newNodesDestination));

      setDestinationNodeName(destinationRecord["data"].name);
    } else {
      return;
    }
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
        const personRecord = JSON.parse(JSON.stringify(personRecords[i]));
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
            if (newNode.data.label === destinationNodeName) {
              if (time !== undefined) {
                const timeElapsed = Date.now() - time;
                setTime(timeElapsed);
              }

              checkTimes();
              break;
            }
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

  async function checkTimes() {
    socket.emit("time-update", { playerId, time });
    if (Object.keys(sharedTimes).length == 2) {
    }
  }
  function winRound() {
    socket.emit("score-update", { playerId });
    console.log(sharedScores);
  }

  async function resetNodes() {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }

  return (
    <div style={{ height: 700, width: 1000 }}>
      <h1>Welcome player {playerId}</h1>
      <pre>{JSON.stringify(sharedScores)}</pre>
      <pre>{JSON.stringify(sharedTimes)}</pre>
      <button
        id="gamebutton"
        onClick={() => {
          resetNodes();
          startGame();
        }}
      >
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
      <button onClick={winRound}>win round</button>

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
