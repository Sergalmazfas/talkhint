
// This is a mock implementation. In a real app, you would connect to the OpenAI API
// The implementation will need your API key and proper configuration

interface GPTResponse {
  suggestions: string[];
}

class GPTService {
  private apiKey: string | null = null;
  private responseStyle: string = 'casual';

  public setApiKey(key: string) {
    this.apiKey = key;
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
      // This is where you would make the actual API call to OpenAI
      // For now, we'll use mock data
      return this.getMockSuggestions(transcription);
    } catch (error) {
      console.error('Error getting suggestions from GPT:', error);
      return { suggestions: [] };
    }
  }

  private getMockSuggestions(transcription: string): GPTResponse {
    // In a real implementation, this would be replaced with an actual API call
    
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
