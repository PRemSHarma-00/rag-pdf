const express = require('express');
const multer = require('multer');
const { ingestPDF, deleteDocumentVectors } = require('../rag/ingest');
const { searchDocuments } = require('../rag/retrieve');
const { generateAnswer } = require('../rag/generate');
const { qdrantClient, config } = require('../config');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const { listDocuments } = require('../rag/vectorStore');

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    
    console.log(`Upload started for file: ${req.file.originalname}`);
    const result = await ingestPDF(req.file.buffer, req.file.originalname);
    
    res.json({ success: true, document: { id: result.docId, filename: result.filename, chunks: result.chunks, pages: result.pages } });
  } catch (error) {
    console.error("Error in /upload:", error);
    res.status(500).json({ error: error.message || 'Failed to process PDF' });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const documents = await listDocuments();
    res.json({ documents });
  } catch (error) {
    console.error("Error in /documents:", error);
    res.status(500).json({ error: error.message || 'Failed to fetch documents' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    await deleteDocumentVectors(docId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /documents:", error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const contexts = await searchDocuments(query);
    
    req.on('close', () => {
      console.log('Client disconnected from SSE');
    });

    try {
      const generator = generateAnswer(query, contexts);
      for await (const data of generator) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (genError) {
      console.error("Error generating answer:", genError);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate answer' })}\n\n`);
    }
    
    res.end();
  } catch (error) {
    console.error("Error in /chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
