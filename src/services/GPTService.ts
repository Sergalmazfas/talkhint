interface GPTResponse {
  suggestions: string[];
}

interface BilingualResponse {
  responses: Array<{english: string, russian: string}>;
}

interface TranslationResponse {
  translation: string;
}

class GPTService {
  private apiKey: string | null = null;
  private responseStyle: string = 'casual';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    // Try to load API key from localStorage on initialization
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      this.apiKey = storedKey;
      console.log('API key loaded from storage');
    }
  }

  public setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
    console.log('API key set and saved to storage');
  }

  public getApiKey(): string | null {
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
      console.log('Getting suggestions for:', transcription);
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

      console.log('Using API key:', this.apiKey.substring(0, 5) + '...');
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 1.0, // Higher temperature for more varied responses
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
      console.log('OpenAI API response:', data);
      
      const suggestions = data.choices.map((choice: any) => 
        choice.message.content.trim()
      );

      console.log('Extracted suggestions:', suggestions);
      return { suggestions };
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      return this.getMockSuggestions(transcription);
    }
  }

  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock data');
      return this.getMockBilingualResponses(transcription);
    }

    try {
      console.log('Getting bilingual responses for:', transcription);
      const messages = [
        {
          role: "system",
          content: this.getBilingualPrompt()
        },
        {
          role: "user",
          content: transcription
        }
      ];

      console.log('Using API key:', this.apiKey.substring(0, 5) + '...');
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 1.0, // Increased for more variety
          max_tokens: 500,
          n: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('OpenAI API response for bilingual:', data);
      
      const content = data.choices[0].message.content.trim();
      console.log('Raw content from GPT:', content);
      
      try {
        // Try to parse as JSON first
        const parsedResponses = JSON.parse(content);
        if (Array.isArray(parsedResponses) && parsedResponses.length > 0) {
          console.log('Successfully parsed JSON response:', parsedResponses);
          return { responses: parsedResponses };
        }
      } catch (parseError) {
        console.log('Content is not valid JSON, trying to extract structured data');
        // If not valid JSON, try to extract structured data
        const responses = this.extractBilingualResponses(content);
        if (responses.length > 0) {
          console.log('Extracted structured responses:', responses);
          return { responses };
        }
      }
      
      console.warn('Could not parse GPT response, using mock data');
      return this.getMockBilingualResponses(transcription);
    } catch (error) {
      console.error('Error getting bilingual responses from GPT:', error);
      return this.getMockBilingualResponses(transcription);
    }
  }

  private extractBilingualResponses(content: string): Array<{english: string, russian: string}> {
    const responses: Array<{english: string, russian: string}> = [];
    
    // First, try to match the numbered format: "1. English text\n(Russian text)"
    const regex = /(\d+)\.\s+([^\n]+)\s*\n\s*\(([^)]+)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      responses.push({
        english: match[2].trim(),
        russian: match[3].trim()
      });
    }
    
    // If we found structured responses, return them
    if (responses.length > 0) {
      return responses.slice(0, 3); // Only return up to 3 responses
    }
    
    // Otherwise, try line-by-line parsing
    const lines = content.split('\n');
    
    let currentEnglish = '';
    let currentRussian = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for numbered responses (e.g. "1. English text")
      const numberMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberMatch) {
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
        }
        
        currentEnglish = numberMatch[2];
        currentRussian = '';
        continue;
      }
      
      // Look for Russian translations in parentheses
      if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')') && currentEnglish) {
        currentRussian = trimmedLine.substring(1, trimmedLine.length - 1);
        
        // Add the pair to responses
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
          currentEnglish = '';
          currentRussian = '';
        }
      }
    }
    
    // Add the last pair if it exists
    if (currentEnglish && currentRussian) {
      responses.push({ english: currentEnglish, russian: currentRussian });
    }
    
    return responses.slice(0, 3); // Only return up to 3 responses
  }

  public async getTranslation(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock translation');
      return this.getMockTranslation(text, sourceLanguage, targetLanguage);
    }

    try {
      console.log(`Translating from ${sourceLanguage} to ${targetLanguage}:`, text);
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
      console.log('Translation result:', translation);

      return { translation };
    } catch (error) {
      console.error('Error getting translation from GPT:', error);
      return this.getMockTranslation(text, sourceLanguage, targetLanguage);
    }
  }

  private getSystemPrompt(): string {
    const basePrompt = "Ты помощник, который предлагает короткие и уместные ответы на русском языке для разговора. Предложи три разных варианта ответа ��а сообщение пользователя. Каждый ответ должен быть кратким и законченным предложением.";
    
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

  private getBilingualPrompt(): string {
    return `You are a helpful assistant for a Russian speaker having phone conversations in English about work, jobs, and interviews. 
    Your task is to analyze what they hear during the conversation and provide exactly three SPECIFIC AND CONTEXTUAL possible 
    responses that would be appropriate and natural for them to reply with.

    IMPORTANT GUIDELINES:
    1. Use SIMPLE ENGLISH suitable for a non-native speaker. Avoid complex vocabulary and grammar.
    2. Responses must be SPECIFIC to the exact query or statement, especially about work, jobs, interviews, CDL licenses, or driving.
    3. NO generic responses like "I need more details" or "Let's discuss later" - be specific to the context.
    4. Keep responses concise and easy to pronounce - 1-2 short sentences maximum.
    5. Responses should sound natural and conversational.
    6. Each response must be DIFFERENT and VARIED - do not provide similar answers.
    7. Include useful details when appropriate (years of experience, qualifications, preferences).

    Format your output exactly like this:
    1. [Simple English response 1]
    ([Russian translation 1])
    2. [Simple English response 2]
    ([Russian translation 2])
    3. [Simple English response 3]
    ([Russian translation 3])

    Examples:
    For "Do you have a CDL?":
    1. Yes, I have a Class A CDL with 3 years of experience.
    (Да, у меня есть CDL класса A с 3-летним опытом.)
    2. Yes, I have a CDL. What kind of driving job do you offer?
    (Да, у меня есть CDL. Какую работу водителя вы предлагаете?)
    3. Yes, I have a CDL and I can start working right away.
    (Да, у меня есть CDL, и я могу приступить к работе немедленно.)

    For "Can you work weekends?":
    1. Yes, I can work weekends. No problem.
    (Да, я могу работать в выходные. Без проблем.)
    2. I prefer weekday shifts, but can work weekends if needed.
    (Я предпочитаю смены в будние дни, но могу работать в выходные, если нужно.)
    3. Weekends are fine. How many hours per weekend?
    (Выходные подходят. Сколько часов в выходные?)`;
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
    // Generate different mock responses based on the input
    const lowercaseTranscription = transcription.toLowerCase();
    
    if (lowercaseTranscription.includes('привет') || lowercaseTranscription.includes('здравствуйте')) {
      return {
        suggestions: [
          'Здравствуйте! Чем я могу вам помочь?',
          'Добрый день! Рад вас слышать.',
          'Приветствую! Как ваши дела?'
        ]
      };
    }
    
    if (lowercaseTranscription.includes('цена') || lowercaseTranscription.includes('стоимость')) {
      return {
        suggestions: [
          'Стоимость зависит от нескольких факторов. Могу подробнее рассказать о них.',
          'Наши цены начинаются от 5000 рублей. Хотите узнать детали?',
          'Я вышлю вам полный прайс-лист. Подскажите ваш email?'
        ]
      };
    }
    
    if (lowercaseTranscription.includes('спасибо')) {
      return {
        suggestions: [
          'Всегда пожалуйста! Есть ли еще вопросы?',
          'Рад был помочь. Обращайтесь, если будут вопросы.',
          'Не за что! Хорошего дня!'
        ]
      };
    }
    
    if (lowercaseTranscription.includes('опыт') || lowercaseTranscription.includes('работа')) {
      return {
        suggestions: [
          'У меня 5 лет опыта работы в этой сфере.',
          'Я работал с разными проектами, от малых до крупных.',
          'Мой опыт включает работу с международными клиентами.'
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
  
  private getMockBilingualResponses(transcription: string): BilingualResponse {
    const lowercaseTranscription = transcription.toLowerCase();
    
    if (lowercaseTranscription.includes('cdl') || lowercaseTranscription.includes('driver') || lowercaseTranscription.includes('license')) {
      return {
        responses: [
          {
            english: "Yes, I have a CDL. I'm looking for a driving job now.",
            russian: "Да, у меня есть CDL. Я сейчас как раз ищу работу водителем."
          },
          {
            english: "Yes, I have a Class A CDL with 3 years of experience.",
            russian: "Да, у меня есть CDL класса A с 3-летним опытом."
          },
          {
            english: "Yes, I have a CDL. Can you tell me about the job?",
            russian: "Да, у меня есть CDL. Можете рассказать о работе?"
          }
        ]
      };
    }
    
    if (lowercaseTranscription.includes('experience') || lowercaseTranscription.includes('years')) {
      return {
        responses: [
          {
            english: "I have 5 years of truck driving experience.",
            russian: "У меня 5 лет опыта вождения грузовика."
          },
          {
            english: "I've been driving trucks for 3 years, mostly long-haul.",
            russian: "Я вожу грузовики 3 года, в основном дальние перевозки."
          },
          {
            english: "I have 4 years experience with refrigerated loads.",
            russian: "У меня 4 года опыта работы с рефрижераторными грузами."
          }
        ]
      };
    }
    
    if (lowercaseTranscription.includes('available') || lowercaseTranscription.includes('start') || lowercaseTranscription.includes('when')) {
      return {
        responses: [
          {
            english: "I can start right away, as soon as tomorrow.",
            russian: "Я могу начать прямо сейчас, хоть завтра."
          },
          {
            english: "I'm available immediately. When do you need a driver?",
            russian: "Я доступен немедленно. Когда вам нужен водитель?"
          },
          {
            english: "I can start next week. Is the position still open?",
            russian: "Я могу начать со следующей недели. Позиция еще открыта?"
          }
        ]
      };
    }
    
    if (lowercaseTranscription.includes('pay') || lowercaseTranscription.includes('salary') || lowercaseTranscription.includes('money')) {
      return {
        responses: [
          {
            english: "What is the pay rate for this position?",
            russian: "Какая ставка оплаты для этой должности?"
          },
          {
            english: "How much does this job pay per mile or per hour?",
            russian: "Сколько платят за милю или в час на этой работе?"
          },
          {
            english: "I'm looking for at least $25 per hour. Is that possible?",
            russian: "Я ищу минимум $25 в час. Это возможно?"
          }
        ]
      };
    }
    
    if (lowercaseTranscription.includes('interview') || lowercaseTranscription.includes('meeting')) {
      return {
        responses: [
          {
            english: "When would you like to schedule the interview?",
            russian: "Когда бы вы хотели назначить собеседование?"
          },
          {
            english: "I'm available for an interview this week. What time works for you?",
            russian: "Я свободен для собеседования на этой неделе. Какое время вам подходит?"
          },
          {
            english: "Should I bring any documents to the interview?",
            russian: "Нужно ли мне принести какие-то документы на собеседование?"
          }
        ]
      };
    }

    return {
      responses: [
        {
          english: "Could you please repeat that? I didn't understand.",
          russian: "Не могли бы вы повторить? Я не понял."
        },
        {
          english: "I'm interested in this job. Please tell me more.",
          russian: "Я заинтересован в этой работе. Расскажите подробнее, пожалуйста."
        },
        {
          english: "That sounds good. What should I do next?",
          russian: "Звучит хорошо. Что мне делать дальше?"
        }
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
