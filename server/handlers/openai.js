
const axios = require("axios");

// OpenAI proxy handler
async function openAiProxyHandler(req, res) {
  try {
    // Get API key from request or env
    const apiKey = req.headers.authorization?.split(" ")[1] || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ error: "API key is required" });
    }
    
    console.log(`Forwarding request to OpenAI API with ${req.body.messages?.length || 0} messages`);
    
    // Log API key for debugging (mask it for security)
    const maskedKey = apiKey.substring(0, 5) + '***' + apiKey.substring(apiKey.length - 4);
    console.log(`Using API key: ${maskedKey}`);
    
    // Prepare OpenAI API request
    try {
      // Log complete headers we're sending to OpenAI
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
      console.log("Headers being sent to OpenAI:", JSON.stringify(headers, (key, value) => {
        if (key === 'Authorization') return 'Bearer sk-***';
        return value;
      }, 2));
      
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        req.body,
        {
          headers,
          timeout: 60000 // 60 second timeout
        }
      );
      
      console.log(`Response received from OpenAI API with status ${response.status}`);
      res.json(response.data);
    } catch (apiError) {
      console.error("Error from OpenAI API:", apiError.message);
      if (apiError.response) {
        console.error("API error details:", apiError.response.data);
        res.status(apiError.response.status).json(apiError.response.data);
      } else {
        res.status(500).json({ 
          error: "Error calling OpenAI API", 
          message: apiError.message,
          stack: apiError.stack 
        });
      }
    }
  } catch (error) {
    console.error("Error proxying to OpenAI:", error.message);
    res.status(500).json({ error: "Error processing request", message: error.message });
  }
}

module.exports = { openAiProxyHandler };
