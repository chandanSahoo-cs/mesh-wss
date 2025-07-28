import dotenv from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";

dotenv.config();

const API_ENDPOINT = "http://localhost:3000/api/mark-status";

const server = createServer();
const wss = new WebSocketServer({ server });

const concurrentConncetionsMap = new Map<string, number>();

wss.on("connection", async (ws, req) => {
  if (!req.url) {
    ws.close(1008, "Missing request query");
    return;
  }

  const { query } = parse(req.url, true);
  const userId = query?.userId as string;

  if (!userId) {
    ws.close(1008, "Missing userId or authToken");
  }

  console.log(`[WSS] ${userId} connected`);

  const concurrentConnections = concurrentConncetionsMap.get(userId) || 0;

  concurrentConncetionsMap.set(userId, concurrentConnections + 1);

  if (concurrentConnections === 0) {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, status: "online" }),
    }).catch((err) => console.error("[WSS] Error marking online: ", err));
  }

  ws.on("close", () => {
    const concurrentConnections = concurrentConncetionsMap.get(userId) || 1;

    const newCount = concurrentConnections - 1;

    if (newCount <= 0) {
      concurrentConncetionsMap.delete(userId);
      fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, status: "offline" }),
      }).catch((err) => console.error("WSS Error marking offline :", err));
    } else {
      concurrentConncetionsMap.set(userId, newCount);
    }
  });
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});
