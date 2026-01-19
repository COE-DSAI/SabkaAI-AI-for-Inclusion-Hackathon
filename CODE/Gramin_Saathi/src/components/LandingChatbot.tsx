import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Mic } from 'lucide-react';

interface LandingChatbotProps {
  lang: string;
}

export const LandingChatbot: React.FC<LandingChatbotProps> = ({ lang }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: lang === 'en' 
        ? '👋 Hi! I\'m Gramin Saathi AI. Ask me anything about farming, schemes, or how this app can help you!' 
        : '👋 नमस्ते! मैं ग्रामीण साथी AI हूं। खेती, योजनाओं या ऐप के बारे में कुछ भी पूछें!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Update intro message when language changes, only if it's the only message
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([
        {
          role: 'assistant',
          content: lang === 'en' 
            ? '👋 Hi! I\'m Gramin Saathi AI. Ask me anything about farming, schemes, or how this app can help you!' 
            : '👋 नमस्ते! मैं ग्रामीण साथी AI हूं। खेती, योजनाओं या ऐप के बारे में कुछ भी पूछें!'
        }
      ]);
    }
  }, [lang]);

  const scrollToBottom = () => {
    // Scroll only within the chatbot container, not the entire page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startVoiceInput = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'en' ? 'Voice input not supported in this browser' : 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      const systemInstruction = lang === 'en'
        ? `You are Gramin Saathi AI, a helpful farming assistant for Indian farmers. 
           CRITICAL: You MUST respond ONLY in English. Even if the user asks in Hindi, answer in English.
           Keep responses concise (2-3 sentences), practical, and encouraging. Focus on: farming tips, government schemes, mandi prices, weather, and app features. Be warm and respectful.`
        : `आप ग्रामीण साथी AI हैं, भारतीय किसानों के लिए एक सहायक। 
           CRITICAL: आपको केवल हिंदी (Hindi) में ही उत्तर देना है। भले ही उपयोगकर्ता अंग्रेजी में पूछे, आप हिंदी में ही जवाब दें।
           जवाब संक्षिप्त (2-3 वाक्य), व्यावहारिक और उत्साहजनक रखें। खेती, सरकारी योजनाओं, मंडी भाव, मौसम और ऐप फीचर्स पर ध्यान दें।`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              role: 'user', 
              parts: [{ text: `${systemInstruction}\n\nQuestion: ${userMessage}` }] 
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API Error:', data);
        throw new Error(data.error?.message || 'API Error');
      }
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        (lang === 'en' ? 'Sorry, I couldn\'t generate a response.' : 'क्षमा करें, मैं जवाब नहीं दे सका।');

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: lang === 'en' 
          ? '❌ Network error. Please try again.' 
          : '❌ नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const suggestedQuestions = lang === 'en' 
    ? [
        'What is PM-KISAN scheme?',
        'How to check mandi prices?',
        'Weather tips for farming',
        'Tell me about this app'
      ]
    : [
        'PM-KISAN योजना क्या है?',
        'मंडी भाव कैसे चेक करें?',
        'खेती के लिए मौसम टिप्स',
        'इस ऐप के बारे में बताओ'
      ];

  return (
    <div className="bg-[#0d2922] rounded-3xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-[#0a1f1a] border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#c8e038]/20">
            <Sparkles size={24} className="text-[#c8e038]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">
              {lang === 'en' ? 'Try Saathi AI' : 'साथी AI आज़माएं'}
            </h3>
            <p className="text-white/60 text-sm">
              {lang === 'en' ? 'Ask anything about farming' : 'खेती के बारे में कुछ भी पूछें'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Reduced height */}
      <div ref={messagesContainerRef} className="h-[250px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#c8e038] text-[#0a1f1a]'
                  : 'bg-[#0a1f1a] text-white border border-white/10'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#0a1f1a] rounded-2xl px-4 py-3 border border-white/10">
              <Loader2 size={16} className="animate-spin text-[#c8e038]" />
            </div>
          </div>
        )}
        
        {/* Suggested Questions - Inside scrollable area for consistent height */}
        {messages.length === 1 && !isLoading && (
          <div className="pt-4">
            <p className="text-white/60 text-xs mb-2">
              {lang === 'en' ? '💡 Try asking:' : '💡 पूछने की कोशिश करें:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 bg-[#0a1f1a] hover:bg-[#c8e038]/20 border border-white/10 hover:border-[#c8e038]/50 rounded-full text-white/80 hover:text-white text-xs transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input with Voice Button */}
      <div className="border-t border-white/10 p-4 bg-[#0a1f1a]">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
            return false;
          }}
          className="flex gap-2"
        >
          <button
            type="button"
            onClick={startVoiceInput}
            disabled={isListening || isLoading}
            className={`px-3 py-3 rounded-xl transition-colors ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-[#0d2922] hover:bg-[#c8e038]/20 text-white border border-white/10 hover:border-[#c8e038]/50'
            }`}
            title={lang === 'en' ? 'Voice input' : 'वॉइस इनपुट'}
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSend();
              }
            }}
            placeholder={lang === 'en' ? 'Type your question...' : 'अपना सवाल टाइप करें...'}
            className="flex-1 px-4 py-3 bg-[#0d2922] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#c8e038]/50 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-[#c8e038] hover:bg-[#d4ea4d] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[#0a1f1a] transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
