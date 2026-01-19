// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb, Volume2, Loader } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  language: 'en' | 'hi';
  category?: string;
}

// Financial QnA Database
const FINANCIAL_QNA = {
  "schemes": [
    {
      q_en: "What is PM-KISAN scheme?",
      q_hi: "PM-KISAN योजना क्या है?",
      a_en: "PM-KISAN provides ₹6,000/year direct income support in 3 installments of ₹2,000 each. All farmer families with land are eligible except high-income professionals.",
      a_hi: "PM-KISAN योजना किसान परिवारों को सालाना ₹6,000 की सीधी आय देती है - ₹2,000 की 3 किस्तों में।"
    },
    {
      q_en: "How to apply for PM-KISAN?",
      q_hi: "PM-KISAN के लिए आवेदन कैसे करें?",
      a_en: "Apply online at pmkisan.gov.in or through village agriculture officer. Need: Aadhar, bank account, land documents. Registration is free!",
      a_hi: "pmkisan.gov.in पर ऑनलाइन या गांव के कृषि अधिकारी के माध्यम से आवेदन करें। आधार, बैंक खाता, भूमि दस्तावेज चाहिए।"
    }
  ],
  "insurance": [
    {
      q_en: "What is PM-Fasal Bima Yojana?",
      q_hi: "PM-फसल बीमा योजना क्या है?",
      a_en: "Government crop insurance scheme. Premium: ₹100-300/acre. Covers 70% of crop loss from drought, flood, pests. File claim within 72 hours of damage.",
      a_hi: "सरकारी फसल बीमा योजना। Premium: ₹100-300 प्रति एकड़। सूखा, बाढ़, कीट से 70% तक नुकसान कवर।"
    },
    {
      q_en: "How to claim crop insurance?",
      q_hi: "फसल बीमा का दावा कैसे करें?",
      a_en: "Report loss to insurance agent within 72 hours with photos. Provide village officer report. Claim processed in 2-3 months.",
      a_hi: "नुकसान की रिपोर्ट 72 घंटे में फोटो के साथ दें। तहसील अधिकारी की रिपोर्ट दें। 2-3 महीने में दावा मिलता है।"
    }
  ],
  "loans": [
    {
      q_en: "What types of farm loans exist?",
      q_hi: "कृषि ऋण कितने प्रकार के हैं?",
      a_en: "Short-term (7% interest): Seeds, fertilizer. Medium-term (9%): Equipment. Long-term (10%): Irrigation. Tenure: 9 months to 5 years. Apply at bank or cooperative.",
      a_hi: "अल्पकालीन (7%): बीज, खाद। मध्यम अवधि (9%): उपकरण। दीर्घकालीन (10%): सिंचाई। बैंक या सहकारी समिति से आवेदन करें।"
    }
  ],
  "banking": [
    {
      q_en: "Why do I need a bank account?",
      q_hi: "मुझे बैंक खाता क्यों चाहिए?",
      a_en: "Get government payments (PM-KISAN), loans easily, digital payments, insurance benefits. Jan Dhan: free account with zero balance, RuPay card, ₹1 lakh life insurance!",
      a_hi: "सरकारी भुगतान, ऋण, डिजिटल भुगतान, बीमा लाभ। जन धन: मुफ्त खाता, RuPay कार्ड, ₹1 लाख बीमा।"
    },
    {
      q_en: "How to use UPI for payments?",
      q_hi: "UPI कैसे काम करता है?",
      a_en: "Download Google Pay/PhonePe, enter bank details & PIN. Select merchant → enter amount → confirm. Transfers instantly, 0% charges! Safer than cash.",
      a_hi: "Google Pay/PhonePe डाउनलोड करें। विक्रेता चुनें → राशि दर्ज करें → PIN से पुष्टि करें। तुरंत ट्रांसफर, कोई चार्ज नहीं।"
    }
  ]
};

// Simple string matching for chatbot
function findAnswer(userQuery: string, language: 'en' | 'hi'): { answer: string; category: string } | null {
  const query = userQuery.toLowerCase();
  
  for (const [category, faqs] of Object.entries(FINANCIAL_QNA)) {
    for (const faq of faqs) {
      const q = language === 'en' ? faq.q_en.toLowerCase() : faq.q_hi.toLowerCase();
      // Simple matching - in production use NLP/embeddings
      if (query.includes(q.split(' ')[0]) || q.includes(query.split(' ')[0])) {
        return {
          answer: language === 'en' ? faq.a_en : faq.a_hi,
          category
        };
      }
    }
  }
  return null;
}

export const FinancialChatbot = ({ lang }: { lang: 'en' | 'hi' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      text: lang === 'en' 
        ? "👋 Hi! I'm your Financial Literacy Assistant. Ask me about PM-KISAN, crop insurance, farm loans, banking, or any financial topic!"
        : "👋 नमस्ते! मैं आपका वित्तीय साक्षरता सहायक हूँ। PM-KISAN, फसल बीमा, ऋण, बैंकिंग के बारे में पूछें!",
      language: lang
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      language: lang
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate bot thinking
    setTimeout(() => {
      const answer = findAnswer(input, lang);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: answer?.answer || (lang === 'en' 
          ? "I didn't quite understand that. Try asking about PM-KISAN, crop insurance, farm loans, or banking."
          : "मुझे समझ नहीं आया। PM-KISAN, फसल बीमा, ऋण या बैंकिंग के बारे में पूछने की कोशिश करें।"),
        language: lang,
        category: answer?.category
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);
    }, 800);
  };

  const suggestedQuestions = lang === 'en' 
    ? ["What is PM-KISAN?", "How to get farm loan?", "Crop insurance benefits", "Bank account for farmers"]
    : ["PM-KISAN क्या है?", "खेती का ऋण कैसे लें?", "फसल बीमा के फायदे", "किसान के लिए बैंक खाता"];

  return (
    <div className="glass rounded-2xl h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-bold text-[var(--text-main)]">
            {lang === 'en' ? '💰 Financial Literacy Bot' : '💰 वित्तीय साक्षरता बॉट'}
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {lang === 'en' 
            ? 'Learn about schemes, loans, insurance & banking' 
            : 'योजना, ऋण, बीमा और बैंकिंग के बारे में जानें'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-3 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-[var(--primary)] text-black'
                  : 'bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)]'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {msg.category && (
                <span className="text-xs mt-2 opacity-70 inline-block">
                  📁 {msg.category}
                </span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-input)] px-4 py-3 rounded-lg border border-[var(--border)]">
              <Loader className="w-4 h-4 animate-spin text-[var(--primary)]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-4 py-3 border-t border-[var(--border)] space-y-2">
          <p className="text-xs text-[var(--text-muted)] font-medium">
            {lang === 'en' ? 'Suggested questions:' : 'सुझाए गए प्रश्न:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1 bg-[var(--bg-input)] text-[var(--text-muted)] rounded-full hover:text-[var(--text-main)] hover:bg-[var(--primary)]/20 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={lang === 'en' ? 'Ask about schemes, loans, insurance...' : 'योजना, ऋण, बीमा के बारे में पूछें...'}
            className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-2 bg-[var(--primary)] text-black rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
