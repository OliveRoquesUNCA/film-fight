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
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  getConnectedActors,
  getRandomActors,
  shortestPath,
} from "../server-requests";
import { socket } from "../socket";
import { Player } from "../server";
import PathDisplayWrapper from "./PathDisplayWrapper";

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const initialHints: String[] = [""];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

export default function Graph() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [currentNodeName, setCurrentNodeName] = useState<string>();
  const [currentNodeId, setCurrentNodeId] = useState<string>();
  const [destinationNodeName, setDestinationNodeName] = useState<string>();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hintActors, setHintActors] = useState<string[] | any[]>(initialHints);
  const [pathNodes, setPathNodes] = useState<any[]>([]);
  const [scoreUpdate, setScoreUpdate] = useState<any>(null);

  useEffect(() => {
    //connect once when component mounts
    socket.connect();
    socket.on("playerInfo", (data: Player) => {
      setCurrentPlayer(data);
    });

    socket.on("playersUpdated", (playerList: Player[]) => {
      setPlayers(playerList);
    });

    return () => {
      socket.off("playerInfo");
      socket.off("playersUpdated");
      socket.disconnect();
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
    console.log("button pressed");
    //reset nodes
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentNodeName("");
    setDestinationNodeName("");
    setCurrentNodeId("");
    await resetNodes();
    console.log("nodes reset");
    //get random actors
    let records: any = await getRandomActors();
    console.log(records);
    let firstActor = records.actor1;
    let lastActor = records.actor2;

    const startingActorNode: Node = {
      id: `${firstActor.id}`,
      data: { label: `${firstActor.name}` },
      position: { x: 0, y: 0 },
    };

    const lastActorNode: Node = {
      id: `${lastActor.id}`,
      data: { label: `${lastActor.name}` },
      position: { x: 200, y: 200 },
    };
    //   startingActorArray.push(startingActor);
    const newNodes: Node[] = nodes.concat(startingActorNode, lastActorNode);
    setNodes(newNodes);
    setCurrentNodeName(firstActor.name);

    setCurrentNodeId(firstActor.id);
    setDestinationNodeName(lastActor.name);
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
            const edge: Edge[] = [
              {
                id: `e${currentNodeId}-${newNode["id"]}`,
                source: `${currentNodeId}`,
                target: `${newNode["id"]}`,
                label: `${newNode.data.movie}`,
              },
            ];
            setCurrentNodeName(String(newNode.data.label));
            setCurrentNodeId(newNode.id);

            //win condition
            if (String(newNode.data.label) === destinationNodeName) {
              console.log(
                `current node name ${String(
                  newNode.data.label
                )} matches destination node name ${destinationNodeName}`
              );
              setHintActors(initialHints);
              //socket.emit("time-update", { playerId, time });
              socket.emit("winRound");
              winRound();
              break;
            }
            const newNodes: Node[] = nodes.concat(newNode);
            setNodes(newNodes);
            const newEdges: Edge[] = edges.concat(edge);
            setEdges(newEdges);

            break;
          }
        }
        return;
      }
    }
  }

  // async function checkTimes() {
  //   if (Object.keys(sharedTimes).length == 2) {
  //     let bestTime = sharedTimes[playerId].valueOf;
  //     for (let player in sharedTimes) {
  //       if (sharedTimes[player].valueOf > bestTime) {
  //         bestTime = sharedTimes[player].valueOf;
  //       }
  //     }
  //     if (bestTime === sharedTimes[playerId].valueOf) {
  //       winRound();
  //     }
  //   }
  // }
  function winRound() {
    socket.emit("incrementScore");
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

  function PlayerComponent({ player }: any) {
    if (!player) {
      return (
        <h2 style={{ color: "white" }}>Connecting to websocket interface...</h2>
      );
    } else {
      return <h2 style={{ color: "white" }}>Welcome {player.name}</h2>;
    }
  }

  function ScoreboardComponent({ players }: any) {
    if (currentPlayer === null) {
      return <h3 style={{ color: "cornsilk" }}>Loading scoreboard...</h3>;
    } else {
      return (
        <ul style={{ color: "cornsilk" }}>
          {players.map((p: any) => (
            <li style={{ color: "cornsilk" }} key={p.id}>
              {p.name} — {p.score}
              {p.id === currentPlayer.id ? " (You)" : ""}
            </li>
          ))}
        </ul>
      );
    }
  }

  async function handlePathDisplay() {
    if (currentNodeName && destinationNodeName) {
      const pathObj = await shortestPath(currentNodeName, destinationNodeName);
      if (pathObj) {
        console.log(`segments: ${pathObj.segments}`);
        setPathNodes(pathObj.segments);
      }
    }
  }

  return (
    <div style={{ height: 700, width: 1000 }}>
      <h3 style={{ color: "blue" }}>All players</h3>
      <PlayerComponent player={currentPlayer}></PlayerComponent>
      <ScoreboardComponent players={players}></ScoreboardComponent>
      {scoreUpdate && (
        <p>
          🎉 {players[scoreUpdate.playerId]?.name} got a point with time{" "}
          {scoreUpdate.duration}ms
        </p>
      )}
      <button id="gamebutton" onClick={() => startGame()}>
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
      <button onClick={checkHint}>Hint: Display connected actors</button>
      <button onClick={handlePathDisplay}>Hint: Update shortest path</button>
      <PathDisplayWrapper nodes={pathNodes}></PathDisplayWrapper>
      <p style={{ color: "blue" }}>Connected actors: {hintActors}</p>
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
  );
}
