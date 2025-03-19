
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import GPTService from '@/services/GPTService';

const DirectOpenAIExample = () => {
  const [prompt, setPrompt] = useState<string>('Write a one-sentence bedtime story about a unicorn.');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
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
    } catch (err) {
      console.error('Error calling OpenAI:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Direct OpenAI API Example</CardTitle>
        <CardDescription>
          Use the OpenAI client directly to generate completions
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
        
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Your prompt
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="min-h-24"
          />
        </div>

        {response && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Response:</h3>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
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
              Generating...
            </>
          ) : (
            'Generate Completion'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DirectOpenAIExample;
