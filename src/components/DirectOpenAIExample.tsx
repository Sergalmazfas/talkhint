
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Info, Loader2, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import GPTService from '@/services/gpt';
import { toast } from 'sonner';
import { isValidApiKey } from '@/services/gpt/config/GPTServiceConfig';

const DirectOpenAIExample = () => {
  const [prompt, setPrompt] = useState<string>('Write a one-sentence bedtime story about a unicorn.');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'client' | 'vercel' | 'chat'>('vercel');
  const [apiKeySet, setApiKeySet] = useState<boolean>(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean>(false);

  useEffect(() => {
    // Check if API key is set when component mounts or method changes
    const checkApiKey = () => {
      const apiKey = GPTService.getApiKey();
      const hasApiKey = !!apiKey;
      setApiKeySet(hasApiKey);
      
      // Also check if the API key is valid format
      setApiKeyValid(hasApiKey && isValidApiKey(apiKey));
      
      if (!hasApiKey && method !== 'chat') {
        setError('API key is not set. Please configure it in the Settings panel.');
      } else if (hasApiKey && !isValidApiKey(apiKey) && method !== 'chat') {
        setError('API key is invalid format. It should start with "sk-"');
      } else {
        setError(null);
      }
    };
    
    checkApiKey();
  }, [method]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      if (method === 'chat') {
        // Use the new chat API
        const result = await GPTService.sendChatMessage(prompt);
        setResponse(JSON.stringify(result, null, 2));
      } else if (method === 'client') {
        // Direct OpenAI client method
        const client = GPTService.getOpenAIClient();
        
        if (!client) {
          throw new Error('OpenAI client not available. Please set your API key in Settings.');
        }

        // API key validation
        const apiKey = GPTService.getApiKey();
        if (!apiKey || !isValidApiKey(apiKey)) {
          throw new Error('Invalid API key format. Key should start with "sk-"');
        }

        console.log('Making direct request to OpenAI with client');
        
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini", // Using smaller model for efficiency
          messages: [{
            role: "user",
            content: prompt,
          }],
          temperature: 0.7,
          max_tokens: 150,
        });

        setResponse(completion.choices[0].message.content || 'No response received');
      } else {
        // Vercel proxy server method
        const proxyUrl = GPTService.getServerProxyUrl();
        const apiKey = GPTService.getApiKey();
        
        if (!apiKey && !method.includes('chat') && !GPTService.getUseServerProxy()) {
          throw new Error('API key is required for this method. Please set it in Settings.');
        }
        
        toast.info(`Sending request to ${proxyUrl}/openai/chat/completions`);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Only add Authorization header if API key is set and not empty
        if (apiKey && apiKey.trim() !== '') {
          if (!isValidApiKey(apiKey)) {
            throw new Error('Invalid API key format. Key should start with "sk-"');
          }
          headers['Authorization'] = `Bearer ${apiKey}`;
          console.log('Using API key in request:', apiKey.substring(0, 5) + '...' + apiKey.slice(-5));
        } else {
          console.warn('No API key provided for request');
        }
        
        console.log('Request headers:', JSON.stringify(headers, (key, value) => 
          key === 'Authorization' ? (value ? 'Bearer [KEY SET]' : value) : value));
        
        const response = await fetch(`${proxyUrl}/openai/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
              role: "user",
              content: prompt,
            }],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Server responded with status: ${response.status}.`;
          try {
            const errorData = await response.json();
            errorMessage += ` ${JSON.stringify(errorData)}`;
          } catch (e) {
            const errorText = await response.text();
            errorMessage += ` ${errorText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setResponse(data.choices[0].message.content || JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Error calling API:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>OpenAI API Proxy Test</CardTitle>
        <CardDescription>
          Test your connection to OpenAI API through different methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKeySet && method !== 'chat' && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4" />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              The current method requires an API key. Please set it in the Settings panel.
            </AlertDescription>
          </Alert>
        )}
        
        {apiKeySet && !apiKeyValid && method !== 'chat' && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Invalid API Key Format</AlertTitle>
            <AlertDescription>
              Your API key has an invalid format. It should start with "sk-" and be at least 32 characters long.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs value={method} onValueChange={(v) => setMethod(v as 'client' | 'vercel' | 'chat')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="client">Direct Client</TabsTrigger>
            <TabsTrigger value="vercel">Vercel Proxy</TabsTrigger>
            <TabsTrigger value="chat">Simple Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <p className="text-sm text-muted-foreground mb-4">
              Using the OpenAI client directly with your API key (API key required)
            </p>
          </TabsContent>
          <TabsContent value="vercel">
            <p className="text-sm text-muted-foreground mb-4">
              Using our Vercel proxy server to avoid CORS issues (API key required)
            </p>
          </TabsContent>
          <TabsContent value="chat">
            <p className="text-sm text-muted-foreground mb-4">
              Using a simple chat endpoint that doesn't require an API key
            </p>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Your message
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your message here..."
            className="min-h-24"
          />
        </div>

        {response && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Response:</h3>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap overflow-auto max-h-64">
              {response}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !prompt.trim() || (!apiKeySet && method !== 'chat') || (apiKeySet && !apiKeyValid && method !== 'chat')}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DirectOpenAIExample;
