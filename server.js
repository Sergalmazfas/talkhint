
/**
 * Server entry point - redirects to modular server structure
 * This file is kept for backward compatibility
 */
require('./server/index');

// Notify about the new structure
console.log('Note: server.js has been refactored into a modular structure under the server/ directory');
