# Mesh WebSocket Server

A lightweight WebSocket server built with **Node.js** and the **`ws`** library to power real-time user presence for the [Mesh App](https://mesh-ochre.vercel.app/).

 - **Heartbeat System**  
  Detects dead connections and cleans up stale sessions—especially useful in unreliable network conditions or abrupt tab/browser closes.
- **Multi-tab Aware**  
  Supports multiple tabs per user, with smart deduplication to ensure only active sessions are maintained.
Suports multitab

#### Part of the [Mesh Monorepo](https://github.com/chandanSahoo-cs/mesh-turborepo) 
