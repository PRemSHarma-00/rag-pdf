# RAG PDF Engine

A Retrieval-Augmented Generation engine that lets users upload PDF documents and ask natural language questions, receiving cited answers grounded in the document content.

## Key Features

- **PDF Ingestion Pipeline**: Extracts text from PDFs, splits into semantically aware chunks, generates vector embeddings, and indexes in Qdrant.
- **Semantic Retrieval**: Embeds user queries with Gemini and performs cosine-similarity vector search to retrieve the most relevant document chunks.
- **Grounded Generation**: Feeds retrieved context to Gemini with strict citation instructions, ensuring answers reference specific page numbers.
- **Real-Time Streaming**: Server-Sent Events (SSE) stream tokens from the LLM to the browser, rendering the answer progressively.
- **Document Management**: Upload, list, and delete documents with full vector cleanup.

## Architecture

```
PDF Upload → Text Extraction (pdf-parse) → Chunking (800 char, 150 overlap)
           → Gemini Embedding (768d vectors) → Qdrant Cloud (Cosine index)

User Query → Gemini Embedding → Qdrant Vector Search (top 10)
           → Context Assembly → Gemini 2.0 Flash (streaming) → SSE → React UI
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Frontend** | React, Vite |
| **Embeddings** | Gemini Embedding API (768d) |
| **Vector DB** | Qdrant Cloud |
| **LLM** | Gemini 2.0 Flash |
| **Streaming** | Server-Sent Events (SSE) |
| **Design System** | Custom Ledger tokens (vanilla CSS) |

## Getting Started

### Prerequisites
- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/app/apikey) (free)
- [Qdrant Cloud](https://cloud.qdrant.io/) account (free tier, 1GB)

### Backend Setup

```bash
cd server
cp .env.example .env
# Fill in your API keys in .env
npm install
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
rag-pdf/
├── server/                    # Express.js Backend
│   ├── index.js               # Server entrypoint
│   ├── config.js              # Environment config & client initialization
│   ├── rag/
│   │   ├── ingest.js          # PDF parsing, chunking, embedding, Qdrant storage
│   │   ├── retrieve.js        # Query embedding & vector similarity search
│   │   └── generate.js        # LLM prompt assembly & streaming generation
│   └── routes/
│       └── api.js             # REST + SSE API endpoints
│
└── client/                    # React + Vite Frontend
    └── src/
        ├── App.jsx            # App shell with sidebar & theme toggle
        ├── styles/            # Ledger design system tokens
        ├── index.css          # Chat-specific styles (uses Ledger tokens)
        └── components/
            ├── ChatInterface.jsx  # SSE streaming chat with auto-scroll
            ├── MessageBubble.jsx  # Markdown rendering + source citations
            ├── FileUpload.jsx     # Drag-and-drop PDF upload
            └── Sidebar.jsx        # Document list management
```

## Environment Variables

### Backend (`server/.env`)
```
GEMINI_API_KEY=your-gemini-api-key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION=pdf_chunks
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`client/.env`)
```
VITE_API_URL=http://localhost:3001
```

## Deployment

### Backend → Render (Free Tier)
1. Push to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env.example`

### Frontend → Vercel
1. Import the repo on [Vercel](https://vercel.com)
2. Set root directory to `client`
3. Set `VITE_API_URL` to your Render backend URL

### Vector DB → Qdrant Cloud
1. Create a free cluster at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Copy the cluster URL and API key to your backend `.env`
