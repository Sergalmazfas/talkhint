import cors from "cors";
import express from "express";
import axios from "axios";

const app = express();

// Enhanced CORS configuration with more comprehensive domain support
const allowedOrigins = [
    'https://lovable.dev',
    'https://www.lovable.dev',
    'http://localhost:3000',
    'http://localhost:5173',  // Vite default dev port
    'https://talkhint-sergs-projects-149ff317.vercel.app',
    'https://gptengineer.app',
    'https://www.gptengineer.app',
    'https://auth.getengineer.app',
    /\.vercel\.app$/,         // Allow all vercel.app subdomains
    /\.lovable\.dev$/,        // Allow all lovable.dev subdomains
    /\.lovable\.app$/,        // Allow all lovable.app subdomains
    /\.getengineer\.app$/     // Allow all getengineer.app subdomains
];

// Comprehensive CORS middleware with detailed configuration
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
            callback(null, true);
        } else {
            console.log(`[${new Date().toISOString()}] CORS blocked request from: ${origin}`);
            
            // In production, be strict about origins
            if (process.env.NODE_ENV === 'production') {
                callback(new Error('Not allowed by CORS'));
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

// Add security headers with comprehensive CSP configuration
app.use((req, res, next) => {
    // Configure Content-Security-Policy to allow necessary resources
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
    
    // Allow frames from specific domains
    res.setHeader('X-Frame-Options', 'ALLOW-FROM https://lovable.dev https://auth.getengineer.app https://gptengineer.app https://*.lovable.app');
    
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
        timestamp: new Date().toISOString() 
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
        // First try to get API key from request headers, then from environment variable
        const authHeader = req.headers.authorization;
        let apiKey = process.env.OPENAI_API_KEY || '';
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const headerKey = authHeader.substring(7); // Remove 'Bearer ' prefix
            // Only use header key if it's not empty
            if (headerKey && headerKey.trim() !== 'null' && headerKey !== 'undefined') {
                apiKey = headerKey;
                console.log(`[${new Date().toISOString()}] Using API key from request header`);
            } else {
                console.log(`[${new Date().toISOString()}] Invalid API key in header: "${headerKey}"`);
            }
        }
        
        if (!apiKey || apiKey.trim() === '') {
            console.error(`[${new Date().toISOString()}] API key missing in request and environment`);
            return res.status(401).json({ 
                error: "API key is required", 
                message: "No valid API key provided in request or server environment",
                details: "The Authorization header should contain 'Bearer YOUR_OPENAI_API_KEY'",
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`[${new Date().toISOString()}] Proxying request to OpenAI API with valid API key`);
        
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
        environment: process.env.NODE_ENV || "development",
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        timestamp: new Date().toISOString()
    });
});

// OpenAI API health check
app.get("/api/openai/health", async (req, res) => {
    try {
        // Try to use the environment API key if available
        const apiKey = process.env.OPENAI_API_KEY || "sk_test";
        console.log(`[${new Date().toISOString()}] Checking OpenAI health with ${apiKey ? "valid" : "test"} API key`);
        
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
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking OpenAI API health:`, error.message);
        res.status(503).json({ 
            status: "error", 
            message: "OpenAI API may be unreachable", 
            details: error.message,
            timestamp: new Date().toISOString() 
        });
    }
});

// Log all incoming API requests with more details
app.all("/api/*", (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.path}`);
    console.log(`[${new Date().toISOString()}] Origin: ${req.headers.origin || 'unknown'}`);
    console.log(`[${new Date().toISOString()}] User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
    next();
});

// Catch-all for other routes
app.all("*", (req, res) => {
    console.log(`[${new Date().toISOString()}] Unknown route requested: ${req.path}`);
    res.status(404).json({ 
        error: "Route not found", 
        path: req.path,
        timestamp: new Date().toISOString() 
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
