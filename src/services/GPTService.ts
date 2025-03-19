
interface GPTResponse {
  suggestions: string[];
}

class GPTService {
  private apiKey: string | null = null;
  private responseStyle: string = 'casual';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  public setApiKey(key: string) {
    this.apiKey = key;
    // Store in localStorage to persist between sessions
    localStorage.setItem('openai_api_key', key);
  }

  public getApiKey(): string | null {
    // If apiKey isn't set yet, try to get it from localStorage
    if (!this.apiKey) {
      const storedKey = localStorage.getItem('openai_api_key');
      if (storedKey) {
        this.apiKey = storedKey;
      }
    }
    return this.apiKey;
  }

  public setResponseStyle(style: string) {
    this.responseStyle = style;
  }

  public async getSuggestions(transcription: string): Promise<GPTResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock data');
      return this.getMockSuggestions(transcription);
    }

    try {
      const messages = [
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user",
          content: transcription
        }
      ];

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 150,
          n: 3  // Generate 3 different suggestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract suggestions from OpenAI response
      const suggestions = data.choices.map((choice: any) => 
        choice.message.content.trim()
      );

      return { suggestions };
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      return this.getMockSuggestions(transcription);
    }
  }

  private getSystemPrompt(): string {
    const basePrompt = "Ты помощник, который предлагает короткие и уместные ответы на русском языке для разговора. Предложи три разных варианта ответа на сообщение пользователя. Каждый ответ должен быть кратким и законченным предложением.";
    
    let styleModifier = "";
    
    switch (this.responseStyle) {
      case 'formal':
        styleModifier = "Ответы должны быть формальными и вежливыми, подходящими для делового общения.";
        break;
      case 'casual':
        styleModifier = "Ответы должны быть неформальными и дружелюбными, как в обычном разговоре.";
        break;
      case 'professional':
        styleModifier = "Ответы должны быть профессиональными и информативными, подходящими для рабочей среды.";
        break;
      case 'empathetic':
        styleModifier = "Ответы должны быть эмпатичными и понимающими, показывающими заботу о собеседнике.";
        break;
      default:
        styleModifier = "Ответы должны быть простыми и дружелюбными.";
    }
    
    return `${basePrompt} ${styleModifier}`;
  }

  private getMockSuggestions(transcription: string): GPTResponse {
    // In case the API call fails, we fall back to mock responses
    
    // Simple keyword-based mock response system
    if (transcription.toLowerCase().includes('привет') || transcription.toLowerCase().includes('здравствуйте')) {
      return {
        suggestions: [
          'Здравствуйте! Чем я могу вам помочь?',
          'Добрый день! Рад вас слышать.',
          'Приветствую! Как ваши дела?'
        ]
      };
    }
    
    if (transcription.toLowerCase().includes('цена') || transcription.toLowerCase().includes('стоимость')) {
      return {
        suggestions: [
          'Стоимость зависит от нескольких факторов. Могу подробнее рассказать о них.',
          'Наши цены начинаются от 5000 рублей. Хотите узнать детали?',
          'Я вышлю вам полный прайс-лист. Подскажите ваш email?'
        ]
      };
    }
    
    if (transcription.toLowerCase().includes('спасибо')) {
      return {
        suggestions: [
          'Всегда пожалуйста! Есть ли еще вопросы?',
          'Рад был помочь. Обращайтесь, если будут вопросы.',
          'Не за что! Хорошего дня!'
        ]
      };
    }

    // Default responses for other cases
    return {
      suggestions: [
        'Интересная мысль. Давайте обсудим подробнее.',
        'Я понимаю вашу точку зрения. Что если посмотреть с другой стороны?',
        'Можете рассказать об этом подробнее?'
      ]
    };
  }
}

export default new GPTService();
