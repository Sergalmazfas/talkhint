
const express = require("express");
const router = express.Router();
const { chatHandler } = require('../handlers/chat');
const { openAiProxyHandler } = require('../handlers/openai');

// Simple chat endpoint
router.post("/chat", chatHandler);

// Proxy route for OpenAI API
router.post("/openai/chat/completions", openAiProxyHandler);

// Test endpoint for OpenAI API proxy
router.get("/openai/health", (req, res) => {
  const { ALLOWED_ORIGINS } = require('../middleware/cors');
  
  res.json({ 
    status: "ok", 
    message: "OpenAI proxy server is running",
    timestamp: new Date().toISOString(),
    clientOrigin: req.headers.origin || "Unknown",
    cors: "enabled",
    allowedOrigins: ALLOWED_ORIGINS
  });
});

module.exports = router;
