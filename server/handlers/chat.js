
// Simple chat handler
function chatHandler(req, res) {
  try {
    const { message } = req.body;
    console.log("Chat request received:", message);
    console.log("Authorization header:", req.headers.authorization);
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Simple test response
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
}

module.exports = { chatHandler };
