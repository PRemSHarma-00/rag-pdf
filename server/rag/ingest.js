const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { config, genai, qdrantClient } = require('../config');

async function ensureCollection() {
  try {
    if (!qdrantClient) {
      console.warn("QdrantClient not initialized");
      return;
    }
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === config.QDRANT_COLLECTION);
    
    if (!exists) {
      console.log(`Collection ${config.QDRANT_COLLECTION} does not exist. Creating...`);
      await qdrantClient.createCollection(config.QDRANT_COLLECTION, {
        vectors: {
          size: config.VECTOR_DIM,
          distance: 'Cosine'
        }
      });
      console.log(`Created collection ${config.QDRANT_COLLECTION}`);
      
      // Create payload index
      await qdrantClient.createPayloadIndex(config.QDRANT_COLLECTION, {
        field_name: 'document_id',
        field_schema: 'keyword',
      });
      console.log(`Created payload index on document_id`);
    } else {
      console.log(`Collection ${config.QDRANT_COLLECTION} already exists.`);
    }
  } catch (error) {
    console.error("Error ensuring collection:", error);
  }
}

function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let index = 0;
  
  if (!text || text.trim().length === 0) return chunks;
  
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      let breakPoint = text.lastIndexOf('\n\n', end);
      if (breakPoint <= start) {
        breakPoint = text.lastIndexOf('. ', end);
      }
      if (breakPoint > start) {
        end = breakPoint + 1; // Include period
      }
    }
    
    chunks.push({
      text: text.slice(start, end).trim(),
      index: index++
    });
    
    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= end) start = end;
  }
  
  return chunks;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function embedTexts(texts) {
  const embeddings = [];
  
  for (const text of texts) {
    let success = false;
    let retries = 3;
    let delay = 1000;
    
    while (!success && retries > 0) {
      try {
        const response = await genai.models.embedContent({
          model: config.EMBEDDING_MODEL,
          contents: text,
        });
        // Assuming values might be directly accessible or via embeddings array depending on genai response structure.
        // Based on typical schema for Google GenAI:
        const values = response.embeddings[0].values;
        embeddings.push(values);
        success = true;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to embed text after retries:", error);
          throw error;
        }
        console.warn(`Rate limit or error embedding. Retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2; 
      }
    }
  }
  
  return embeddings;
}

async function ingestPDF(buffer, filename) {
  console.log(`Ingesting PDF: ${filename}`);
  const docId = uuidv4();
  
  let pageCounter = 1;
  const pageTexts = [];
  
  const render_page = function(pageData) {
    let render_options = { normalizeWhitespace: false, disableCombineTextItems: false };
    return pageData.getTextContent(render_options)
    .then(function(textContent) {
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      pageTexts.push({ pageNum: pageCounter++, text: text });
      return text;
    });
  }

  const options = { pagerender: render_page };
  await pdfParse(buffer, options);
  
  if (pageTexts.length === 0) {
    console.warn("No text extracted from PDF");
    return { docId, filename, chunks: 0, pages: 0 };
  }

  let totalChunks = 0;
  const allPoints = [];

  for (const { pageNum, text } of pageTexts) {
    const chunks = chunkText(text, config.CHUNK_SIZE, config.CHUNK_OVERLAP);
    if (chunks.length === 0) continue;
    
    console.log(`Page ${pageNum}: created ${chunks.length} chunks`);
    const textsToEmbed = chunks.map(c => c.text);
    
    const embeddings = await embedTexts(textsToEmbed);
    
    for (let i = 0; i < chunks.length; i++) {
      allPoints.push({
        id: uuidv4(),
        vector: embeddings[i],
        payload: {
          text_content: chunks[i].text,
          page_number: pageNum,
          chunk_index: chunks[i].index,
          document_id: docId,
          filename: filename
        }
      });
      totalChunks++;
    }
  }

  const batchSize = 100;
  for (let i = 0; i < allPoints.length; i += batchSize) {
    const batch = allPoints.slice(i, i + batchSize);
    await qdrantClient.upsert(config.QDRANT_COLLECTION, {
      wait: true,
      points: batch
    });
    console.log(`Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} points)`);
  }

  console.log(`Successfully ingested ${filename}: ${totalChunks} chunks across ${pageCounter - 1} pages`);
  return { docId, filename, chunks: totalChunks, pages: pageCounter - 1 };
}

async function deleteDocumentVectors(docId) {
  console.log(`Deleting vectors for document: ${docId}`);
  await qdrantClient.delete(config.QDRANT_COLLECTION, {
    wait: true,
    filter: {
      must: [
        {
          key: 'document_id',
          match: {
            value: docId
          }
        }
      ]
    }
  });
  console.log(`Successfully deleted vectors for ${docId}`);
}

module.exports = { ensureCollection, chunkText, embedTexts, ingestPDF, deleteDocumentVectors };
