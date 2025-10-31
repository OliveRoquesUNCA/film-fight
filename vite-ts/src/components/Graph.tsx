/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useReducer } from "react";
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
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getConnectedActors, shortestPath } from "../server-requests";
import { ensureConnected } from "../socketHelpers";
import { useSocket } from "./SocketContext";
import PathDisplay from "./PathDisplay";

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const initialHints: String[] = [];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

export default function Graph({
  roomId,
  players,
  difficulty,
  records,
  onReturnToLobby,
}: {
  roomId: string;
  players: any[];
  difficulty: string;
  records: any;
  onReturnToLobby: () => void;
}) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [currentNodeName, setCurrentNodeName] = useState<string>();
  const [startingNodeName, setStartingNodeName] = useState<string>();
  const [currentNodeId, setCurrentNodeId] = useState<string>();
  const [destinationNodeId, setDestinationNodeId] = useState<string>();
  const [destinationNodeName, setDestinationNodeName] = useState<string>();
  const [hintActors, setHintActors] = useState<string[] | any[]>(initialHints);
  const [pathNodes, setPathNodes] = useState<any>();
  const [status, setStatus] = useState("waiting");
  const [result, setResult] = useState<any>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [currentPlayers, setCurrentPlayers] = useState(players);

  const socket = useSocket();

  const difficultyMessage =
    difficulty === "hard"
      ? "No restrictions on starting actors, no matter how obscure!"
      : "Only the most popular actors are chosen for the starting two!";

  const difficultyColor = difficulty === "hard" ? "red" : "green";

  useEffect(() => {
    socket.on("playerStarted", (data) => {
      console.log(`setting status: ${data.name} has started!`);
      setStatus(`${data.name} has started!`);
    });

    socket.on("gameOver", (data) => {
      setStatus(
        `Game Over! Winner: ${data.winner} with time ${data.finalTime}`
      );
      console.log(`game over! data: ${data}`);
      setResult(data);
      if (data.players) setCurrentPlayers(data.players);
      forceUpdate;
    });

    socket.on("playerLeft", (name) => {
      console.log(`${name} has left the game`);
      setStatus(`${name} left the game`);
    });

    return () => {
      socket.off("playerStarted");
      socket.off("gameOver");
      socket.off("playerLeft");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

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
    console.log("start button pressed");
    //reset nodes
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentNodeName("");
    setDestinationNodeName("");
    setCurrentNodeId("");
    await resetNodes();
    console.log("nodes reset");
    //get random actors from component parameters
    console.log(records);
    let firstActor = records.actor1;
    let lastActor = records.actor2;

    const startingActorNode: Node = {
      id: `${firstActor.id}`,
      data: { label: `${firstActor.name}` },
      position: { x: 0, y: 0 },
      style: {
        backgroundColor: "#fff", // Node background
        color: "#333", // Node text color
        border: "2px solid #63b3ed",
        padding: 10,
        fontWeight: "bold",
      },
    };

    const lastActorNode: Node = {
      id: `${lastActor.id}`,
      data: { label: `${lastActor.name}` },
      position: { x: 200, y: 200 },
      style: {
        backgroundColor: "#77f1bcff",
        color: "#333", // Node text color
        border: "2px solid #63b3ed",
        padding: 10,
        fontWeight: "bold",
      },
    };
    const newNodes: Node[] = nodes.concat(startingActorNode, lastActorNode);
    setNodes(newNodes);
    setCurrentNodeName(firstActor.name);
    setStartingNodeName(firstActor.name);
    setCurrentNodeId(firstActor.id);
    setDestinationNodeName(lastActor.name);
    setDestinationNodeId(lastActor.id);
    socket.emit("startGame");
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
          data: {
            label: `${personRecord["data"].name}`,
            movie: `${personRecord["data"].movie}`,
          },
          position: { x: position[0], y: position[1] },
          style: {
            backgroundColor: "#fff", // Node background
            color: "#333", // Node text color
            border: "2px solid #63b3ed",
            padding: 10,
            fontWeight: "bold",
          },
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
    console.log(`current node name: ${currentNodeName}`);
    console.log(`destination node name: ${destinationNodeName}`);
    const query = formData.get("query");
    if (currentNodeName !== undefined) {
      const connectedNodes = await getConnectedNodes(currentNodeName);
      if (connectedNodes !== undefined) {
        const connectedActorNodes: Node[] = connectedNodes[0];
        for (let i = 0; i < connectedActorNodes.length; i++) {
          const newNode: Node = connectedActorNodes[i];
          if (query === newNode.data.label) {
            setCurrentNodeName(String(newNode.data.label));
            setCurrentNodeId(newNode.id);
            let newEdges: Edge[] = [];
            let edge: Edge[] = [];
            //win condition
            if (String(newNode.data.label) === destinationNodeName) {
              edge = [
                {
                  id: `e${currentNodeId}-${destinationNodeId}`,
                  source: `${currentNodeId}`,
                  target: `${destinationNodeId}`,
                  label: `${newNode.data.movie}`,
                },
              ];
              console.log(
                `current node name ${String(
                  newNode.data.label
                )} matches destination node name ${destinationNodeName}`
              );
              setHintActors(initialHints);
              newEdges = edges.concat(edge);
              setEdges(newEdges);
              console.log(`last edge: ${JSON.stringify(newEdges)}`);
              forceUpdate;
              winRound();
              break;
            }
            edge = [
              {
                id: `e${currentNodeId}-${newNode["id"]}`,
                source: `${currentNodeId}`,
                target: `${newNode["id"]}`,
                label: `${newNode.data.movie}`,
              },
            ];
            console.log(`setting new edge ${JSON.stringify(newEdges)}`);
            newEdges = edges.concat(edge);
            setEdges(newEdges);
            forceUpdate;
            const newNodes: Node[] = nodes.concat(newNode);
            setNodes(newNodes);

            break;
          }
        }
        return;
      }
    }
  }

  async function winRound() {
    await ensureConnected();
    console.log(
      `emitting winGame for room ${roomId} with socket id ${socket.id}`
    );
    socket.emit("winGame");
    console.log(players);
  }

  async function resetNodes() {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHintActors(initialHints);
  }

  async function checkHint() {
    if (currentNodeName !== undefined) {
      setHintActors([""]);
      const connectedNodes = await getConnectedNodes(currentNodeName);
      if (connectedNodes !== undefined) {
        const connectedActorNodes: Node[] = connectedNodes[0];
        let hints: string[] | any = [];
        for (let i = 0; i < connectedActorNodes.length; i++) {
          const newNode: Node = connectedActorNodes[i];
          hints.push(newNode.data.label);
          if (i < connectedActorNodes.length - 1) {
            hints.push(", ");
          } else {
            hints.push(" ");
          }
        }
        setHintActors(hints);
      }
    }
  }

  function returnToLobby() {
    socket.emit("returnToLobby");
    onReturnToLobby();
  }

  async function handlePathDisplay() {
    if (currentNodeName && destinationNodeName) {
      console.log(
        `finding shortest path between ${currentNodeName} and ${destinationNodeName}`
      );
      const pathObj = await shortestPath(currentNodeName, destinationNodeName);
      if (pathObj) {
        console.log(`segments: ${pathObj.segments}`);
        setPathNodes(pathObj.segments);
      }
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100vh", // full viewport
        width: "100vw", // full width
        backgroundColor: "#0b0b0d",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
        overflowY: "auto", // scrolls if needed
        overflowX: "hidden",
        padding: "0",
        margin: "0",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          backgroundColor: "#1c1c21",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          boxSizing: "border-box",
          flex: "1 0 auto",
        }}
      >
        {/* Header */}
        <h2 style={{ color: "#fff", margin: 0 }}>
          Game Room: <span style={{ color: "#63b3ed" }}>{roomId}</span>
        </h2>

        {/* Player List */}
        <div style={{ textAlign: "center" }}>
          <h3 style={{ color: "#63b3ed", marginBottom: "8px" }}>Players</h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "flex",
              gap: "24px",
              justifyContent: "center",
              flexWrap: "wrap",
              margin: 0,
            }}
          >
            {currentPlayers.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong>
              </li>
            ))}
          </ul>
        </div>

        {/* Difficulty */}
        <div style={{ textAlign: "center" }}>
          <h3>
            Difficulty:{" "}
            <span
              style={{
                color: difficultyColor,
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {difficulty}
            </span>
          </h3>
          <p style={{ color: "#aaa", margin: "4px 0" }}>{difficultyMessage}</p>
          <p style={{ color: "#888" }}>Status: {status}</p>
        </div>

        {/* Controls */}
        {!result ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginTop: "10px",
            }}
          >
            <button className="game-btn" onClick={startGame}>
              Start Race
            </button>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button className="game-btn" onClick={checkHint}>
                Hint: Show connected actors to current actor
              </button>
              <button className="game-btn" onClick={handlePathDisplay}>
                Hint: Show shortest path to destination
              </button>
              <button
                className="game-btn debug-btn"
                onClick={winRound}
                style={{ opacity: 0.7 }}
              >
                (debug) Win Round
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h3 style={{ color: "#90ee90" }}>Winner: {result.winner}</h3>
            <pre
              style={{
                background: "#2b2b33",
                padding: "10px",
                borderRadius: "8px",
                textAlign: "left",
                width: "80%",
                margin: "0 auto",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(result.times, null, 2)}
            </pre>
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "center" }}
            >
              <button className="game-btn" onClick={returnToLobby}>
                Return to Lobby
              </button>
            </div>
          </div>
        )}
        {startingNodeName ? (
          <p style={{ color: "#63b3ed" }}>
            Find a path from {startingNodeName} to {destinationNodeName}
          </p>
        ) : (
          <p style={{ color: "#63b3ed" }}>Waiting to start game</p>
        )}
        <p style={{ color: "#63b3ed" }}>
          Actors connected to {currentNodeName}:{" "}
          {hintActors ||
            "click the 'show connected actors' button to show possible next guesses"}
        </p>
        {currentNodeName ? (
          <p>
            Shortest path between {currentNodeName} and {destinationNodeName}:
          </p>
        ) : (
          <p></p>
        )}
        {pathNodes ? <PathDisplay nodes={pathNodes}></PathDisplay> : <p></p>}
        <form
          action={search}
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <label>Guess the next actor:</label>
          <input
            name="query"
            style={{
              backgroundColor: "#2c2c34",
              border: "1px solid #444",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: "6px",
            }}
          />
          <button className="game-btn" type="submit">
            Submit
          </button>
        </form>
        {/* ReactFlow */}
        <div
          style={{
            flexGrow: 1,
            width: "100%",
            height: "70vh", // take majority of screen height
            backgroundColor: "#141418",
            borderRadius: "12px",
            border: "1px solid #333",
            boxShadow: "inset 0 0 15px rgba(255,255,255,0.05)",
            overflow: "hidden",
            marginTop: "20px",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={fitViewOptions}
            defaultEdgeOptions={defaultEdgeOptions}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
