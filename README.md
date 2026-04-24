# DevRoom

DevRoom is a collaborative software-planning workspace where teams can create rooms, sketch system architecture on a shared canvas, connect components, add notes, attach files to nodes, manage collaborators, and review activity history. The project uses a React + Vite frontend, a Node.js + Express backend, MongoDB for persistence, and Socket.IO for realtime collaboration.

## What This Project Does

DevRoom is designed for software teams that want one place to:

- create shared project rooms
- build architecture diagrams with draggable nodes and edges
- add sticky notes for design discussion
- upload text-based project files and keep version history
- link files to specific architecture nodes
- invite collaborators with room roles
- see live user presence and remote cursors
- review room activity through a history panel

## Main Features

- JWT-based authentication
- room creation, listing, update, and archive flow
- role-based room membership (`owner`, `editor`, `viewer`)
- React Flow-based collaborative canvas
- node, edge, and note persistence in MongoDB
- file upload using stored text content plus file versioning
- file-to-node linking
- Socket.IO presence, cursor sharing, and live canvas event broadcast
- activity logging through `HistoryLog`

## Tech Stack

### Frontend

- React 19
- Vite 8
- React Flow
- Axios
- Socket.IO Client
- Lucide React

### Backend

- Node.js
- Express 5
- MongoDB with Mongoose
- Socket.IO
- JWT
- bcryptjs
- CORS
- dotenv

### Dev and Test Utilities

- Playwright
- nodemon

## Architecture Overview

```text
+-------------------+         HTTP / REST          +----------------------+
| React + Vite UI   | ---------------------------> | Express API Server   |
| React Flow Canvas |                              | Auth, Rooms, Canvas  |
| Files + Members   | <--------------------------- | Files, History       |
+---------+---------+         JSON responses       +----------+-----------+
          |                                                        |
          | Socket.IO                                              |
          v                                                        v
+-------------------+                                   +------------------+
| Realtime Clients  | <-------------------------------> | MongoDB          |
| Presence, Cursor  |                                   | App persistence  |
| Canvas Sync       |                                   | and history      |
+-------------------+                                   +------------------+
```

## Repository Structure

```text
DevRoom/
|-- backend/
|   |-- package.json
|   `-- src/
|       |-- config/
|       |-- controllers/
|       |-- middleware/
|       |-- models/
|       |-- routes/
|       `-- server.js
|-- frontend/
|   |-- package.json
|   |-- public/
|   `-- src/
|       |-- components/
|       |-- context/
|       |-- hooks/
|       |-- services/
|       `-- templates/
|-- scripts/
|-- APIs/
|-- README.md
`-- DevRoom_IEEE_Paper.tex
```

## Important Files

### Backend

- `backend/src/server.js`: server bootstrap, route mounting, Socket.IO setup
- `backend/src/config/db.js`: MongoDB connection
- `backend/src/controllers/`: request handlers
- `backend/src/routes/`: API route definitions
- `backend/src/models/`: Mongoose schemas
- `backend/src/middleware/authMiddleware.js`: JWT verification

### Frontend

- `frontend/src/App.jsx`: top-level application flow
- `frontend/src/context/AuthContext.jsx`: login, register, logout state
- `frontend/src/context/RoomContext.jsx`: room list and active room state
- `frontend/src/services/api.js`: Axios clients and API wrappers
- `frontend/src/components/Layout/RoomWorkspace.jsx`: main workspace shell
- `frontend/src/components/Canvas/ReactFlowCanvas.jsx`: active canvas implementation
- `frontend/src/components/Panels/FilesPanel.jsx`: file management
- `frontend/src/components/Panels/MembersPanel.jsx`: collaborator management
- `frontend/src/components/Panels/HistoryPanel.jsx`: room activity timeline
- `frontend/src/templates/nodeTemplates.js`: available node template types

## Data Model Summary

| Model | Purpose | Key Fields |
| --- | --- | --- |
| `User` | platform users | `name`, `email`, `passwordHash`, `profileImage`, `status` |
| `Room` | shared workspace metadata | `name`, `description`, `createdBy`, `isArchived` |
| `RoomMember` | room membership and role | `roomId`, `userId`, `role`, `joinedAt` |
| `CanvasNode` | architecture blocks on canvas | `roomId`, `title`, `type`, `position`, `width`, `height`, `createdBy` |
| `CanvasEdge` | node-to-node connections | `roomId`, `sourceNodeId`, `targetNodeId`, `createdBy` |
| `CanvasNote` | sticky notes on canvas | `roomId`, `text`, `position`, `createdBy` |
| `File` | latest file snapshot | `roomId`, `fileName`, `fileType`, `fileSize`, `filePath`, `fileContent`, `uploadedBy`, `isDeleted` |
| `FileVersion` | saved revisions of a file | `fileId`, `versionNumber`, `filePath`, `fileContent`, `uploadedBy`, `changeNote` |
| `FileNodeLink` | relation between file and node | `nodeId`, `fileId`, `linkedBy` |
| `HistoryLog` | room activity trail | `roomId`, `userId`, `actionType`, `message`, `entityId` |

## API Summary

All backend APIs run from the Node server on `http://localhost:5002`.

### Auth Routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/register` | No | register a new user |
| `POST` | `/api/login` | No | login and receive JWT |
| `GET` | `/api/me` | Yes | fetch current user |
| `POST` | `/api/logout` | Yes | client logout acknowledgement |

### Room Routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/rooms` | Yes | create room |
| `GET` | `/rooms` | Yes | list rooms for current user |
| `GET` | `/rooms/:roomId` | Yes | get room details |
| `PUT` | `/rooms/:roomId` | Yes | update room |
| `DELETE` | `/rooms/:roomId` | Yes | archive room |
| `GET` | `/rooms/:roomId/validate` | Yes | validate room membership |

### Member Routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/rooms/:roomId/members` | Yes | list room members |
| `POST` | `/rooms/:roomId/members` | Yes | invite member |
| `PATCH` | `/rooms/:roomId/members/:memberId` | Yes | update member role |
| `DELETE` | `/rooms/:roomId/members/:memberId` | Yes | remove member |

### Canvas Routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/canvas/:roomId` | Yes | load nodes, edges, notes, file links |
| `POST` | `/api/canvas/save` | Yes | save full canvas snapshot |
| `POST` | `/api/canvas/load` | Yes | replace canvas with incoming payload |

### Node, Edge, and Note Routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/nodes` | Yes | create node |
| `GET` | `/api/nodes/:roomId` | Yes | get nodes in room |
| `PUT` | `/api/nodes/:nodeId` | Yes | update node title or position |
| `DELETE` | `/api/nodes/:nodeId` | Yes | delete node and linked graph data |
| `POST` | `/api/edges` | Yes | create edge |
| `DELETE` | `/api/edges/:edgeId` | Yes | delete edge |
| `POST` | `/api/notes` | Yes | create note |
| `PUT` | `/api/notes/:noteId` | Yes | update note |
| `DELETE` | `/api/notes/:noteId` | Yes | delete note |

### File and File-Link Routes

| Method | Route | Auth in current code | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/files/upload` | No | create file or new file version |
| `POST` | `/api/files/:fileId/version` | No | add file version |
| `GET` | `/api/files/download/:fileId` | No | return file and versions |
| `GET` | `/api/files/link/:fileId` | No | return file metadata and generated download URL |
| `GET` | `/api/files/:fileId/content` | No | get latest file content |
| `GET` | `/api/files/:fileId/versions` | No | get version list |
| `GET` | `/api/files/room/:roomId` | No | list files in a room |
| `GET` | `/api/files/:fileId` | No | get latest file content |
| `DELETE` | `/api/files/:fileId` | No | soft delete file |
| `POST` | `/api/files/link` | Yes | link file to node |
| `GET` | `/api/files/node/:nodeId` | Yes | get file links for node |
| `DELETE` | `/api/files/unlink` | Yes | unlink file from node |

### History Route

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/history/:roomId` | Yes | room activity timeline |

## Realtime Events

Socket.IO is configured in `backend/src/server.js`.

### Client to Server

| Event | Payload |
| --- | --- |
| `presence-join` | `{ userId, roomId, userName }` |
| `cursor-move` | `{ userId, roomId, x, y, userName }` |
| `node-drag` | `{ roomId, nodeId, x, y }` |
| `note-drag` | `{ roomId, noteId, x, y }` |

### Server to Client

| Event | Payload |
| --- | --- |
| `presence-update` | current room users |
| `cursor-update` | remote cursor coordinates |
| `cursor-remove` | disconnected cursor id |
| `node-created` | created node document |
| `node-updated` | updated node document |
| `node-deleted` | `{ nodeId }` |
| `edge-created` | created edge document |
| `edge-deleted` | `{ edgeId }` |
| `note-created` | created note document |
| `note-updated` | updated note document |
| `node-drag` | live node position |
| `note-drag` | live note position |

## Prerequisites

Install the following before running the project:

- Node.js 18 or later
- npm
- MongoDB instance, local or cloud

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd DevRoom
```

### 2. Install Optional Root Dependencies

The root `package.json` only exists for helper scripts such as Playwright checks.

```bash
npm install
```

### 3. Set Up the Backend

```bash
cd backend
npm install
```

Create `backend/.env` with:

```env
MONGO_URI=mongodb://127.0.0.1:27017/devroom
JWT_SECRET=replace_this_with_a_secure_secret
PORT=5002
```

Start the backend:

```bash
npm run dev
```

The API server starts on `http://localhost:5002`.

### 4. Set Up the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

### 5. Open the App

Visit:

```text
http://localhost:5173
```

Register a new account, sign in, create a room, and begin using the workspace.

## Start-to-Finish User Flow

### 1. Register

- open the frontend
- go to the registration screen
- create an account with name, email, and password

### 2. Login

- sign in using the registered email and password
- the JWT token is stored in local storage under `devroom_token`

### 3. Create a Room

- use the sidebar `+` button or landing page CTA
- enter room name and optional description
- the logged-in user becomes room `owner`

### 4. Open the Workspace

The main workspace contains these tabs:

- `Canvas`
- `Overview`
- `Files`
- `Members`
- `History`

### 5. Use the Canvas

- add predefined node templates such as frontend, backend, database, service, cache, queue, gateway, JWT generator, and note
- drag nodes around the canvas
- connect nodes using React Flow handles
- save the full canvas using the `Save` button
- use right-click delete actions or keyboard delete for selected items
- move around the board with mini map and controls

### 6. Manage Files

- upload a file from the Files panel
- optionally link the file to a specific node during upload
- open a file in the editor modal
- save updates as new versions
- inspect version history for each file

### 7. Collaborate in Real Time

- other users in the same room appear in the top bar
- cursor movements are broadcast through Socket.IO
- node and note updates are emitted to connected clients

### 8. Manage Members

- owners and editors can invite members by email
- owners can change roles and remove members
- new members immediately gain access to room data

### 9. Review History

- open the History tab
- inspect room actions such as node creation, edge creation, note updates, file linking, and canvas save operations

## Frontend Implementation Notes

- `AuthContext` handles `login`, `register`, and `logout`
- `AuthContext` does not auto-restore the user from an old token on page refresh
- `RoomContext` loads rooms after successful login
- `RoomWorkspace` opens tabs and creates the shared socket connection for presence
- `ReactFlowCanvas` is the active canvas used in the app
- `TldrawCanvas.jsx` still exists in the repo as legacy code, but the workspace currently renders React Flow
- `frontend/src/services/api.js` uses hard-coded backend URLs pointing at `http://localhost:5002`

## Backend Implementation Notes

- the backend connects to MongoDB through `MONGO_URI`
- JWT verification reads `Authorization: Bearer <token>`
- rooms are protected with membership checks
- room deletion is a soft delete implemented through `isArchived`
- full canvas save replaces the room's previous canvas data
- edge saving uses a temp-id mapping strategy and a proximity fallback
- history is written during many create, update, delete, and save actions
- Socket.IO uses a memory-based presence map, so presence is not persisted across server restarts

## Canvas Save Format

The full save endpoint expects a payload similar to:

```json
{
  "roomId": "ROOM_ID",
  "nodes": [
    {
      "tempShapeId": "shape:temp_123",
      "title": "API Gateway",
      "type": "gateway",
      "position": { "x": 160, "y": 120 },
      "width": 160,
      "height": 80,
      "createdBy": "USER_ID",
      "roomId": "ROOM_ID"
    }
  ],
  "edges": [
    {
      "sourceTempId": "shape:temp_123",
      "targetTempId": "shape:temp_456",
      "sourcePoint": { "x": 160, "y": 120 },
      "targetPoint": { "x": 400, "y": 120 },
      "createdBy": "USER_ID"
    }
  ],
  "notes": [
    {
      "_id": "NOTE_ID",
      "text": "Remember to cache token validation",
      "position": { "x": 260, "y": 240 },
      "createdBy": "USER_ID",
      "roomId": "ROOM_ID"
    }
  ]
}
```

## Manual Testing and Helper Scripts

The repository includes helper scripts under `scripts/`.

### API Smoke Test

```bash
node scripts/apiTest.js
```

Registers a temporary user and checks login.

### Canvas Save Test

```bash
node scripts/canvasEdgeTest.mjs
```

Creates a room, saves sample nodes and edges, then fetches the canvas.

### Browser and Playwright Checks

```bash
node scripts/browserTest.mjs
node scripts/playwrightEdgeDebug.mjs
```

These scripts were written during earlier canvas work. Some of them still reference older Tldraw behavior, so treat them as development utilities rather than guaranteed production-grade tests.

## Configuration Notes

These values are currently hard-coded in the codebase:

- backend REST base URL: `frontend/src/services/api.js`
- backend socket URL: `frontend/src/components/Layout/RoomWorkspace.jsx`
- canvas socket URL: `frontend/src/components/Canvas/ReactFlowCanvas.jsx`
- allowed Socket.IO and CORS origins: `backend/src/server.js`

If you deploy the project to a different host or port, update those files or refactor them to use environment variables.

## Known Limitations

- file routes under `/api/files/*` are not protected by JWT middleware in the current backend implementation
- the frontend does not automatically restore the logged-in user after a page refresh, even if a token is still present
- the note template path currently tries to create empty notes, while the backend requires non-empty note text
- presence is stored in memory and is lost when the backend restarts
- helper test scripts are partly based on older canvas behavior
- there is no Docker, CI pipeline, or `.env.example` file in the current repository

## Suggested Improvements

- move frontend and backend base URLs into environment variables
- add authentication middleware to file routes
- fix empty-note creation flow in React Flow
- restore session state from stored JWT on refresh
- add automated API and end-to-end test coverage
- introduce Docker and environment templates
- persist richer audit metadata for history entries

## Deliverables Added in This Repository

- `README.md`: complete end-to-end project documentation
- `DevRoom_IEEE_Paper.tex`: IEEE-style LaTeX source for a research/project paper based on this project

## Troubleshooting

### Backend fails to start

Check:

- MongoDB is running
- `backend/.env` exists
- `MONGO_URI` is valid
- `JWT_SECRET` is set

### Frontend cannot reach backend

Check:

- backend is running on port `5002`
- frontend is running on port `5173`
- the hard-coded URLs in `frontend/src/services/api.js` still match your environment

### Realtime presence is not visible

Check:

- Socket.IO server is running with the backend
- both users joined the same room
- your frontend origin is allowed in `backend/src/server.js`

### Room actions return authorization errors

Check:

- you are logged in
- `devroom_token` exists in local storage
- your member role allows the attempted action

## Conclusion

DevRoom is a solid full-stack prototype for collaborative architecture planning and lightweight project documentation. The current codebase already covers authentication, room management, collaborative canvas editing, file versioning, realtime presence, and history tracking. The next step is to harden configuration, security, and automated testing so the project can move from prototype quality to production readiness.
