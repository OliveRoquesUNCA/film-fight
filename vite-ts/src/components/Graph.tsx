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
import { SocketAddress } from "net";

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
  const [destinationNodeId, setDestinationNodeId] = useState<string>();
  const [destinationReached, setDestinationReached] = useState<
    boolean | undefined
  >();
  const [playerId, setPlayerId] = useState<string>("");
  const [sharedScores, setSharedScores] = useState<Record<string, number>>({});

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
    setDestinationReached(false);
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
      setDestinationNodeId(destinationActor["id"]);
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
            if (newNode.data.label === destinationNodeName) {
              setDestinationReached(true);
              winRound();
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
  function winRound() {
    socket.emit("score-update", { playerId });
    console.log(sharedScores);
  }

  async function resetNodes() {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setDestinationReached(false);
  }

  return (
    <div style={{ height: 700, width: 1000 }}>
      <h1>Welcome player {playerId}</h1>
      <pre>{JSON.stringify(sharedScores)}</pre>
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
