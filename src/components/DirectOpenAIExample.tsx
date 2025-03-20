
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import GPTService from '@/services/gpt';

const DirectOpenAIExample = () => {
  const [prompt, setPrompt] = useState<string>('Write a one-sentence bedtime story about a unicorn.');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'client' | 'proxy' | 'chat'>('client');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      if (method === 'chat') {
        // Use the new lovable.dev chat API
        const result = await GPTService.sendChatMessage(prompt);
        setResponse(JSON.stringify(result, null, 2));
      } else if (method === 'client') {
        // Direct OpenAI client method
        const client = GPTService.getOpenAIClient();
        
        if (!client) {
          setError('OpenAI client not available. Please set your API key in Settings.');
          setLoading(false);
          return;
        }

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
        // Proxy server method
        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: prompt
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        setResponse(JSON.stringify(data, null, 2));
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
        <CardTitle>API Example</CardTitle>
        <CardDescription>
          Send messages directly to lovable.dev/api/chat or through different methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs value={method} onValueChange={(v) => setMethod(v as 'client' | 'proxy' | 'chat')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="client">OpenAI Client</TabsTrigger>
            <TabsTrigger value="proxy">Express Proxy</TabsTrigger>
            <TabsTrigger value="chat">Lovable Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <p className="text-sm text-muted-foreground mb-4">
              Using the OpenAI client directly with your API key
            </p>
          </TabsContent>
          <TabsContent value="proxy">
            <p className="text-sm text-muted-foreground mb-4">
              Using your Express proxy server (make sure it's running on localhost:3000)
            </p>
          </TabsContent>
          <TabsContent value="chat">
            <p className="text-sm text-muted-foreground mb-4">
              Using the lovable.dev/api/chat endpoint for direct messaging
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
          disabled={loading || !prompt.trim()}
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
