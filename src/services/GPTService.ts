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

  public async getBilingualResponses(transcription: string): Promise<BilingualResponse> {
    if (!this.apiKey) {
      console.warn('API key not set, using mock data');
      return this.getMockBilingualResponses(transcription);
    }

    try {
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
          max_tokens: 300,
          n: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from OpenAI API:', errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        const parsedResponses = JSON.parse(content);
        if (Array.isArray(parsedResponses) && parsedResponses.length > 0) {
          return { responses: parsedResponses };
        }
      } catch (parseError) {
        console.error('Error parsing GPT response:', parseError);
        const responses = this.extractBilingualResponses(content);
        if (responses.length > 0) {
          return { responses };
        }
      }
      
      return this.getMockBilingualResponses(transcription);
    } catch (error) {
      console.error('Error getting bilingual responses from GPT:', error);
      return this.getMockBilingualResponses(transcription);
    }
  }

  private extractBilingualResponses(content: string): Array<{english: string, russian: string}> {
    const responses: Array<{english: string, russian: string}> = [];
    const lines = content.split('\n');
    
    let currentEnglish = '';
    let currentRussian = '';
    let index = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (currentEnglish && currentRussian) {
          responses.push({ english: currentEnglish, russian: currentRussian });
          currentEnglish = '';
          currentRussian = '';
        }
        
        currentEnglish = trimmedLine.replace(/^\d+\.\s+/, '');
      } else if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')') && currentEnglish) {
        currentRussian = trimmedLine.substring(1, trimmedLine.length - 1);
        
        responses.push({ english: currentEnglish, russian: currentRussian });
        currentEnglish = '';
        currentRussian = '';
      }
      
      if (responses.length >= 3) break;
    }
    
    return responses;
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
    return `You are a helpful assistant for a Russian speaker having phone conversations in English. 
    Your task is to listen to what they hear during the conversation and provide exactly three possible 
    responses that would be appropriate and natural for the context.

    The responses should be professional, relevant to the conversation topic, and help the Russian speaker 
    navigate the conversation smoothly. Each response should first be in English, followed by its Russian 
    translation in parentheses.

    Format your output exactly like this:
    1. [English response 1]
    ([Russian translation 1])
    2. [English response 2]
    ([Russian translation 2])
    3. [English response 3]
    ([Russian translation 3])

    Make sure the responses are contextually appropriate, helpful, and sound natural in a real conversation.
    Focus on providing responses that address the specific question or statement that was heard.`;
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
  
  private getMockBilingualResponses(transcription: string): BilingualResponse {
    if (transcription.toLowerCase().includes('cdla') || transcription.toLowerCase().includes('driver')) {
      return {
        responses: [
          {
            english: "Yes, I have a CDLA. I am open to both options. What kind of driving jobs do you have available?",
            russian: "Да, у меня есть CDLA. Я открыт для обоих вариантов. Какие вакансии водителей у вас есть?"
          },
          {
            english: "Yes, I have a CDLA. I would like to use it, but I am also open to driving regular vehicles. What do you suggest?",
            russian: "Да, у меня есть CDLA. Я хотел бы его использовать, но также открыт к вождению обычных автомобилей. Что вы предлагаете?"
          },
          {
            english: "Yes, I do. I prefer to use my CDLA, but I can consider other options. Can you tell me more about the job?",
            russian: "Да, есть. Я предпочитаю использовать CDLA, но могу рассмотреть и другие варианты. Можете рассказать больше о работе?"
          }
        ]
      };
    }
    
    if (transcription.toLowerCase().includes('experience') || transcription.toLowerCase().includes('опыт')) {
      return {
        responses: [
          {
            english: "I have 5 years of experience as a commercial driver, primarily in long-haul transportation.",
            russian: "У меня 5 лет опыта работы коммерческим водителем, в основном в дальних перевозках."
          },
          {
            english: "My experience includes 3 years of truck driving and 2 years of delivery van operations.",
            russian: "Мой опыт включает 3 года вождения грузовиков и 2 года работы на доставке фургоном."
          },
          {
            english: "I've been driving professionally for over 7 years, with experience in various vehicle types.",
            russian: "Я профессионально вожу уже более 7 лет, имею опыт работы с различными типами транспортных средств."
          }
        ]
      };
    }
    
    if (transcription.toLowerCase().includes('availability') || transcription.toLowerCase().includes('доступность')) {
      return {
        responses: [
          {
            english: "I'm available to start immediately and can work flexible hours, including weekends if needed.",
            russian: "Я могу приступить к работе немедленно и работать по гибкому графику, включая выходные, если потребуется."
          },
          {
            english: "I prefer full-time work during weekdays, but I'm open to discussing other schedules.",
            russian: "Я предпочитаю работу на полный рабочий день в будние дни, но открыт для обсуждения других графиков."
          },
          {
            english: "I'm looking for a stable schedule, but can accommodate occasional overtime or weekend work.",
            russian: "Я ищу стабильный график, но могу работать сверхурочно или в выходные дни время от времени."
          }
        ]
      };
    }

    return {
      responses: [
        {
          english: "I understand your question. Could you please provide more details so I can give you a more specific answer?",
          russian: "Я понимаю ваш вопрос. Не могли бы вы предоставить больше деталей, чтобы я мог дать более конкр��тный ответ?"
        },
        {
          english: "That's an interesting point. Let me think about it and get back to you with a thoughtful response.",
          russian: "Это интересный момент. Позвольте мне подумать об этом и вернуться к вам с обдуманным ответом."
        },
        {
          english: "I'd like to discuss this further. Could we schedule a time to talk more about these details?",
          russian: "Я хотел бы обсудить это подробнее. Можем ли мы назначить время, чтобы поговорить подробнее об этих деталях?"
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
