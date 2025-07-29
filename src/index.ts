import dotenv from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";

dotenv.config();

const API_ENDPOINT = process.env.API_ENDPOINT!;

const server = createServer();
const wss = new WebSocketServer({ server });

const concurrentConnectionsMap = new Map<string, number>();

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
    console.error("WSS Error marking status :", error);
  }
};

const allowedOrigins = [
  "https://mesh-ochre.vercel.app",
  "http://localhost:3000",
  "https://432203817ea7.ngrok-free.app",
];

wss.on("connection", async (ws, req) => {
  if (!req.url) {
    ws.close(1008, "Missing request query");
    return;
  }

  const origin = req.headers.origin;

  if (!origin || !allowedOrigins.includes(origin)) {
    ws.close(1008, "Origin not allowed");
    return;
  }

  console.log("Origin: ", origin);

  const { query } = parse(req.url, true);
  const userId = query?.userId as string;

  if (!userId) {
    ws.close(1008, "Missing userId or authToken");
    return;
  }

  console.log(`[WSS] ${userId} connected`);

  let isAlive = true;

  const hearbeatInterval = setInterval(() => {
    if (!isAlive) {
      ws.close(4000, "No heartbeat");
      return;
    }

    ws.ping();
    isAlive = false;
  }, 10000);

  ws.on("pong", () => {
    isAlive = true;
  });

  const concurrentConnections = concurrentConnectionsMap.get(userId) || 0;

  concurrentConnectionsMap.set(userId, concurrentConnections + 1);

  if (concurrentConnections === 0) {
    markUserStatus(userId, "online");
  }

  ws.on("close", () => {
    clearInterval(hearbeatInterval);
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

const PORT = process.env.PORT!;

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});
