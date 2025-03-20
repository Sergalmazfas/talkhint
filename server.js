
const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");

// CORS configuration
app.use(cors({
    origin: ["https://lovable.dev", "http://localhost:3000"], // Разрешённые источники
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

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

// Proxy route for OpenAI API
app.post("/api/openai/chat/completions", async (req, res) => {
    try {
        const apiKey = req.headers.authorization?.split(" ")[1];
        
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }
        
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            req.body,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error("Error proxying to OpenAI:", error.response?.data || error.message);
        
        if (error.response) {
            // Forward OpenAI's error response
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: "Error processing request", message: error.message });
        }
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
