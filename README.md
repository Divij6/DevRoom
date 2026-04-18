# DevRoom

DevRoom is a collaborative whiteboard and file-sharing workspace built with a Node/Express/Mongo backend and a React/Vite frontend. It supports editable nodes, connections (edges), sticky notes, file uploads and file-to-node linking, presence/cursors, and history logging. The project includes two canvas implementations: a legacy tldraw-based canvas and a React Flow prototype used for migration.

This README documents the whole project: backend APIs, database schemas, controllers and routes, frontend structure and components, realtime/socket events, development setup, and example payloads.

---

**Table of Contents**

- Project overview
- Architecture
- Getting started
- Backend
  - Models / Schemas
  - Controllers & Routes (APIs)
  - Canvas save/load mapping and behavior
  - Files & File linking
  - History
  - Authentication
- Frontend
  - Project structure
  - Key components and behavior
  - Services / API client
  - Canvas behaviors (React Flow)
- Realtime (Socket.IO) events
- Example requests & payloads
- Troubleshooting & notes
- Next steps / TODO

---

**Project Overview**

DevRoom provides shared rooms where collaborators can add architecture nodes, connect them with edges, drop sticky notes, upload and link files to nodes, and see real-time cursors and presence. Data is persisted to MongoDB and history logs are recorded for important actions.

**Architecture**

- Backend: Node.js, Express, Mongoose (MongoDB), Socket.IO. Single service (run on PORT 5002 by default).
- Frontend: React (Vite), React Flow prototype and legacy tldraw canvas. Socket.IO client for presence and realtime events. Axios-based API client.

Default ports used in development:
- Backend: `http://localhost:5002`
- Frontend (Vite): `http://localhost:5173` (dev)

Environment variables (minimum):
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JSON Web Token signing secret (used by authentication middleware)
- `PORT` — optional backend port (defaults to 5002)


**Getting started (dev)**

1. Backend

```bash
cd backend
npm install
# add .env with MONGO_URI and JWT_SECRET
npm run dev    # uses nodemon, runs src/server.js
```

2. Frontend

```bash
cd frontend
npm install
npm run dev    # starts Vite dev server (likely http://localhost:5173)
```

Open the frontend app in a browser, register or login, create a room, and open the room workspace.

---

**Backend**

All backend routes are mounted with `/api` base (except rooms which use `/rooms`). The backend uses `verifyToken` middleware for protected endpoints.

Models are implemented using Mongoose and live under `backend/src/models/`.

**Models / Schemas**

- `CanvasNode` (backend/src/models/CanvasNode.js)
  - roomId: ObjectId (Room)
  - title: String
  - type: String (frontend|backend|database|service|...)
  - position: { x: Number, y: Number }
  - width: Number
  - height: Number
  - createdBy: ObjectId (User)
  - timestamps

- `CanvasEdge` (backend/src/models/CanvasEdge.js)
  - roomId: ObjectId
  - sourceNodeId: ObjectId (CanvasNode)
  - targetNodeId: ObjectId (CanvasNode)
  - createdBy: ObjectId (User)
  - timestamps

- `CanvasNote` (backend/src/models/CanvasNote.js)
  - roomId: ObjectId
  - text: String
  - position: { x: Number, y: Number }
  - createdBy: ObjectId (User)
  - timestamps

- `File` (backend/src/models/File.js)
  - roomId, fileName, fileType, fileSize, filePath, uploadedBy, isDeleted, timestamps

- `FileVersion` (backend/src/models/FileVersion.js)
  - fileId, versionNumber, filePath, uploadedBy, changeNote, timestamps

- `FileNodeLink` (backend/src/models/FileNodeLink.js)
  - nodeId, fileId, linkedBy, timestamps

- `HistoryLog` (backend/src/models/HistoryLog.js)
  - roomId, userId, actionType, message, entityId, timestamps

- `User`, `Room`, `RoomMember` models exist for auth and membership.


Controllers & Routes (main API endpoints)

- Canvas
  - GET `/api/canvas/:roomId` — returns full canvas for a room: { nodes, edges, notes, fileLinks }
  - POST `/api/canvas/save` — authoritative save endpoint; expects payload { roomId, nodes, edges, notes } and replaces existing canvas data for that room (protected)
  - POST `/api/canvas/load` — loads an incoming canvas payload (replaces existing)

- Nodes
  - POST `/api/nodes` — create a single CanvasNode (protected)
    - body: { title, type, position, width, height, createdBy, roomId }
    - response: { message, nodeId }
  - GET `/api/nodes/:roomId` — get nodes for a room (protected)
  - PUT `/api/nodes/:nodeId` — update node (position/title) (protected)
  - DELETE `/api/nodes/:nodeId` — delete node (also deletes edges + file links) (protected)

- Edges
  - POST `/api/edges` — create edge (protected)
    - body: { sourceNodeId, targetNodeId, roomId, createdBy }
    - response: { edgeId }
  - DELETE `/api/edges/:edgeId` — delete edge

- Notes
  - POST `/api/notes` — create CanvasNote (protected)
    - body: { text, position, roomId, createdBy }
    - response: { noteId }
  - PUT `/api/notes/:noteId` — update note text/position (protected)
  - DELETE `/api/notes/:noteId` — remove note

- Files
  - POST `/api/files/upload` — upload file / create file + version
  - POST `/api/files/:fileId/version` — add a new version
  - GET `/api/files/:roomId` — list files in a room (with optional search)
  - GET `/api/files/link/:fileId` — get metadata and download URL for a file
  - GET `/api/files/download/:fileId` — download file
  - DELETE `/api/files/:fileId` — mark deleted

- File linking
  - POST `/api/files/link` — create a FileNodeLink: { nodeId, fileId, linkedBy, roomId }
  - GET `/api/files/node/:nodeId` — list file links for a node
  - DELETE `/api/files/unlink` — body { linkId }

- Rooms & Members
  - Routes under `/rooms` and `/rooms/:roomId` handle room creation and member invites (protected endpoints)

- Auth
  - `/api/register`, `/api/login`, `/api/me`, etc. (protected endpoints use `verifyToken` middleware)


Canvas Save Behavior (important)

The `saveFullCanvas` controller replaces the current canvas for the room by:
1. Deleting existing CanvasNode, CanvasEdge, CanvasNote for the room.
2. Inserting the provided `nodes` array via `CanvasNode.insertMany`. The controller expects each node item to contain a `tempShapeId` (front-end temporary id) and other fields; it strips `tempShapeId` and inserts the rest into the collection.
3. After insertMany returns, the controller constructs a `shapeIdMap` that maps each front-end `tempShapeId` value to the newly created Mongo `_id` assigned by insertMany (mapping by the original `nodes` array index => savedNodes[index]._id).
4. Edges received in the payload should include `sourceTempId` / `targetTempId` and optional `sourcePoint` / `targetPoint`. The controller attempts to map source/target using `shapeIdMap`. If mapping fails, a proximity heuristic (distance < 150 pixels) is used to find the nearest saved node.
5. Valid mapped edges are written via `CanvasEdge.insertMany`.
6. Notes in the payload are inserted to `CanvasNote.insertMany` (notes are treated as separate documents).

Important payload shape for `/api/canvas/save`:

```json
{
  "roomId": "<roomId>",
  "nodes": [
    { "tempShapeId": "shape:temp_123", "title": "API", "type": "backend", "position": { "x": 120, "y": 80 }, "width": 160, "height": 80, "createdBy": "<userId>", "roomId": "<roomId>" }
  ],
  "edges": [
    { "sourceTempId": "shape:temp_123", "targetTempId": "shape:temp_456", "sourcePoint": { "x": 120, "y": 80 }, "targetPoint": { "x": 200, "y": 80 }, "createdBy": "<userId>" }
  ],
  "notes": [
    { "text": "This is a sticky note", "position": { "x": 240, "y": 180 }, "createdBy": "<userId>", "roomId": "<roomId>" }
  ]
}
```

If your frontend sends notes as part of the `nodes` array (instead of the top-level `notes` array), the controller will treat them as CanvasNode documents and notes will not be persisted as `CanvasNote` documents — this is a common source of mismatch with the schema.

**Authentication**

- Most APIs are protected with `verifyToken`. The frontend `services/api.js` sets up an axios interceptor to attach the `Authorization: Bearer <token>` header where `devroom_token` is stored in localStorage.

**History**

- Controllers log important actions to `HistoryLog` documents (create, update, delete actions for nodes/edges/notes/files). The `getHistory` endpoint returns logs for a room.

---

**Frontend**

Project layout (key files & folders):

- `frontend/src/main.jsx` — app bootstrap
- `frontend/src/App.jsx` — top-level app routes and layout
- `frontend/index.html` — Vite HTML template
- `frontend/src/assets/` — static assets
- `frontend/src/components/` — UI components grouped by feature
  - `Auth/` — `LoginPage.jsx`, `RegisterPage.jsx`
  - `Canvas/` — `TldrawCanvas.jsx` (legacy), `ReactFlowCanvas.jsx` (prototype)
  - `Layout/` — `RoomWorkspace.jsx` (workspace layout, includes canvas and panels)
  - `Panels/` — `FilesPanel.jsx`, `HistoryPanel.jsx`, `MembersPanel.jsx`, `OverviewPanel.jsx`
  - `Sidebar/` — `CreateRoomModal.jsx`, `SideBar.jsx`, `TemplateSidebar.jsx` (templates toolbar)
- `frontend/src/context/` — `AuthContext.jsx`, `RoomContext.jsx` — authentication and active room state
- `frontend/src/services/api.js` — central axios API client and route wrappers
- `frontend/src/templates/nodeTemplates.js` — available node templates (service, database, note, etc.)
- `frontend/src/hooks/useToast.jsx` — small toast helper


Key frontend behaviors

- Authentication flow
  - Login/Register pages post credentials to the backend and store the returned JWT in localStorage under `devroom_token` used by the API client.
  - `AuthContext` exposes `user` and token state to components.

- Room selection and workspace
  - `RoomWorkspace.jsx` holds the canvas and panels. It provides the `roomId` and `userId` props to the canvas components and toggles between `TldrawCanvas` and `ReactFlowCanvas` (migration path).

- `services/api.js`
  - Exposes convenient functions for all backend endpoints (e.g., `createNode`, `updateNode`, `getCanvas`, `saveCanvas`, `createNote`, `updateNote`, `uploadFile`, `linkFileToNode`, `getNodeFiles`, etc.)
  - Axios interceptor injects Authorization using `devroom_token` from localStorage.

- ReactFlowCanvas (current prototype)
  - Loads canvas via `getCanvas(roomId)` and maps backend node/edge/note documents to React Flow `nodes` and `edges`.
  - Node creation: when the user drags a template into the canvas or clicks a template, a temporary node is created client-side with a `temp` id like `shape:temp_...`, and an API call is made:
    - For regular nodes: `POST /api/nodes` to create a `CanvasNode`; the UI replaces the temp id with `shape:<DB_ID>` on success.
    - For notes: `POST /api/notes` to create `CanvasNote` and the client replaces the temp id with `note:<DB_ID>`.
  - Note editing: notes are rendered using an editable `NoteNode` component. On blur the frontend calls `PUT /api/notes/:noteId` to update text. Dragging a note persists its `position` via `PUT /api/notes/:noteId`.
  - Edge creation: on connect the client attempts to call `POST /api/edges` when both endpoints are already persisted (DB ids). Otherwise it falls back to saving the full canvas via `/api/canvas/save` which runs the mapping logic server-side.
  - Save button triggers a canvas save that separates normal nodes and notes: nodes are sent as `nodes` (with `tempShapeId`), notes are sent top-level as `notes` array. Edges connecting to notes are excluded because edges target CanvasNode ids.
  - Cursor / presence: the client connects to Socket.IO and emits `presence-join` and `cursor-move` events. Cursor overlay displays remote cursors, and presence is shown in the room.
  - Realtime: the canvas listens for server-emitted events and updates state on `node-created`, `node-updated`, `node-deleted`, `edge-created`, `edge-deleted`, `note-created`, and `note-updated`.

- FilesPanel
  - Upload flow posts to `POST /api/files/upload` and then optionally links the uploaded file to a selected node using `POST /api/files/link`.
  - On node hover, the canvas queries `GET /api/files/node/:nodeId` and shows linked file names as a tooltip; clicking a file navigates to the Files panel.


**Realtime (Socket.IO) events**

Server-side socket handling is in `backend/src/server.js`. The server holds a `roomUsers` in-memory map for presence and allows clients to join a room for presence and cursor broadcast.

Important events and payloads:

- Client -> Server
  - `presence-join` { userId, roomId, userName }
  - `cursor-move` { userId, roomId, x, y, userName }

- Server -> Clients
  - `presence-update` — array of current users in the room
  - `cursor-update` { socketId, userId, roomId, x, y, userName }
  - `cursor-remove` { socketId }
  - `node-created` — emitted when node created via API (payload: node document)
  - `node-updated` — emitted when node updated (payload: node document)
  - `node-deleted` — { nodeId }
  - `edge-created` — payload: edge document
  - `edge-deleted` — { edgeId }
  - `note-created` — payload: note document
  - `note-updated` — payload: updated note document

Controllers use `global.io.to(roomId).emit(...)` to broadcast events. Clients must join the room (via `socket.join(roomId)` under `presence-join` or via `cursor-move` logic) for events to be received.


**Example flows & payloads**

1. Create a node (client uses `createNode` API):

Request:

POST `/api/nodes`
Headers: `Authorization: Bearer <token>`
Body:

```json
{
  "title": "Auth Service",
  "type": "service",
  "position": { "x": 160, "y": 120 },
  "width": 160,
  "height": 80,
  "createdBy": "<userId>",
  "roomId": "<roomId>"
}
```

Response:

```json
{ "message": "Node created successfully", "nodeId": "<nodeId>" }
```

2. Create a note:

POST `/api/notes` body: { text, position, roomId, createdBy }
Response: { noteId }

3. Save full canvas:

POST `/api/canvas/save` body: { roomId, nodes: [...], edges: [...], notes: [...] }
- Notes must be top-level `notes` array as CanvasNote objects.
- Nodes must include `tempShapeId` so server can map the inserted Mongo IDs back to client temp ids.

4. Link file to node:

POST `/api/files/link` body: { nodeId, fileId, linkedBy, roomId }


**Troubleshooting & common pitfalls**

- Notes being saved incorrectly: ensure the frontend sends note content in the top-level `notes` array when calling `/api/canvas/save`. The server inserts `CanvasNote.insertMany(notes)`. If your frontend includes note nodes in `nodes` instead, the server will create `CanvasNode` documents (wrong schema) and not use `CanvasNote`.

- Empty note text errors on create: server's `createNote` requires `text` and `roomId`. When creating notes from the client, send an initial non-empty text (e.g., "New note") or call `POST /api/notes` after the note has text.

- Realtime events not appearing in other clients: confirm that clients emit `presence-join` or `cursor-move` to join the Socket.IO room and that the server's allowed CORS origins include your frontend origin (server includes `http://localhost:5173` and `http://localhost:5174`). Also confirm that `global.io` exists (server sets it in `server.js`) and controllers are emitting events.

- Edge mapping on full save: server maps edges using `sourceTempId` / `targetTempId` and falls back to proximity mapping (distance threshold = 150). If edges are mapped incorrectly, make sure temp IDs were provided and positions are accurate for the proximity match.

- Token/auth issues: API endpoints require a valid JWT. `services/api.js` automatically sets the `Authorization` header when `devroom_token` is present in localStorage.


**Development notes & next steps**

- The project contains both `TldrawCanvas.jsx` (legacy) and `ReactFlowCanvas.jsx` (migration). The React Flow prototype already supports: node creation, note nodes (with inline edit), file link tooltips, cursor overlay and persistence endpoints. Remaining tasks include polishing real-time sync edge-cases and replacing all legacy tldraw code once React Flow is fully feature-complete.

- TODO highlights:
  - Finalize note editing UX and optimistic update flow (save-on-blur already implemented in prototype but can be improved).
  - Ensure all edge creation paths emit `edge-created` with the correct DB ids.
  - Add E2E tests for two-client realtime flows.


**Where to look in the repo**

- Backend APIs: `backend/src/controllers/` and routes in `backend/src/routes/`
- Models: `backend/src/models/` (CanvasNode, CanvasEdge, CanvasNote, File, FileVersion, FileNodeLink, HistoryLog)
- Realtime socket server: `backend/src/server.js`
- Frontend components: `frontend/src/components/`
- API client: `frontend/src/services/api.js`
- React Flow canvas prototype: `frontend/src/components/Canvas/ReactFlowCanvas.jsx`
- Legacy tldraw canvas: `frontend/src/components/Canvas/TldrawCanvas.jsx`
