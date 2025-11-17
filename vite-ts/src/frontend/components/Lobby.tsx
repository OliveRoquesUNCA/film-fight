"use client";

import { useEffect, useState } from "react";
import Graph from "./Graph";
import { useSocket } from "./SocketContext";

/**
 * Lobby that all players enter on connection. Websockets handle connections and disconnections, as well as
 * starting and ending the game.
 */
export default function Lobby() {
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [lobby, setLobby] = useState<any[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [inGame, setInGame] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Record<string, string>
  >({});
  const socket = useSocket();
  useEffect(() => {
    socket.on("lobbyUpdate", (data) => {
      console.log("Received lobbyUpdate:", data);
      setLobby(data);
    });
    socket.on("challengeRequest", setChallenge);
    socket.on("gameStart", (data) => {
      setInGame(true);
      setGameData(data);
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("challengeRequest");
      socket.off("gameStart");
    };
  }, []);

  const register = () => {
    console.log("Emitting registerPlayer with name:", name);
    socket.emit("registerPlayer", name || "Player");
    setRegistered(true);
  };

  const sendChallenge = (targetId: string, targetName: string) => {
    const difficulty = selectedDifficulty[targetId] || "easy";
    if (targetName != name) {
      socket.emit("challenge", { targetId, difficulty });
      alert("Challenge sent!");
    } else {
      alert("Error: cannot challenge yourself");
    }
  };

  const acceptChallenge = async () => {
    socket.emit("acceptChallenge", challenge.fromId);
    setChallenge(null);
  };

  if (inGame && gameData) {
    return (
      <Graph
        {...gameData}
        onReturnToLobby={() => {
          setInGame(false);
          setGameData(null);
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#0b0b0d",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
        padding: "0",
        margin: "0",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ color: "#fff", margin: 0, textAlign: "center" }}>
        Welcome to Film Fight!
      </h2>
      {!registered ? (
        // Registration screen
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#1c1c21",
              borderRadius: "16px",
              padding: "32px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <h2 style={{ color: "#63b3ed", textAlign: "center" }}>
              Enter Your Name
            </h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #444",
                backgroundColor: "#2c2c34",
                color: "#fff",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#63b3ed")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#444")}
            />
            <button
              onClick={register}
              className="game-btn"
              style={{ width: "100%" }}
            >
              Join Lobby
            </button>
          </div>
        </div>
      ) : (
        // Main Lobby
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            alignItems: "center",
            padding: "20px",
            gap: "20px",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <h2 style={{ color: "#63b3ed", textAlign: "center", margin: 0 }}>
            Lobby
          </h2>
          <h3 style={{ color: "#aeedacff", textAlign: "center", margin: 0 }}>
            Welcome, {name} {"!"}
          </h3>

          {/* Challenge Notification */}
          {challenge && (
            <div
              style={{
                backgroundColor: "#27272c",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #444",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                maxWidth: "600px",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>{challenge.fromName}</strong> challenged you!
                Difficulty:{" "}
                <span style={{ color: "#fbbf24" }}>{challenge.difficulty}</span>
              </p>
              <button
                className="game-btn"
                onClick={acceptChallenge}
                style={{
                  transition: "background-color 0.2s, transform 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#3c8aff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2d72d9")
                }
              >
                Accept Challenge
              </button>
            </div>
          )}

          {/* Player List */}
          <div
            style={{
              flex: 1,
              width: "100%",
              maxWidth: "600px",
              overflowY: "auto",
            }}
          >
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {lobby.map((p) => (
                <li
                  key={p.id}
                  style={{
                    backgroundColor: "#27272c",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #444",
                    transition: "background-color 0.2s, transform 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#333";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#27272c";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span>{p.name || "(no name)"}</span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={selectedDifficulty[p.id] || "easy"}
                      onChange={(e) =>
                        setSelectedDifficulty({
                          ...selectedDifficulty,
                          [p.id]: e.target.value,
                        })
                      }
                      style={{
                        backgroundColor: "#2c2c34",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "4px 8px",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "#63b3ed")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "#444")
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="hard">Hard</option>
                    </select>
                    <button
                      className="game-btn"
                      onClick={() => sendChallenge(p.id, p.name)}
                      style={{
                        transition: "background-color 0.2s, transform 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#3c8aff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#2d72d9")
                      }
                    >
                      Challenge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
