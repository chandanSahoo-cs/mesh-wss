import dotenv from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import WebSocket, { WebSocketServer } from "ws";

dotenv.config();

const API_ENDPOINT = process.env.API_ENDPOINT!;

const server = createServer();
const wss = new WebSocketServer({ server });

const concurrentConnectionsMap = new Map<string, number>();
const connections = new Map<
  WebSocket,
  { userId: string; missedPing: number }
>();

const MAX_MISSED_PINGS = 2;
const TIME_INTERVAL = 10000;

const markUserStatus = async (userId: string, status: "online" | "offline") => {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, status: status }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`WSS failed to mark ${status} :: ${res.status}`, body);
    }
  } catch (error) {
    console.error("WSS Error marking offline :", error);
  }
};

setInterval(() => {
  for (const [ws, { userId, missedPing }] of connections.entries()) {
    if (missedPing > MAX_MISSED_PINGS) {
      ws.terminate();
      connections.delete(ws);
      const count = concurrentConnectionsMap.get(userId) || 0;

      if (count - 1 <= 0) {
        concurrentConnectionsMap.delete(userId);
        markUserStatus(userId, "offline");
      } else {
        concurrentConnectionsMap.set(userId, count - 1);
      }
    } else {
      ws.ping();
      connections.set(ws, { userId, missedPing: missedPing + 1 });
    }
  }
}, TIME_INTERVAL);

wss.on("connection", async (ws, req) => {
  if (!req.url) {
    ws.close(1008, "Missing request query");
    return;
  }

  const { query } = parse(req.url, true);
  const userId = query?.userId as string;

  if (!userId) {
    ws.close(1008, "Missing userId or authToken");
    return;
  }

  connections.set(ws, { userId, missedPing: 0 });

  console.log(`[WSS] ${userId} connected`);

  const concurrentConnections = concurrentConnectionsMap.get(userId) || 0;

  concurrentConnectionsMap.set(userId, concurrentConnections + 1);

  if (concurrentConnections === 0) {
    markUserStatus(userId, "online");
  }

  ws.on("pong", () => {
    connections.set(ws, { userId, missedPing: 0 });
  });

  ws.on("close", () => {
    const concurrentConnections = concurrentConnectionsMap.get(userId) || 1;

    const newCount = concurrentConnections - 1;

    if (newCount <= 0) {
      concurrentConnectionsMap.delete(userId);
      markUserStatus(userId, "offline");
    } else {
      concurrentConnectionsMap.set(userId, newCount);
    }
    console.log(`[WSS] ${userId} disconnected`);
  });

  ws.on("error", (err) => {
    console.error(`[WSS] Error with ${userId}:`, err);
  });
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});
