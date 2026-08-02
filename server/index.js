const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const apiRoutes = require('./routes/api');
const { ensureCollection } = require('./rag/ingest');

const app = express();

app.use(cors({
  origin: config.CORS_ORIGINS
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
  try {
    console.log("Initializing Qdrant collection...");
    await ensureCollection();
    
    app.listen(config.PORT, () => {
      console.log(`Server listening on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
