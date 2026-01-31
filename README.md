# SellIt

Monorepo for **SellIt**:

- **Backend**: Express + MongoDB (Mongoose) + JWT + validation
- **Frontend**: React + TypeScript (Vite)
- **Tests**: Jest (backend + frontend)

## Prerequisites

- Node.js (tested with Node 24)
- npm (workspaces)
- MongoDB running locally (system service / normal install)

## Setup

Install dependencies from the repo root:

```bash
npm install
```

Create environment file for the backend:

```bash
cp backend/.env.example backend/.env
```

## Running locally

### Use your system MongoDB

Start MongoDB however you normally do (service/daemon), then make sure `backend/.env` points to it, e.g.:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/sellit
```

### Start dev servers (frontend + backend)

From the repo root:

```bash
npm run dev
```

- **Frontend**: `http://127.0.0.1:5173`
- **Backend**: `http://localhost:5050`

Note: macOS often has AirPlay/AirTunes using port **5000**, so the backend defaults to **5050**.

## API

- `GET /health` -> `{ status: "ok", name: "SellIt API" }`
- `GET /api/health` -> same (handy for the frontend dev proxy)
- `POST /api/auth/register` -> stub endpoint with validation (email + password)

## Tests

Run everything:

```bash
npm test
```

Run workspace tests individually:

```bash
npm -w backend test
npm -w frontend test
```

## Build

```bash
npm run build
```

## Useful workspace commands

```bash
npm -w backend run dev
npm -w frontend run dev
```

