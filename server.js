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
    'https://localhost'
];

// Middleware to check origin and configure CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Log all requests with their origin
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${origin || 'unknown'}`);
    
    // Allow localhost in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && (origin?.includes('localhost') || !origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        next();
        return;
    }
    
    // Normalize origin for comparison (remove www. prefix and protocol)
    const normalizeOrigin = (url) => {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\d+$/, '');
    };
    
    // Check if origin is allowed, including www/non-www variants
    const normalizedRequestOrigin = normalizeOrigin(origin);
    const isAllowed = ALLOWED_ORIGINS.some(allowed => 
        normalizeOrigin(allowed) === normalizedRequestOrigin
    );
    
    // Set CORS headers if origin is allowed
    if (origin && isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
        console.warn(`Request from non-allowed origin: ${origin}`);
    }
    
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
            normalizeOrigin(allowed) === normalizedRequestOrigin
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

// Endpoint for testing postMessage
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
                // List all allowed origins explicitly for clarity
                const allowedOrigins = [
                    'https://lovable.dev', 
                    'https://www.lovable.dev',
                    'http://lovable.dev',
                    'http://www.lovable.dev',
                    'https://gptengineer.app',
                    'https://www.gptengineer.app',
                    'http://gptengineer.app',
                    'http://www.gptengineer.app',
                    'https://gptengineer.io',
                    'https://www.gptengineer.io',
                    'http://gptengineer.io',
                    'http://www.gptengineer.io',
                    'http://localhost:3000',
                    'https://localhost:3000',
                    'http://localhost:8080',
                    'https://localhost:8080',
                    'http://localhost:5173',
                    'https://localhost:5173',
                    'http://localhost',
                    'https://localhost'
                ];
                
                // In development mode, accept any messages
                const isDevelopment = window.location.hostname === 'localhost';
                
                // Normalize origin for comparison (remove protocol and www.)
                const normalizeOrigin = (url) => {
                    if (!url) return '';
                    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:\\d+$/, '');
                };
                
                // Check if origin is allowed
                const normalizedEventOrigin = normalizeOrigin(event.origin);
                const isAllowed = isDevelopment || allowedOrigins.some(allowed => 
                    normalizeOrigin(allowed) === normalizedEventOrigin
                );
                
                if (isAllowed) {
                    console.log('Received message from ' + event.origin + ':', event.data);
                    document.getElementById('messages').innerHTML += 
                        '<div><strong>From:</strong> ' + event.origin + 
                        '<br><pre>' + JSON.stringify(event.data, null, 2) + '</pre></div>';
                    
                    // Respond to message
                    if (event.source) {
                        try {
                            // First try specific origin
                            event.source.postMessage({
                                type: 'RESPONSE',
                                receivedData: event.data,
                                from: window.location.origin,
                                timestamp: new Date().toISOString()
                            }, event.origin);
                            console.log('Responded to:', event.origin);
                        } catch (e) {
                            console.warn('Failed to respond to specific origin:', e);
                            
                            // Try with wildcard as fallback
                            try {
                                event.source.postMessage({
                                    type: 'RESPONSE',
                                    receivedData: event.data,
                                    from: window.location.origin,
                                    timestamp: new Date().toISOString(),
                                    note: 'Using wildcard origin as fallback'
                                }, '*');
                                console.log('Responded using wildcard origin');
                            } catch (e2) {
                                console.error('All response attempts failed:', e2);
                            }
                        }
                    }
                } else {
                    console.warn('Received message from non-allowed origin:', event.origin);
                    document.getElementById('blocked').innerHTML += 
                        '<div><strong>Blocked from:</strong> ' + event.origin + '</div>';
                }
            });
            
            // Send message to parent window on load
            window.addEventListener('load', () => {
                try {
                    // Debug info in DOM
                    document.getElementById('debug').innerHTML = 
                        '<div>URL: ' + window.location.href + '</div>' +
                        '<div>Origin: ' + window.location.origin + '</div>' +
                        '<div>Protocol: ' + window.location.protocol + '</div>' +
                        '<div>Referrer: ' + document.referrer + '</div>';
                    
                    // First try to get parent origin from referrer
                    let parentOrigin = '*';
                    if (document.referrer) {
                        try {
                            parentOrigin = new URL(document.referrer).origin;
                            console.log('Detected parent origin from referrer:', parentOrigin);
                        } catch (e) {
                            console.warn('Failed to parse referrer:', e);
                        }
                    }
                    
                    // Ready message
                    const readyMessage = {
                        type: 'IFRAME_LOADED',
                        from: window.location.origin,
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        referrer: document.referrer
                    };
                    
                    // First try specific parent origin if available
                    if (parentOrigin !== '*') {
                        try {
                            window.parent.postMessage(readyMessage, parentOrigin);
                            console.log('Sent IFRAME_LOADED message to referrer:', parentOrigin);
                            document.getElementById('sent').innerHTML += 
                                '<div>Sent to: ' + parentOrigin + '</div>';
                        } catch (e) {
                            console.warn('Failed to send to referrer:', e);
                        }
                    }
                    
                    // Then try wildcard origin
                    try {
                        window.parent.postMessage({...readyMessage, note: 'Using wildcard origin'}, '*');
                        console.log('Sent IFRAME_LOADED message using wildcard origin');
                        document.getElementById('sent').innerHTML += 
                            '<div>Sent to: * (wildcard)</div>';
                    } catch (e) {
                        console.error('Failed to send with wildcard:', e);
                    }
                    
                    // Also try well-known domains
                    const knownDomains = [
                        'https://lovable.dev',
                        'https://gptengineer.app',
                        'http://localhost:3000',
                        'https://localhost:3000'
                    ];
                    
                    knownDomains.forEach(domain => {
                        if (domain !== parentOrigin) {
                            try {
                                window.parent.postMessage({
                                    ...readyMessage, 
                                    note: 'Broadcast to known domain',
                                    target: domain
                                }, domain);
                                console.log('Sent IFRAME_LOADED message to:', domain);
                                document.getElementById('sent').innerHTML += 
                                    '<div>Sent to: ' + domain + '</div>';
                            } catch (e) {
                                console.warn('Failed to send to:', domain);
                            }
                        }
                    });
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
            #messages div, #blocked div, #sent div { 
                margin-bottom: 10px; 
                padding: 10px; 
                border: 1px solid #ddd; 
                border-radius: 5px; 
            }
            #messages div { background: #e8f5e9; }
            #blocked div { background: #ffebee; }
            #sent div { background: #e3f2fd; }
            #debug { background: #fff3e0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            h3 { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>PostMessage Test Page</h1>
        <p>This page tests cross-origin communication with postMessage.</p>
        
        <div id="debug"></div>
        
        <h3>Sent Messages:</h3>
        <div id="sent"></div>
        
        <h3>Received Messages:</h3>
        <div id="messages"></div>
        
        <h3>Blocked Origins:</h3>
        <div id="blocked"></div>
        
        <h3>Errors:</h3>
        <div id="errors"></div>
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
