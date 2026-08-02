const { config, qdrantClient } = require('../config');

// Fallback in-memory vector store if Qdrant Cloud is unreachable or not configured
const memoryStore = [];

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function upsertPoints(points) {
  let usedQdrant = false;
  if (qdrantClient) {
    try {
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await qdrantClient.upsert(config.QDRANT_COLLECTION, {
          wait: true,
          points: batch
        });
      }
      usedQdrant = true;
      console.log(`Upserted ${points.length} points to Qdrant Cloud`);
    } catch (err) {
      console.warn("Qdrant Cloud upsert unavailable, using local memory store:", err.message);
    }
  }

  if (!usedQdrant) {
    for (const p of points) {
      memoryStore.push(p);
    }
    console.log(`Stored ${points.length} points in local memory store (total: ${memoryStore.length})`);
  }
}

async function searchPoints(queryVector, limit = config.SEARCH_LIMIT) {
  if (qdrantClient) {
    try {
      const searchResults = await qdrantClient.search(config.QDRANT_COLLECTION, {
        vector: queryVector,
        limit: limit,
        with_payload: true,
      });
      if (searchResults && searchResults.length > 0) {
        return searchResults.map(result => ({
          text_content: result.payload.text_content,
          page_number: result.payload.page_number,
          filename: result.payload.filename,
          score: result.score,
          document_id: result.payload.document_id
        }));
      }
    } catch (err) {
      console.warn("Qdrant Cloud search unavailable, falling back to local memory store search:", err.message);
    }
  }

  // Memory store fallback
  console.log(`Searching memory store (${memoryStore.length} points)...`);
  const scored = memoryStore.map(item => ({
    text_content: item.payload.text_content,
    page_number: item.payload.page_number,
    filename: item.payload.filename,
    score: cosineSimilarity(queryVector, item.vector),
    document_id: item.payload.document_id
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function listDocuments() {
  const docMap = new Map();
  if (qdrantClient) {
    try {
      const response = await qdrantClient.scroll(config.QDRANT_COLLECTION, {
        limit: 10000,
        with_payload: ['document_id', 'filename'],
        with_vector: false,
      });
      for (const point of response.points) {
        if (point.payload && point.payload.document_id) {
          docMap.set(point.payload.document_id, point.payload.filename);
        }
      }
      if (docMap.size > 0) {
        return Array.from(docMap.entries()).map(([id, filename]) => ({ id, filename }));
      }
    } catch (err) {
      console.warn("Qdrant Cloud scroll unavailable, falling back to memory store document listing.");
    }
  }

  for (const item of memoryStore) {
    if (item.payload && item.payload.document_id) {
      docMap.set(item.payload.document_id, item.payload.filename);
    }
  }
  return Array.from(docMap.entries()).map(([id, filename]) => ({ id, filename }));
}

async function deleteDocument(docId) {
  if (qdrantClient) {
    try {
      await qdrantClient.delete(config.QDRANT_COLLECTION, {
        wait: true,
        filter: {
          must: [{ key: 'document_id', match: { value: docId } }]
        }
      });
    } catch (err) {
      console.warn("Qdrant Cloud delete failed:", err.message);
    }
  }

  // Clear from memoryStore
  for (let i = memoryStore.length - 1; i >= 0; i--) {
    if (memoryStore[i].payload && memoryStore[i].payload.document_id === docId) {
      memoryStore.splice(i, 1);
    }
  }
}

module.exports = {
  upsertPoints,
  searchPoints,
  listDocuments,
  deleteDocument
};
