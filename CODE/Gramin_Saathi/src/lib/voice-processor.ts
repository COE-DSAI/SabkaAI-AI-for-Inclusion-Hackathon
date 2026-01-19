/**
 * Voice Processor - On-device voice recognition and synthesis
 * Uses Web Speech API for privacy-first voice processing
 * No audio is sent to external servers
 */

// Check for speech API support
export const hasSpeechRecognition = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export const hasSpeechSynthesis = (): boolean => {
  return 'speechSynthesis' in window;
};

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
}

// Intent classification for common actions
export type Intent = 
  | 'add_income'
  | 'add_expense'
  | 'check_balance'
  | 'check_mandi'
  | 'check_weather'
  | 'open_calculator'
  | 'open_schemes'
  | 'open_lessons'
  | 'help'
  | 'unknown';

// Intent keywords in Hindi and English
const intentKeywords: Record<Intent, string[]> = {
  add_income: ['आय', 'income', 'जमा', 'deposit', 'पैसे आए', 'earn', 'कमाई', 'बिक्री', 'sale'],
  add_expense: ['खर्च', 'expense', 'खर्चा', 'spend', 'payment', 'भुगतान', 'निकासी', 'withdraw'],
  check_balance: ['बैलेंस', 'balance', 'बाकी', 'remaining', 'शेष', 'कितने पैसे', 'how much'],
  check_mandi: ['मंडी', 'mandi', 'भाव', 'rate', 'price', 'दाम', 'बाजार', 'market'],
  check_weather: ['मौसम', 'weather', 'बारिश', 'rain', 'धूप', 'sun', 'तापमान', 'temperature'],
  open_calculator: ['कैलकुलेटर', 'calculator', 'गणना', 'calculate', 'हिसाब', 'जोड़'],
  open_schemes: ['योजना', 'scheme', 'सरकारी', 'government', 'सब्सिडी', 'subsidy'],
  open_lessons: ['सीखो', 'learn', 'पाठ', 'lesson', 'कोर्स', 'course', 'शिक्षा', 'education'],
  help: ['मदद', 'help', 'सहायता', 'assist', 'क्या कर सकते हो', 'what can you do'],
  unknown: []
};

// Classify intent from text
export const classifyIntent = (text: string): { intent: Intent; confidence: number; extractedData?: any } => {
  const lowerText = text.toLowerCase();
  
  let bestIntent: Intent = 'unknown';
  let bestScore = 0;
  
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (intent === 'unknown') continue;
    
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as Intent;
    }
  }
  
  // Extract numbers for financial intents
  let extractedData: any = undefined;
  if (bestIntent === 'add_income' || bestIntent === 'add_expense') {
    const numberMatch = text.match(/(\d+)/);
    if (numberMatch) {
      extractedData = { amount: parseInt(numberMatch[1]) };
    }
  }
  
  return {
    intent: bestIntent,
    confidence: bestScore > 0 ? Math.min(bestScore / 2, 1) : 0,
    extractedData
  };
};

// Speech recognition class
export class VoiceRecognizer {
  private recognition: any;
  private isListening: boolean = false;
  private lang: string;
  
  constructor(lang: 'hi' | 'en' = 'hi') {
    this.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    
    if (hasSpeechRecognition()) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;
    }
  }
  
  setLanguage(lang: 'hi' | 'en'): void {
    this.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    if (this.recognition) {
      this.recognition.lang = this.lang;
    }
  }
  
  start(options: {
    onResult?: (transcript: string, isFinal: boolean) => void;
    onIntent?: (intent: Intent, confidence: number, extractedData?: any) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }): boolean {
    if (!this.recognition) {
      options.onError?.('Speech recognition not supported');
      return false;
    }
    
    if (this.isListening) {
      return false;
    }
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      
      options.onResult?.(transcript, isFinal);
      
      if (isFinal && options.onIntent) {
        const { intent, confidence, extractedData } = classifyIntent(transcript);
        options.onIntent(intent, confidence, extractedData);
      }
    };
    
    this.recognition.onerror = (event: SpeechRecognitionError) => {
      options.onError?.(event.error);
      this.isListening = false;
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd?.();
    };
    
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      options.onError?.('Failed to start recognition');
      return false;
    }
  }
  
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  isActive(): boolean {
    return this.isListening;
  }
}

// Text-to-Speech for responses
export class VoiceSynthesizer {
  private synth: SpeechSynthesis | null;
  private lang: string;
  
  constructor(lang: 'hi' | 'en' = 'hi') {
    this.synth = hasSpeechSynthesis() ? window.speechSynthesis : null;
    this.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  }
  
  setLanguage(lang: 'hi' | 'en'): void {
    this.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  }
  
  speak(text: string, options?: { rate?: number; pitch?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject('Speech synthesis not supported');
        return;
      }
      
      // Cancel any ongoing speech
      this.synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      
      // Try to find a voice for the language
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith(this.lang.split('-')[0]));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e.error);
      
      this.synth.speak(utterance);
    });
  }
  
  stop(): void {
    this.synth?.cancel();
  }
  
  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }
}

// Response generator based on intent
export const generateResponse = (intent: Intent, lang: 'hi' | 'en', data?: any): string => {
  const responses: Record<Intent, { hi: string; en: string }> = {
    add_income: {
      hi: data?.amount ? `₹${data.amount} आय जोड़ रहा हूं।` : 'राशि बताएं - कितने रुपये की आय?',
      en: data?.amount ? `Adding ₹${data.amount} as income.` : 'How much income do you want to add?'
    },
    add_expense: {
      hi: data?.amount ? `₹${data.amount} खर्च जोड़ रहा हूं।` : 'राशि बताएं - कितना खर्च हुआ?',
      en: data?.amount ? `Adding ₹${data.amount} as expense.` : 'How much did you spend?'
    },
    check_balance: {
      hi: 'आपका बैलेंस देख रहा हूं।',
      en: 'Checking your balance.'
    },
    check_mandi: {
      hi: 'मंडी भाव देख रहा हूं।',
      en: 'Checking market prices.'
    },
    check_weather: {
      hi: 'मौसम की जानकारी ला रहा हूं।',
      en: 'Getting weather information.'
    },
    open_calculator: {
      hi: 'कैलकुलेटर खोल रहा हूं।',
      en: 'Opening calculator.'
    },
    open_schemes: {
      hi: 'सरकारी योजनाएं दिखा रहा हूं।',
      en: 'Showing government schemes.'
    },
    open_lessons: {
      hi: 'पाठ खोल रहा हूं।',
      en: 'Opening lessons.'
    },
    help: {
      hi: 'मैं आपकी आय-खर्च, मंडी भाव, मौसम, और सरकारी योजनाओं में मदद कर सकता हूं।',
      en: 'I can help with income-expense, market prices, weather, and government schemes.'
    },
    unknown: {
      hi: 'माफ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें।',
      en: "Sorry, I didn't understand. Please try again."
    }
  };
  
  return responses[intent][lang];
};

// Create voice processor instance
export const createVoiceProcessor = (lang: 'hi' | 'en' = 'hi') => {
  const recognizer = new VoiceRecognizer(lang);
  const synthesizer = new VoiceSynthesizer(lang);
  
  return {
    recognizer,
    synthesizer,
    setLanguage: (newLang: 'hi' | 'en') => {
      recognizer.setLanguage(newLang);
      synthesizer.setLanguage(newLang);
    }
  };
};
