
const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");
const fs = require('fs');
const http = require('http');
const https = require('https');

// Extended CORS configuration to allow requests from various domains
const ALLOWED_ORIGINS = [
    'https://lovable.dev', 
    'https://www.lovable.dev', 
    'http://lovable.dev',
    'http://www.lovable.dev',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app',
    'https://id-preview--be5c3e65-2457-46cb-a8e0-02444f6fdcc1.lovable.app:3000',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'http://gptengineer.app',
    'http://www.gptengineer.app',
    'https://gptengineer.io',
    'https://www.gptengineer.io',
    'http://gptengineer.io',
    'http://www.gptengineer.io',
    'http://localhost:8080', 
    'https://localhost:8080',
    'http://localhost:5173', 
    'https://localhost:5173',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost',
    'https://localhost',
    'https://lovable-server.vercel.app',
    'http://lovable-server.vercel.app',
    '*' // Allow all origins during development, will be filtered in production
];

// Middleware to check origin and configure CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Log all requests with their origin
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${origin || 'unknown'}`);
    
    // Always set CORS headers - This is important for browsers to accept responses
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Set X-Frame-Options for iframe embedding
    res.setHeader('X-Frame-Options', 'ALLOW-FROM https://lovable.dev https://gptengineer.app http://localhost:3000');
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Use cors middleware for basic support
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests without origin (e.g., from Postman)
        if (!origin) return callback(null, true);
        
        // Allow localhost in development mode
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        // Normalize origin for comparison
        const normalizeOrigin = (url) => {
            if (!url) return '';
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '');
        };
        
        // Check if origin is allowed, including www/non-www variants
        const normalizedRequestOrigin = normalizeOrigin(origin);
        const isAllowed = ALLOWED_ORIGINS.some(allowed => 
            normalizeOrigin(allowed) === normalizedRequestOrigin || 
            normalizedRequestOrigin.includes('lovable.app') ||
            normalizedRequestOrigin.includes('gptengineer.app') ||
            normalizedRequestOrigin.includes('lovable-server.vercel.app')
        );
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true
}));

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

// Simple chat endpoint
app.post("/api/chat", (req, res) => {
    try {
        const { message } = req.body;
        console.log("Chat request received:", message);
        console.log("Authorization header:", req.headers.authorization);
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        // Simple test response
        res.json({ 
            success: true, 
            received: message,
            response: `Server received: "${message}"`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error processing chat request:", error.message);
        res.status(500).json({ error: "Error processing request", message: error.message });
    }
});

// Proxy route for OpenAI API
app.post("/api/openai/chat/completions", async (req, res) => {
    try {
        // Get API key from request or env
        const apiKey = req.headers.authorization?.split(" ")[1] || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }
        
        console.log(`Forwarding request to OpenAI API with ${req.body.messages?.length || 0} messages`);
        
        // Log API key for debugging (mask it for security)
        const maskedKey = apiKey.substring(0, 5) + '***' + apiKey.substring(apiKey.length - 4);
        console.log(`Using API key: ${maskedKey}`);
        
        // Prepare OpenAI API request
        try {
            // Log complete headers we're sending to OpenAI
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            };
            console.log("Headers being sent to OpenAI:", JSON.stringify(headers, (key, value) => {
                if (key === 'Authorization') return 'Bearer sk-***';
                return value;
            }, 2));
            
            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                req.body,
                {
                    headers,
                    timeout: 60000 // 60 second timeout
                }
            );
            
            console.log(`Response received from OpenAI API with status ${response.status}`);
            res.json(response.data);
        } catch (apiError) {
            console.error("Error from OpenAI API:", apiError.message);
            if (apiError.response) {
                console.error("API error details:", apiError.response.data);
                res.status(apiError.response.status).json(apiError.response.data);
            } else {
                res.status(500).json({ 
                    error: "Error calling OpenAI API", 
                    message: apiError.message,
                    stack: apiError.stack 
                });
            }
        }
    } catch (error) {
        console.error("Error proxying to OpenAI:", error.message);
        res.status(500).json({ error: "Error processing request", message: error.message });
    }
});

// Endpoint for testing CORS
app.get("/cors-test", (req, res) => {
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
app.get("/health", (req, res) => {
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

// Test endpoint for OpenAI API proxy
app.get("/api/openai/health", (req, res) => {
    res.json({ 
        status: "ok", 
        message: "OpenAI proxy server is running",
        timestamp: new Date().toISOString(),
        clientOrigin: req.headers.origin || "Unknown",
        cors: "enabled",
        allowedOrigins: ALLOWED_ORIGINS
    });
});

// Endpoint for postMessage test page
app.get("/postmessage-test", (req, res) => {
    // Send HTML page with JavaScript for testing postMessage
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>PostMessage Test</title>
        <script>
            // Set up handler to receive messages
            window.addEventListener('message', (event) => {
                // In development mode, accept any messages
                const isDevelopment = true; // Always accept for testing
                
                console.log('Received message from ' + event.origin + ':', event.data);
                document.getElementById('messages').innerHTML += 
                    '<div><strong>From:</strong> ' + event.origin + 
                    '<br><pre>' + JSON.stringify(event.data, null, 2) + '</pre></div>';
                
                // Respond to message
                if (event.source) {
                    try {
                        // First try with wildcard (most reliable for testing)
                        event.source.postMessage({
                            type: 'RESPONSE',
                            receivedData: event.data,
                            from: window.location.origin,
                            timestamp: new Date().toISOString(),
                            note: 'Using wildcard origin'
                        }, '*');
                        console.log('Responded using wildcard origin');
                        
                        // Also try with specific origin
                        event.source.postMessage({
                            type: 'RESPONSE',
                            receivedData: event.data,
                            from: window.location.origin,
                            timestamp: new Date().toISOString()
                        }, event.origin);
                        console.log('Responded to:', event.origin);
                    } catch (e) {
                        console.error('Response attempt failed:', e);
                    }
                }
            });
            
            // Send message to parent window on load
            window.addEventListener('load', () => {
                try {
                    // Debug info
                    document.getElementById('debug').innerHTML = 
                        '<div>URL: ' + window.location.href + '</div>' +
                        '<div>Origin: ' + window.location.origin + '</div>' +
                        '<div>Protocol: ' + window.location.protocol + '</div>' +
                        '<div>Referrer: ' + document.referrer + '</div>';
                    
                    // Ready message
                    const readyMessage = {
                        type: 'IFRAME_LOADED',
                        from: window.location.origin,
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        referrer: document.referrer
                    };
                    
                    // Try wildcard first (most reliable)
                    window.parent.postMessage(readyMessage, '*');
                    console.log('Sent IFRAME_LOADED message using wildcard origin');
                    
                    // Also try specific parent if available
                    if (document.referrer) {
                        try {
                            const parentOrigin = new URL(document.referrer).origin;
                            window.parent.postMessage(readyMessage, parentOrigin);
                            console.log('Sent IFRAME_LOADED message to referrer:', parentOrigin);
                        } catch (e) {
                            console.warn('Failed to send to referrer:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error in load handler:', e);
                    document.getElementById('errors').innerHTML += 
                        '<div>' + e.toString() + '</div>';
                }
            });
        </script>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            pre { background: #f0f0f0; padding: 10px; border-radius: 5px; overflow: auto; }
            #messages div { 
                margin-bottom: 10px; 
                padding: 10px; 
                border: 1px solid #ddd; 
                border-radius: 5px; 
                background: #e8f5e9;
            }
            #debug { background: #fff3e0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            h3 { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>PostMessage Test Page</h1>
        <p>This page tests cross-origin communication with postMessage.</p>
        
        <div id="debug"></div>
        
        <h3>Received Messages:</h3>
        <div id="messages"></div>
        
        <h3>Errors:</h3>
        <div id="errors"></div>
        
        <button onclick="window.parent.postMessage({type: 'TEST', time: new Date().toISOString()}, '*')">
            Send Test Message to Parent
        </button>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Define port for HTTP server
const PORT = process.env.PORT || 3000;

// Start HTTP server
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`CORS enabled for:`, ALLOWED_ORIGINS);
});

// Handle errors for preventing server crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
