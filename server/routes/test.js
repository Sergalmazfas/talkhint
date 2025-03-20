
const express = require("express");
const router = express.Router();
const { postMessageTestHandler } = require('../handlers/postMessage');

// Endpoint for testing CORS
router.get("/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS Test Successful",
    yourOrigin: req.headers.origin || "Unknown",
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// Health check endpoint
router.get("/health", (req, res) => {
  const { ALLOWED_ORIGINS } = require('../middleware/cors');
  
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    clientOrigin: req.headers.origin || "Unknown",
    allowedOrigins: ALLOWED_ORIGINS,
    corsHeaders: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// Endpoint for postMessage test page
router.get("/postmessage-test", postMessageTestHandler);

module.exports = router;
