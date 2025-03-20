
const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");

// Расширенная конфигурация CORS для разрешения запросов с различных доменов
const ALLOWED_ORIGINS = [
    'https://lovable.dev', 
    'https://gptengineer.app',
    'https://gptengineer.io',
    'http://localhost:8080', 
    'http://localhost:5173', 
    'http://localhost:3000'
];

// Middleware для проверки origin и настройки CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Лог всех запросов с их origin
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${origin || 'unknown'}`);
    
    // Проверяем, разрешен ли origin
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Обработка preflight запросов OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Дополнительно используем cors middleware для базовой поддержки
app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем запросы без origin (например, от Postman)
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.includes(origin)) {
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

// Парсинг JSON в теле запроса
app.use(express.json());

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

// Endpoint для тестирования CORS
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

// Проверка здоровья системы
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

// Проверка доступности прокси OpenAI API
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`CORS enabled for:`, ALLOWED_ORIGINS);
});

// Обработка ошибок для предотвращения падения сервера
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
