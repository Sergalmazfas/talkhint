
const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");

// Расширенная конфигурация CORS для разрешения запросов с lovable.dev и gptengineer.app
app.use(cors({
    origin: [
        'https://lovable.dev', 
        'https://gptengineer.app', 
        'http://localhost:8080', 
        'http://localhost:5173', 
        'http://localhost:3000'
    ],
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true
}));

// Обработка preflight OPTIONS запросов
app.options('*', cors());

// Парсинг JSON в теле запроса
app.use(express.json());

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`);
    next();
});

// Simple chat endpoint
app.post("/api/chat", (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        // Простой ответ для тестирования
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

// Прокси-маршрут для OpenAI API
app.post("/api/openai/chat/completions", async (req, res) => {
    try {
        const apiKey = req.headers.authorization?.split(" ")[1] || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }
        
        console.log(`Forwarding request to OpenAI API with ${req.body.messages?.length || 0} messages`);
        
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            req.body,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                timeout: 60000 // 60 секунд таймаут
            }
        );
        
        console.log(`Response received from OpenAI API with status ${response.status}`);
        res.json(response.data);
    } catch (error) {
        console.error("Error proxying to OpenAI:", error.response?.data || error.message);
        
        if (error.response) {
            // Передаем оригинальный ответ об ошибке от OpenAI
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: "Error processing request", message: error.message });
        }
    }
});

// Проверка здоровья системы
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        allowedOrigins: [
            'https://lovable.dev', 
            'https://gptengineer.app', 
            'http://localhost:8080', 
            'http://localhost:5173', 
            'http://localhost:3000'
        ]
    });
});

// Проверка доступности прокси OpenAI API
app.get("/api/openai/health", (req, res) => {
    res.json({ 
        status: "ok", 
        message: "OpenAI proxy server is running",
        timestamp: new Date().toISOString(),
        cors: "enabled",
        allowedOrigins: [
            'https://lovable.dev', 
            'https://gptengineer.app', 
            'http://localhost:8080', 
            'http://localhost:5173', 
            'http://localhost:3000'
        ]
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`CORS enabled for: https://lovable.dev, https://gptengineer.app, http://localhost:8080, http://localhost:5173, http://localhost:3000`);
});

// Обработка ошибок для предотвращения падения сервера
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
