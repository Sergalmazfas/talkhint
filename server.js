import cors from "cors";
import express from "express";
import axios from "axios";

const app = express();

// Enhanced CORS configuration with more comprehensive domain support
const allowedOrigins = [
    'https://lovable.dev',
    'https://www.lovable.dev',
    'https://*.lovable.dev',     // Wildcard for lovable.dev subdomains
    'http://localhost:3000',
    'http://localhost:5173',     // Vite default dev port
    'https://talkhint-sergs-projects-149ff317.vercel.app',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'https://auth.getengineer.app',
    /\.vercel\.app$/,            // Allow all vercel.app subdomains
    /\.lovable\.dev$/,           // Allow all lovable.dev subdomains
    /\.lovable\.app$/,           // Allow all lovable.app subdomains
    /\.getengineer\.app$/        // Allow all getengineer.app subdomains
];

// Comprehensive CORS middleware with improved error handling
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin) return callback(null, true);
        
        // Check if origin matches allowed patterns
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return allowedOrigin === origin;
        });
        
        if (isAllowed) {
            console.log(`[${new Date().toISOString()}] CORS allowed request from: ${origin}`);
            callback(null, true);
        } else {
            console.log(`[${new Date().toISOString()}] CORS blocked request from: ${origin}`);
            
            // In production, be strict about origins but provide detailed error
            if (process.env.NODE_ENV === 'production') {
                callback(new Error(`Origin ${origin} not allowed by CORS policy`));
            } else {
                // In development, allow all origins but log a warning
                console.log(`[${new Date().toISOString()}] WARNING: Allowing request from non-whitelisted origin in development mode`);
                callback(null, true);
            }
        }
    },
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-Auth-Token"],
    exposedHeaders: ["Content-Length", "X-Request-Id"],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Add security headers
app.use((req, res, next) => {
    // Configure Content-Security-Policy to allow necessary resources including lovable.dev
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' https://cdn.gpteng.co https://www.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com 'unsafe-inline' 'unsafe-eval'; " +
        "frame-src 'self' https://lovable.app https://*.lovable.app https://auth.getengineer.app https://www.youtube.com https://*.google.com https://*.doubleclick.net; " +
        "connect-src 'self' https://api.openai.com https://lovable.dev https://*.lovable.dev https://*.lovable.app https://gptengineer.app https://*.vercel.app https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; " +
        "img-src 'self' data: https: blob:; " +
        "style-src 'self' 'unsafe-inline' https://tagmanager.google.com https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://gptengineer.app https://*.lovable.app https://*.vercel.app https://*.getengineer.app;"
    );
    
    // Allow frames from specific domains including lovable.dev
    res.setHeader('X-Frame-Options', 'ALLOW-FROM https://lovable.dev https://auth.getengineer.app https://gptengineer.app https://*.lovable.app');
    
    // Explicitly set CORS headers for all responses to ensure they are applied consistently
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    next();
});

// Parse JSON request body
app.use(express.json());

// Simple health check endpoint for Vercel
app.get("/api", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        message: "OpenAI proxy server is running",
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'unknown',
        headers: req.headers,
        cors: "enabled",
        serverOnly: "enabled",
        apiKeyStatus: process.env.OPENAI_API_KEY ? "set" : "not set"
    });
});

// Simple chat endpoint with better error handling
app.post("/api/chat", (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        console.log(`[${new Date().toISOString()}] Chat request received: ${message.substring(0, 30)}...`);
        
        // Echo response for testing, with timestamp for debugging
        res.json({ 
            success: true, 
            received: message,
            response: `Server received: "${message}"`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing chat request:`, error.message);
        res.status(500).json({ error: "Error processing request", message: error.message });
    }
});

// Proxy route for OpenAI API with improved error handling and environment variable support
app.post("/api/openai/chat/completions", async (req, res) => {
    try {
        // Get API key from environment variable - server-only mode prioritizes this
        let apiKey = process.env.OPENAI_API_KEY || '';
        const authHeader = req.headers.authorization;
        
        // Detailed logging of API key source and format (FOR DEBUGGING ONLY - REMOVE IN PRODUCTION!)
        console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Server-only mode: Using server's API key first`);
        console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Environment API key exists: ${!!process.env.OPENAI_API_KEY}`);
        
        // Check if we have an API key in the environment
        if (!apiKey || apiKey.trim() === '') {
            console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] No API key in environment, checking request headers`);
            
            // If no environment key, try to use from request headers as fallback
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const headerKey = authHeader.substring(7); // Remove 'Bearer ' prefix
                if (headerKey && headerKey.trim() !== 'null' && headerKey !== 'undefined') {
                    if (headerKey.trim().startsWith('sk-')) {
                        apiKey = headerKey.trim();
                        console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Falling back to API key from request header: ${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`);
                    } else {
                        console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Invalid API key format in header: "${headerKey.substring(0, 3)}..."`);
                    }
                }
            }
        } else {
            console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Using API key from environment: ${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`);
        }
        
        // Validate API key
        if (!apiKey || apiKey.trim() === '') {
            console.error(`[${new Date().toISOString()}] [API_KEY_DEBUG] API key missing in both server environment and request`);
            return res.status(401).json({ 
                error: "API key is required", 
                message: "No valid API key provided in server environment or request",
                details: "Please set OPENAI_API_KEY in your server environment variables",
                timestamp: new Date().toISOString()
            });
        }
        
        if (!apiKey.trim().startsWith('sk-')) {
            console.error(`[${new Date().toISOString()}] [API_KEY_DEBUG] Invalid API key format: ${apiKey.substring(0, 3)}...`);
            return res.status(401).json({
                error: "Invalid API key format",
                message: "API key must start with 'sk-'",
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`[${new Date().toISOString()}] [API_KEY_DEBUG] Proxying request to OpenAI API with valid API key: ${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`);
        console.log(`[${new Date().toISOString()}] Origin: ${req.headers.origin || 'unknown'}`);
        
        // Make request to OpenAI API
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
        
        console.log(`[${new Date().toISOString()}] OpenAI API response received successfully`);
        
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error proxying to OpenAI:`, error.response?.data || error.message);
        
        // Enhanced error reporting with full error details
        console.error(`[${new Date().toISOString()}] Full error object:`, error);
        
        // Enhanced error reporting
        if (error.response) {
            // Forward OpenAI's error response with additional context
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            console.error(`[${new Date().toISOString()}] OpenAI API error: ${statusCode}`, errorData);
            res.status(statusCode).json({
                error: "OpenAI API error",
                details: errorData,
                timestamp: new Date().toISOString(),
                origin: req.headers.origin || 'unknown'
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout error
            console.error(`[${new Date().toISOString()}] Request to OpenAI timed out`);
            res.status(504).json({ 
                error: "Gateway Timeout", 
                message: "Request to OpenAI API timed out", 
                timestamp: new Date().toISOString(),
                origin: req.headers.origin || 'unknown'
            });
        } else {
            // Other errors
            console.error(`[${new Date().toISOString()}] Server error:`, error.message);
            res.status(500).json({ 
                error: "Error processing request", 
                message: error.message,
                timestamp: new Date().toISOString(),
                origin: req.headers.origin || 'unknown' 
            });
        }
    }
});

// Enhanced health check endpoint with more detailed information
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        service: "OpenAI proxy server",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        serverOnly: true,
        timestamp: new Date().toISOString(),
        headers: {
            origin: req.headers.origin || 'unknown',
            referer: req.headers.referer || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
        },
        cors: "enabled"
    });
});

// OpenAI API health check with CORS information
app.get("/api/openai/health", async (req, res) => {
    try {
        // Try to use the environment API key if available
        const apiKey = process.env.OPENAI_API_KEY || "sk_test";
        console.log(`[${new Date().toISOString()}] Checking OpenAI health with ${apiKey ? "valid" : "test"} API key`);
        console.log(`[${new Date().toISOString()}] Origin: ${req.headers.origin || 'unknown'}`);
        
        // Print the API key for debugging (WARNING: Only for debugging)
        console.log(`[${new Date().toISOString()}] Using API key for health check:`, apiKey);
        
        // Try to make a lightweight request to OpenAI API
        await axios.get("https://api.openai.com/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            timeout: 5000
        });
        
        res.json({ 
            status: "ok", 
            message: "OpenAI API is reachable", 
            timestamp: new Date().toISOString(),
            origin: req.headers.origin || 'unknown',
            cors: "enabled"
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking OpenAI API health:`, error.message);
        console.error(`[${new Date().toISOString()}] Full error:`, error);
        
        res.status(503).json({ 
            status: "error", 
            message: "OpenAI API may be unreachable", 
            details: error.message,
            timestamp: new Date().toISOString(),
            origin: req.headers.origin || 'unknown',
            cors: "enabled"
        });
    }
});

// Test endpoint that always succeeds
app.get("/api/test", (req, res) => {
    res.json({
        status: "ok",
        message: "Test endpoint working correctly",
        timestamp: new Date().toISOString(),
        clientInfo: {
            ip: req.ip,
            headers: req.headers
        }
    });
});

// Log all incoming API requests with more details
app.all("/api/*", (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.path}`);
    console.log(`[${new Date().toISOString()}] Origin: ${req.headers.origin || 'unknown'}`);
    console.log(`[${new Date().toISOString()}] User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
    next();
});

// Catch-all for other routes with detailed debugging information
app.all("*", (req, res) => {
    console.log(`[${new Date().toISOString()}] Unknown route requested: ${req.path}`);
    console.log(`[${new Date().toISOString()}] Origin: ${req.headers.origin || 'unknown'}`);
    console.log(`[${new Date().toISOString()}] Headers:`, req.headers);
    
    res.status(404).json({ 
        error: "Route not found", 
        path: req.path,
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'unknown',
        headers: req.headers,
        message: "If you're seeing this, make sure you're accessing the correct API endpoint"
    });
});

// Setup for both local development and Vercel
const PORT = process.env.PORT || 3000;

// Only start server if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] Server is running on port ${PORT}`);
    });
}

// Export for serverless environments - ES Module version
export default app;
