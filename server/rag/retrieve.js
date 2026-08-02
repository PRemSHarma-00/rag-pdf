const { config, genai, qdrantClient } = require('../config');

async function embedQuery(query) {
  const response = await genai.models.embedContent({
    model: config.EMBEDDING_MODEL,
    contents: query,
  });
  return response.embedding?.values || response.embeddings?.[0]?.values;
}

async function searchDocuments(query, limit = config.SEARCH_LIMIT) {
  console.log(`Searching for: "${query}"`);
  const queryVector = await embedQuery(query);
  
  const searchResults = await qdrantClient.search(config.QDRANT_COLLECTION, {
    vector: queryVector,
    limit: limit,
    with_payload: true,
  });
  
  console.log(`Found ${searchResults.length} results`);
  
  return searchResults.map(result => ({
    text_content: result.payload.text_content,
    page_number: result.payload.page_number,
    filename: result.payload.filename,
    score: result.score,
    document_id: result.payload.document_id
  }));
}

module.exports = { embedQuery, searchDocuments };
