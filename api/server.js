import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeWebsites } from '../dist/lib/scraper.js';
import cors from 'cors';

const app = express();

// Allow requests from your Netlify frontend
app.use(cors({
  origin: 'https://jtreehrealth-crawler.netlify.app',
  methods: ['GET', 'POST'],
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err instanceof Error ? err.message : 'An unknown error occurred',
    timestamp: new Date().toISOString()
  });
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.post('/api/scrape', async (req, res) => {
  try {
    const { urls, keywords, checkInsurance = true } = req.body;
    
    if (!urls || !keywords || !Array.isArray(urls) || !Array.isArray(keywords)) {
      return res.status(400).json({ 
        error: 'Invalid request body. Expected urls and keywords arrays.',
        timestamp: new Date().toISOString()
      });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const results = await analyzeWebsites({
      urls,
      keywords,
      checkInsurance,
      onProgress: (progress) => {
        const percentage = Math.round(progress * 100);
        res.write(`Progress: ${percentage}%\n`);
      }
    });

    // Send the final results on a new line
    res.write('\n' + JSON.stringify(results) + '\n');
    res.end();
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;

try {
  const server = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
