import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeWebsites } from '../dist/lib/scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS: Allow requests from your Netlify frontend
app.use(cors({
  origin: 'https://jtreehrealth-crawler.netlify.app',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '50mb' }));

// Health check route (optional, but useful)
app.get('/', (req, res) => {
  res.send('✅ Backend is running at /api/scrape');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err instanceof Error ? err.message : 'An unknown error occurred',
    timestamp: new Date().toISOString()
  });
});

// Request logging
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

// ✅ Listen on 0.0.0.0 so Render can detect the port
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
