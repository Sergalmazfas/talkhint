const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");

// CORS configuration with more permissive settings
app.use(cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Parse JSON request body
app.use(express.json());

// New simple chat endpoint
app.post("/api/chat", (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        // Simple echo response for testing
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

// Proxy route for OpenAI API with improved error handling
app.post("/api/openai/chat/completions", async (req, res) => {
    try {
        const apiKey = req.headers.authorization?.split(" ")[1] || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }
        
        console.log(`[${new Date().toISOString()}] Proxying request to OpenAI API`);
        
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            req.body,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                timeout: 30000 // 30 seconds timeout
            }
        );
        
        console.log(`[${new Date().toISOString()}] OpenAI API response received`);
        res.json(response.data);
    } catch (error) {
        console.error("Error proxying to OpenAI:", error.response?.data || error.message);
        
        // Enhanced error reporting
        if (error.response) {
            // Forward OpenAI's error response with additional context
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            console.error(`[${new Date().toISOString()}] OpenAI API error: ${statusCode}`, errorData);
            res.status(statusCode).json({
                error: "OpenAI API error",
                details: errorData,
                timestamp: new Date().toISOString()
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout error
            console.error(`[${new Date().toISOString()}] Request to OpenAI timed out`);
            res.status(504).json({ 
                error: "Gateway Timeout", 
                message: "Request to OpenAI API timed out", 
                timestamp: new Date().toISOString() 
            });
        } else {
            // Other errors
            console.error(`[${new Date().toISOString()}] Server error:`, error.message);
            res.status(500).json({ 
                error: "Error processing request", 
                message: error.message,
                timestamp: new Date().toISOString() 
            });
        }
    }
});

// Health check endpoint with enhanced information
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        service: "OpenAI proxy server",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// OpenAI API health check
app.get("/api/openai/health", async (req, res) => {
    try {
        // Try to make a lightweight request to OpenAI API
        await axios.get("https://api.openai.com/v1/models", {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY || "sk_test"}`
            },
            timeout: 5000
        });
        
        res.json({ 
            status: "ok", 
            message: "OpenAI API is reachable", 
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error("Error checking OpenAI API health:", error.message);
        res.status(503).json({ 
            status: "error", 
            message: "OpenAI API may be unreachable", 
            details: error.message,
            timestamp: new Date().toISOString() 
        });
    }
});

// Catch-all for other routes
app.all("*", (req, res) => {
    res.status(404).json({ 
        error: "Route not found", 
        path: req.path,
        timestamp: new Date().toISOString() 
    });
});

// Setup for both local development and Vercel
const PORT = process.env.PORT || 3000;

// Check if we're not in a serverless environment (like Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] Server is running on port ${PORT}`);
    });
}

// Export for serverless environments
module.exports = app;
