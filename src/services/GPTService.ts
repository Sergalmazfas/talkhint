interface GPTResponse {
  suggestions: string[];
}

interface TranslationResponse {
  translation: string;
}

class GPTService {
  private apiKey: string | null = "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";
  private responseStyle: string = 'casual';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  public setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
  }

  public getApiKey(): string | null {
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
          n: 3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestions = data.choices.map((choice: any) => 
        choice.message.content.trim()
      );

      return { suggestions };
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      return this.getMockSuggestions(transcription);
    }
  }

  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock translation');
      return this.getMockTranslation(text, sourceLanguage, targetLanguage);
    }

    try {
      const messages = [
        {
          role: "system",
          content: this.getTranslationPrompt(sourceLanguage, targetLanguage)
        },
        {
          role: "user",
          content: text
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
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const translation = data.choices[0].message.content.trim();

      return { translation };
    } catch (error) {
      console.error('Error getting translation from GPT:', error);
      return this.getMockTranslation(text, sourceLanguage, targetLanguage);
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

  private getTranslationPrompt(sourceLanguage: string, targetLanguage: string): string {
    const languageNames: { [key: string]: string } = {
      'ru': 'русский',
      'en': 'английский',
      'fr': 'французский',
      'de': 'немецкий',
      'es': 'испанский',
      'it': 'итальянский',
      'zh': 'китайский',
      'ja': 'японский'
    };

    const sourceName = languageNames[sourceLanguage] || sourceLanguage;
    const targetName = languageNames[targetLanguage] || targetLanguage;

    return `Ты профессиональный переводчик. Переведи текст с ${sourceName} на ${targetName} язык. 
    Сохрани смысл, тон и стиль исходного текста. Твой ответ должен содержать только перевод, без комментариев 
    и пояснений. Если текст уже на целевом языке, просто верни его без изменений.`;
  }

  private getMockSuggestions(transcription: string): GPTResponse {
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

    return {
      suggestions: [
        'Интересная мысль. Давайте обсудим подробнее.',
        'Я понимаю вашу точку зрения. Что если посмотреть с другой стороны?',
        'Можете рассказать об этом подробнее?'
      ]
    };
  }
  
  private getMockTranslation(text: string, sourceLanguage: string, targetLanguage: string): TranslationResponse {
    if (sourceLanguage === 'ru' && targetLanguage === 'en') {
      if (text.toLowerCase().includes('привет')) {
        return { translation: 'Hello' };
      }
      if (text.toLowerCase().includes('как дела')) {
        return { translation: 'How are you?' };
      }
      return { translation: 'This is a mock translation from Russian to English' };
    }
    
    if (sourceLanguage === 'en' && targetLanguage === 'ru') {
      if (text.toLowerCase().includes('hello')) {
        return { translation: 'Привет' };
      }
      if (text.toLowerCase().includes('how are you')) {
        return { translation: 'Как дела?' };
      }
      return { translation: 'Это тестовый перевод с английского на русский' };
    }
    
    return { 
      translation: `Mock translation from ${sourceLanguage} to ${targetLanguage}: ${text}` 
    };
  }
}

export default new GPTService();
