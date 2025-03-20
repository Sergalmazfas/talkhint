
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
const corsMiddleware = (req, res, next) => {
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
};

// CORS options for cors middleware
const corsOptions = {
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
};

module.exports = { corsMiddleware, corsOptions, ALLOWED_ORIGINS };
