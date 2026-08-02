const { config, genai } = require('../config');
const { searchPoints } = require('./vectorStore');

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
  const results = await searchPoints(queryVector, limit);
  console.log(`Found ${results.length} results`);
  return results;
}

module.exports = { embedQuery, searchDocuments };
