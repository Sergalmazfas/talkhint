
const express = require("express");
const http = require('http');
const cors = require("cors");
const { corsMiddleware, corsOptions } = require('./middleware/cors');
const apiRoutes = require('./routes/api');
const testRoutes = require('./routes/test');

// Create Express app
const app = express();

// Apply CORS middleware
app.use(corsMiddleware);

// Use cors middleware for basic support
app.use(cors(corsOptions));

// Parse JSON in request body
app.use(express.json());

// Log all request body for debugging
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`Request body for ${req.url}:`, JSON.stringify(req.body, null, 2));
  }
  
  // Log response headers for CORS debugging
  const originalSend = res.send;
  res.send = function(...args) {
    console.log('Response headers:', JSON.stringify({
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers'),
      'content-type': res.getHeader('Content-Type')
    }, null, 2));
    return originalSend.apply(res, args);
  };
  
  next();
});

// Register routes
app.use('/api', apiRoutes);
app.use('/', testRoutes);

// Define port for HTTP server
const PORT = process.env.PORT || 3000;

// Function to start server
function startServer() {
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`CORS enabled for:`, require('./middleware/cors').ALLOWED_ORIGINS);
  });
  return httpServer;
}

module.exports = { app, startServer };
