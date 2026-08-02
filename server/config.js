require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { QdrantClient } = require('@qdrant/js-client-rest');

const config = {
  PORT: process.env.PORT || 3001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  QDRANT_URL: process.env.QDRANT_URL,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  QDRANT_COLLECTION: process.env.QDRANT_COLLECTION || 'pdf_chunks',
  EMBEDDING_MODEL: 'models/gemini-embedding-001',
  GENERATION_MODEL: 'models/gemini-2.0-flash',
  CHUNK_SIZE: 800,
  CHUNK_OVERLAP: 150,
  VECTOR_DIM: 768,
  SEARCH_LIMIT: 10,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(url => url.trim())
};

let genai, qdrantClient;

try {
  genai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
} catch (error) {
  console.error("Failed to initialize GoogleGenAI client. Ensure GEMINI_API_KEY is set.");
}

try {
  qdrantClient = new QdrantClient({
    url: config.QDRANT_URL,
    apiKey: config.QDRANT_API_KEY,
    checkCompatibility: false,
  });
} catch (error) {
  console.error("Failed to initialize QdrantClient. Ensure QDRANT_URL is set.");
}

module.exports = {
  config,
  genai,
  qdrantClient
};
