import dotenv from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";

dotenv.config();

const API_ENDPOINT = "http://localhost:3000/api/mark-status";

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
  if (!req.url) {
    ws.close(1008, "Missing request query");
    return;
  }

  const { query } = parse(req.url, true);
  const userId = query?.userId;

  if (!userId) {
    ws.close(1008, "Missing userId or authToken");
  }

  console.log(`[WSS] ${userId} connected`);

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, status: "online" }),
  }).catch((err) => console.error("[WSS] Error marking online: ", err));

  console.log("Response:", res);

  ws.on("close", () => {
    console.log(`[WSS] ${userId} disconnected`);

    fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, status: "offline" }),
    }).catch((err) => console.error("WSS Error marking offline :", err));
  });
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});
