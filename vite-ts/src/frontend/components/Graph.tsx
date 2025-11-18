/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useReducer } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnNodesChange,
  type OnEdgesChange,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSocket } from "./SocketContext";
import HintDisplay from "./HintDisplay";

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const initialHints: String[] = [];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

/**
 * This component renders the game for all players. the acceptChallenge websocket passes in the room Id, players,
 * difficulty, the records of the starting actors, and a function to return to the lobby.
 * @param param0 object containing the room Id, players, difficulty, records of starting actors, and onReturnToLobby function
 * @returns
 */
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

  /**
   * Handles socket calls for setting status
   */
  useEffect(() => {
    socket.on("playerStarted", (data) => {
      console.log(`setting status: ${data.name} has started!`);
      setStatus(`${data.name} has started!`);
    });

    socket.on("gameOver", (data) => {
      setStatus(`Game Over! Winner: ${data.winner}`);
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

  /**
   * Handles decreasing hints over time
   */
  useEffect(() => {
    if (!hintActors || !pathNodes) return;

    const interval = setInterval(() => {
      setHintActors((prev) => {
        console.log("path nodes");
        console.log(pathNodes);
        //remove a hint not on the shortest path
        const removable = prev.find((n) => !pathNodes.includes(n));

        if (!removable) {
          clearInterval(interval);
          return prev;
        }

        return prev.filter((n) => n !== removable);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [hintActors, pathNodes]);

  /**
   * react flow needs these to update graph state
   */
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  /**
   * Safety function in case db call returns duplicate nodes
   * @param nodes nodes to check for duplicates
   * @returns nodes trimmed of duplicates
   */
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

  /**
   * Handles starting the game; resets state of nodes/edges and replaces with component params
   */
  async function startGame() {
    //console.log("start button pressed");
    //reset nodes
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentNodeName("");
    setDestinationNodeName("");
    setCurrentNodeId("");
    await resetNodes();
    //console.log("nodes reset");

    //get random actors from component parameters
    //console.log("getting records from params");
    //console.log(records);
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
        border: "2px solid #87f366ff",
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
    //forceUpdate;
    //await handleHintNodes();
    forceUpdate;
    socket.emit("startGame");
    forceUpdate;
    await handlePathDisplay();
    await checkHintActors();
    forceUpdate;
  }

  /**
   * Helper function for many game functions; returns array of actor nodes connected to the given name via 1 movie
   * @param name name of actor to check connected actors of
   * @returns array of connected actor nodes
   */
  async function getConnectedActors(name: string) {
    let actorRecords = await getConnectedNodes(name);
    if (actorRecords !== undefined) {
      const personRecords: string[] = actorRecords[0];
      const personNodes: Node[] = [];
      let startingXPosition: number = nodes[0].position.x;
      const startingYPosition: number = nodes[0].position.y;
      let uniquePersonNodes: Node[] = [];
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
      console.log("unique person nodes from getconnectedactors:");
      uniquePersonNodes = trimDuplicateNodes(personNodes);
      console.log(uniquePersonNodes);
      return [uniquePersonNodes];
    }
  }

  /**
   * Search is called whenever the player guesses an actor. If they guess an actor that would win the game,
   * it makes an edge to the destination actor and then ends the game. If they guess a correct actor
   * that is not the destination actor, it creates a new node for that actor and an edge pointing to it.
   * @param formData data from text box input
   * @returns
   */
  async function search(formData: any) {
    console.log(`current node name: ${currentNodeName}`);
    console.log(`destination node name: ${destinationNodeName}`);
    const query = formData.get("query");
    if (currentNodeName !== undefined) {
      const connectedNodes = await getConnectedActors(currentNodeName);
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
            await handlePathDisplay();
            await checkHintActors();
            forceUpdate;
            break;
          }
        }
        return;
      }
    }
  }

  /**
   * called when the win round game state is reached. Calls web socket to handle that
   */
  async function winRound() {
    console.log(
      `emitting winGame for room ${roomId} with socket id ${socket.id}`
    );
    socket.emit("winGame");
    console.log(players);
  }

  /**
   * Helper function to reset game state
   */
  async function resetNodes() {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHintActors(initialHints);
  }

  /**
   * Checks and displays actors connected to the current actor when the button is pressed.
   */
  async function checkHintActors() {
    if (currentNodeName && destinationNodeName) {
      setHintActors([""]);
      console.log("getting hint connected actor nodes");
      const connectedNodes = await getConnectedActors(currentNodeName);
      if (connectedNodes !== undefined) {
        await handlePathDisplay();
        forceUpdate;
        const connectedActorNodes: Node[] = connectedNodes[0];
        console.log("connected actor nodes: ");
        console.log(connectedActorNodes);
        // Extract labels
        const allLabels = connectedActorNodes.map((n) => n.data.label);
        // Pick any nodes that are also on the path
        const pathLabels = new Set(pathNodes);
        const pathIntersections = allLabels.filter((lbl) =>
          pathLabels.has(lbl)
        );

        // Choose one guaranteed path node if available
        let guaranteedPick: string | unknown | null = null;
        if (pathIntersections.length > 0) {
          guaranteedPick =
            pathIntersections[
              Math.floor(Math.random() * pathIntersections.length)
            ];
        }

        // Shuffle helper
        const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);

        // Remove guaranteed pick so we don’t duplicate
        let remaining = guaranteedPick
          ? allLabels.filter((l) => l !== guaranteedPick)
          : allLabels.slice();

        // Shuffle and trim to fill remaining slots up to 8
        remaining = shuffle(remaining).slice(0, guaranteedPick ? 7 : 8);

        const finalHints = guaranteedPick
          ? shuffle([guaranteedPick, ...remaining])
          : remaining;
        setHintActors(finalHints);
      }
    }
  }

  /**
   * Helper function to return to the lobby when the game is done
   */
  function returnToLobby() {
    socket.emit("returnToLobby");
    onReturnToLobby();
  }

  /**
   * Function to handle getConnectedActors() call via websockets; websockets handle actual API call to database,
   * and this function awaits the result of that.
   * @param name name of actor to check connected actor nodes of
   * @returns Promise of the results of the database query
   */
  function getConnectedNodes(name: string): Promise<any> {
    return new Promise((resolve, _reject) => {
      // Listen for a single response
      const requestId = Date.now();
      socket.once(`getConnectedActorsResponse_${requestId}`, (data) => {
        console.log("client receiving getConnectedActorsResponse");
        resolve(data);
      });

      // Emit request
      socket.emit("getConnectedActors", name, requestId);
      console.log("client emitting getConnectedActors");
    });
  }

  /**
   * Function to handle handleShortestPath() via websockets. Websockets handle actual API call to database,
   * and this function awaits the result of that.
   * @param startNodeName node to start path from
   * @param destNodeName node to end path on
   * @returns Promise of database query result
   */
  function getShortestPath(
    startNodeName: string,
    destNodeName: string
  ): Promise<any> {
    return new Promise((resolve, _reject) => {
      // Listen for a single response
      const requestId = Date.now();
      socket.once(`getShortestPathResponse_${requestId}`, (data) => {
        console.log("client receiving getShortestPathResponse");
        resolve(data);
      });

      // Emit request
      socket.emit("getShortestPath", startNodeName, destNodeName, requestId);
      console.log("client emitting getShortestPath");
      setTimeout(() => _reject("timeout"), 8000);
    });
  }

  /**
   * Handles the display of the shortest path
   */
  async function handlePathDisplay() {
    if (currentNodeName && destinationNodeName) {
      console.log(
        `finding shortest path between ${currentNodeName} and ${destinationNodeName}`
      );
      const pathObj = await getShortestPath(
        currentNodeName,
        destinationNodeName
      );
      if (pathObj) {
        console.log(`segments: ${pathObj.segments}`);
        console.log(`${JSON.stringify(pathObj.segments)}`);
        let pathActors = [];
        let shortestPathActor = "";
        for (let i = 0; i < pathObj.segments.length; i++) {
          if (i % 2 == 0) {
            shortestPathActor = pathObj.segments[i].start.properties.name;
          } else {
            shortestPathActor = pathObj.segments[i].end.properties.name;
          }
          pathActors.push(shortestPathActor);
        }
        setPathNodes(pathActors);
      } else {
        console.log(`no path found`);
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
        height: "100vh",
        width: "100vw",
        backgroundColor: "#0b0b0d",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
        overflowY: "auto",
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
              <button className="game-btn" onClick={checkHintActors}>
                Hint: Update possible next choices from current actor
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
            onConnect={() => {}}
            connectOnClick={false}
            fitView
            fitViewOptions={fitViewOptions}
            defaultEdgeOptions={defaultEdgeOptions}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <p style={{ color: "#63b3ed" }}>
          Actors connected to {currentNodeName}:
          {"(Removes suboptimal hint every 5 seconds)"}
          {hintActors ? (
            <HintDisplay nodes={hintActors}></HintDisplay>
          ) : (
            "click the 'show connected actors' button to show possible next guesses"
          )}
        </p>
      </div>
    </div>
  );
}
