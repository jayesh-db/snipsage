# SnipSage — AI-Powered Personal Knowledge Assistant

> Capture web content while browsing, build a private knowledge base, and chat with an AI that answers exclusively from your saved data.

![Node.js](https://img.shields.io/badge/Node.js-TypeScript-blue)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)
![LangChain](https://img.shields.io/badge/Framework-LangChain.js-purple)

## Architecture

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│  Chrome Extension │────▶│   Express Backend     │────▶│     MongoDB      │
│  (Manifest V3)   │     │   (TypeScript)        │     │  (Data + Vectors)│
└──────────────────┘     │                       │     └──────────────────┘
                         │  ┌─────────────────┐  │
┌──────────────────┐     │  │ LangChain RAG   │  │     ┌──────────────────┐
│  Web Dashboard   │────▶│  │ Pipeline        │──┼────▶│ Gemini 2.5 Flash │
│  (HTML/CSS/JS)   │     │  └─────────────────┘  │     │ (Google AI)      │
└──────────────────┘     └───────────────────────┘     └──────────────────┘
```

## Features

- **📸 Content Capture** — Select text on any webpage, right-click → "Save to SnipSage"
- **🔐 User Isolation** — Every piece of data is scoped to the authenticated user
- **🧠 AI-Grounded Chat** — Gemini only answers from YOUR saved content, never hallucinating
- **🔍 Vector Search** — Semantic similarity search via embeddings for accurate retrieval
- **📊 Dashboard** — Beautiful dark-themed dashboard with knowledge base & chat views
- **🔄 Dynamic DB** — Supports both local MongoDB and Atlas cluster

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — local installation or Atlas cluster
- **Google API Key** — with access to Gemini 2.5 Flash & gemini-embedding-001
- **Chrome Browser** — for the extension

## Quick Start

### 1. Clone & Install

```bash
cd SnipSage
npm install
```

### 2. Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI (your MongoDB connection string)
# - GOOGLE_API_KEY (your Google AI API key)
# - JWT_SECRET (change this to a random string!)
```

### 3. Start the Server

```bash
# Development mode (with hot-reload)
npm run dev

# Or build & start production
npm run build
npm start
```

The server starts at `http://localhost:3000`.

### 4. Install Chrome Extension

1. Open Chrome → navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The SnipSage extension icon will appear in your toolbar!

### 5. Start Using

1. **Sign up** on the dashboard at `http://localhost:3000`
2. **Log in** to the Chrome Extension popup
3. **Select text** on any webpage → right-click → **"Save to SnipSage"**
4. View saved content in the **Knowledge Base**
5. Ask questions in the **AI Chat** — responses are grounded in your saved data

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login & get JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/content` | Save captured content | Yes |
| GET | `/api/content` | List content (paginated) | Yes |
| GET | `/api/content/:id` | Get single content | Yes |
| DELETE | `/api/content/:id` | Delete content | Yes |
| POST | `/api/chat` | Send AI chat message | Yes |
| GET | `/api/chat/history/:sessionId` | Get chat history | Yes |
| GET | `/api/health` | Health check | No |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/snipsage` |
| `JWT_SECRET` | Secret for JWT signing | *(required)* |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |
| `GOOGLE_API_KEY` | Google AI API key | *(required)* |
| `VECTOR_STORE_TYPE` | `memory` or `atlas` | `memory` |
| `ATLAS_VECTOR_SEARCH_INDEX_NAME` | Atlas vector index name | `vector_index` |

## Project Structure

```
SnipSage/
├── src/                        # TypeScript Backend
│   ├── types/index.ts          # All interfaces & types
│   ├── models/                 # Mongoose models
│   │   ├── User.ts
│   │   └── Content.ts
│   ├── middleware/auth.ts      # JWT auth middleware
│   ├── services/               # Business logic
│   │   ├── authService.ts
│   │   ├── contentService.ts
│   │   ├── embeddingService.ts
│   │   ├── vectorStoreService.ts
│   │   └── ragService.ts
│   ├── routes/                 # API routes
│   │   ├── auth.ts
│   │   ├── content.ts
│   │   └── chat.ts
│   ├── app.ts                  # Express setup
│   └── server.ts               # Entry point
├── extension/                  # Chrome Extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html/css/js
│   └── icons/
├── public/                     # Dashboard (served by Express)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Tech Stack

- **Backend:** Node.js + TypeScript + Express
- **Database:** MongoDB (Mongoose)
- **AI Model:** Google Gemini 2.5 Flash
- **Embeddings:** gemini-embedding-001
- **AI Framework:** LangChain.js
- **Vector Store:** MemoryVectorStore (dev) / Atlas Vector Search (prod)
- **Auth:** JWT (bcryptjs)
- **Extension:** Chrome Manifest V3
- **Dashboard:** Vanilla HTML/CSS/JS with dark glass UI

## Deployment (Vercel)

SnipSage is deployed as a single Vercel serverless function backed by MongoDB Atlas. The dashboard (`public/`) is served by Vercel's CDN.

### Prerequisites

- MongoDB **Atlas** cluster (M0 free tier works) with your data
- A [Vercel](https://vercel.com) account connected to your GitHub repo

---

### Step 1 — Create an Atlas Vector Search Index

The production deployment uses `VECTOR_STORE_TYPE=atlas` (stateless, ideal for serverless). You must create a Search index on the `contents` collection **before** first deploy.

1. Open your Atlas cluster → **Search** tab → **+ Create Index**
2. Select **Atlas Vector Search**, choose the `snipsage` database → `contents` collection
3. Use **JSON editor** and paste:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "userId" },
    { "type": "filter", "path": "parentId" },
    { "type": "filter", "path": "captureType" }
  ]
}
```

4. Name the index **`vector_index`** and click **Create**.

> **Note:** The `gemini-embedding-001` model produces 3072-dimensional vectors.

---

### Step 2 — Connect GitHub to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select the `SnipSage` repo
3. Leave **Framework Preset** as `Other`, **Root Directory** as `./`
4. Click **Deploy** — it will fail on first run (missing env vars). That's expected.

---

### Step 3 — Add Environment Variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A strong random string (64+ chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `GOOGLE_API_KEY` | Your Google AI API key |
| `VECTOR_STORE_TYPE` | `atlas` |
| `ATLAS_VECTOR_SEARCH_INDEX_NAME` | `vector_index` |
| `NODE_ENV` | `production` |

> Generate a secure JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

### Step 4 — Redeploy

After adding env vars: **Deployments → ⋯ → Redeploy**

Your production URL will be: `https://snipsage-<hash>.vercel.app`

---

### Step 5 — Update Chrome Extension

1. Open `extension/popup.js` and update line:
   ```js
   const SNIPSAGE_API_URL = 'https://snipsage-<hash>.vercel.app/api';
   ```
2. Go to `chrome://extensions/` → **Reload** the SnipSage extension

---

### Step 6 — Verify Deployment

```bash
# Health check
curl https://snipsage-<hash>.vercel.app/api/health

# Expected response:
# { "success": true, "message": "SnipSage API is running.", ... }
```

Test the full flow: Sign up → save a snippet via extension → chat with AI.

---

### Local Development After Deploy

No changes needed — `npm run dev` still runs against your local `.env`:

```bash
# .env stays as-is for local dev
VECTOR_STORE_TYPE=memory   # or atlas — both work locally
npm run dev                 # http://localhost:3000
```

---

## License

MIT
