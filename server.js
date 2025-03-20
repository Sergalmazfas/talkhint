
const cors = require("cors");
const express = require("express");
const app = express();
const axios = require("axios");
const fs = require('fs');
const http = require('http');
const https = require('https');

// Расширенная конфигурация CORS для разрешения запросов с различных доменов
const ALLOWED_ORIGINS = [
    'https://lovable.dev', 
    'https://gptengineer.app',
    'https://gptengineer.io',
    'http://localhost:8080', 
    'https://localhost:8080',
    'http://localhost:5173', 
    'https://localhost:5173',
    'http://localhost:3000',
    'https://localhost:3000'
];

// Middleware для проверки origin и настройки CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Лог всех запросов с их origin
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${origin || 'unknown'}`);
    
    // Разрешаем localhost в режиме разработки
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && (origin?.includes('localhost') || !origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        next();
        return;
    }
    
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
        
        // Разрешаем localhost в режиме разработки
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment && origin.includes('localhost')) {
            return callback(null, true);
        }
        
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

// Endpoint для тестирования postMessage
app.get("/postmessage-test", (req, res) => {
    // Отправляем HTML страницу с JavaScript для тестирования postMessage
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>PostMessage Test</title>
        <script>
            // Настраиваем обработчик для приема сообщений
            window.addEventListener('message', (event) => {
                const allowedOrigins = [
                    'https://lovable.dev', 
                    'https://gptengineer.app',
                    'http://localhost:3000',
                    'https://localhost:3000',
                    'http://localhost:8080',
                    'https://localhost:8080',
                    'http://localhost:5173',
                    'https://localhost:5173'
                ];
                
                // В режиме разработки принимаем любые сообщения
                const isDevelopment = window.location.hostname === 'localhost';
                
                if (isDevelopment || allowedOrigins.includes(event.origin)) {
                    console.log('Received message:', event.data);
                    
                    // Отвечаем на сообщение
                    if (event.source) {
                        event.source.postMessage({
                            type: 'RESPONSE',
                            receivedData: event.data,
                            from: window.location.origin,
                            timestamp: new Date().toISOString()
                        }, event.origin);
                        console.log('Responded to:', event.origin);
                    }
                } else {
                    console.warn('Received message from non-allowed origin:', event.origin);
                }
            });
            
            // Отправляем сообщение родительскому окну при загрузке
            window.addEventListener('load', () => {
                try {
                    window.parent.postMessage({
                        type: 'IFRAME_LOADED',
                        from: window.location.origin,
                        timestamp: new Date().toISOString()
                    }, '*');
                    console.log('Sent IFRAME_LOADED message to parent');
                    
                    // Пробуем отправить на конкретные домены
                    const knownOrigins = [
                        'https://lovable.dev', 
                        'https://gptengineer.app',
                        'http://localhost:3000',
                        'https://localhost:3000',
                        'http://localhost:8080',
                        'http://localhost:5173'
                    ];
                    
                    // Находим origin из referrer, если доступен
                    let referrerOrigin = null;
                    if (document.referrer) {
                        try {
                            referrerOrigin = new URL(document.referrer).origin;
                            console.log('Detected referrer origin:', referrerOrigin);
                        } catch (e) {
                            console.warn('Failed to parse referrer:', e);
                        }
                    }
                    
                    // Если referrer найден, отправляем ему сообщение
                    if (referrerOrigin) {
                        window.parent.postMessage({
                            type: 'IFRAME_LOADED',
                            from: window.location.origin,
                            timestamp: new Date().toISOString(),
                            target: 'referrer'
                        }, referrerOrigin);
                        console.log('Sent IFRAME_LOADED message to referrer:', referrerOrigin);
                    }
                    
                    // Отправляем на все известные домены
                    knownOrigins.forEach(origin => {
                        try {
                            window.parent.postMessage({
                                type: 'IFRAME_LOADED',
                                from: window.location.origin,
                                timestamp: new Date().toISOString(),
                                target: origin
                            }, origin);
                            console.log('Sent IFRAME_LOADED message to:', origin);
                        } catch (e) {
                            console.warn('Failed to send to:', origin, e);
                        }
                    });
                } catch (e) {
                    console.error('Error sending postMessage:', e);
                }
            });
        </script>
    </head>
    <body>
        <h1>PostMessage Test Page</h1>
        <p>This page is ready to receive and respond to postMessage events.</p>
        <p>Origin: <code>${req.headers.origin || 'Unknown'}</code></p>
        <div id="messages"></div>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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

// Обработчик для iframe-bridge.js
app.get("/iframe-bridge.js", (req, res) => {
    fs.readFile('public/iframe-bridge.js', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading iframe-bridge.js:', err);
            return res.status(500).send('Error loading iframe-bridge.js');
        }
        res.setHeader('Content-Type', 'application/javascript');
        res.send(data);
    });
});

// Определяем порт для HTTP-сервера
const PORT = process.env.PORT || 3000;

// Функция для запуска HTTP-сервера
function startHttpServer() {
    const httpServer = http.createServer(app);
    httpServer.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
        console.log(`CORS enabled for:`, ALLOWED_ORIGINS);
    });
}

// Функция для запуска HTTPS-сервера (если есть сертификаты)
function startHttpsServer() {
    try {
        // Проверяем наличие SSL-сертификатов
        if (fs.existsSync('./ssl/key.pem') && fs.existsSync('./ssl/cert.pem')) {
            const options = {
                key: fs.readFileSync('./ssl/key.pem'),
                cert: fs.readFileSync('./ssl/cert.pem')
            };
            
            const httpsServer = https.createServer(options, app);
            const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
            
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
                console.log(`CORS enabled for:`, ALLOWED_ORIGINS);
            });
            
            return true;
        }
        return false;
    } catch (error) {
        console.warn('Failed to start HTTPS server:', error.message);
        return false;
    }
}

// Запуск серверов
startHttpServer();
const httpsStarted = startHttpsServer();
if (!httpsStarted) {
    console.log('HTTPS server not started. Create SSL certificates to enable HTTPS.');
    console.log('For local development, you can use: openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes');
}

// Обработка ошибок для предотвращения падения сервера
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
