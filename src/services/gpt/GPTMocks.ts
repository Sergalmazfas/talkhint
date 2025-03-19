
/**
 * Mock responses for different GPT features when API key is not set
 */
export interface GPTResponse {
  suggestions: string[];
}

export interface BilingualResponse {
  responses: Array<{english: string, russian: string}>;
}

export interface TranslationResponse {
  translation: string;
}

export const getMockSuggestions = (transcription: string): GPTResponse => {
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
};

export const getMockBilingualResponses = (transcription: string): BilingualResponse => {
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
};

export const getMockTranslation = (text: string, sourceLanguage: string, targetLanguage: string): TranslationResponse => {
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
};
