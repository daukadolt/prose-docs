# Prose Docs

Collaborative document editor with AI-powered spell check.

## Prerequisites
- Node.js (v18+ recommended)
- Yarn or npm

## Setup

### 1. Install dependencies

```
cd backend
npm install
cd ../frontend
npm install
```

### 2. Start the backend (Cloudflare Worker)

```
cd backend
npm run dev
```

### 3. Start the frontend (Vite React app)

```
cd frontend
npm run dev
```

### 4. Open the app

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

- Backend runs on Cloudflare Workers (local dev via Wrangler)
- Frontend is a Vite React app
- Collaborative editing powered by Yjs and WebSocket
- AI spell check via OpenAI/Meta Llama (see backend config) 