import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { startVoiceRecognition } from '../lib/voice-utils';

interface VoiceNavigationButtonProps {
  onNavigate: (view: string) => void;
  lang: string;
  currentView: string;
  onKhataAction?: (action: { type: 'add' | 'send' | 'receive', amount?: number }) => void;
}

// Enhanced voice command mappings with natural language phrases
const COMMAND_MAP: Record<string, string[]> = {
  'dashboard': [
    'dashboard', 'home', 'होम', 'डैशबोर्ड', 'घर', 'main', 'शुरू',
    'home page', 'मुख्य पेज', 'starting page', 'beginning'
  ],
  'khata': [
    'khata', 'wallet', 'खाता', 'वॉलेट', 'लेनदेन', 'account', 'हिसाब',
    'transaction', 'money', 'पैसा', 'balance', 'बैलेंस'
  ],
  'saathi': [
    'saathi', 'ai', 'assistant', 'साथी', 'सहायक', 'help', 'मदद',
    'advice', 'सलाह', 'पूछना', 'ask', 'question', 'सवाल'
  ],
  'mandi': [
    'mandi', 'market', 'prices', 'मंडी', 'बाजार', 'भाव', 'rate', 'दाम',
    'price', 'कीमत', 'selling', 'बेचना', 'sell'
  ],
  'yojana': [
    'yojana', 'scheme', 'schemes', 'योजना', 'योजनाएं', 'सरकारी',
    'government', 'benefit', 'लाभ', 'subsidy', 'सब्सिडी'
  ],
  'seekho': [
    'seekho', 'learn', 'education', 'सीखो', 'शिक्षा', 'पढ़ना',
    'study', 'ज्ञान', 'knowledge', 'training', 'प्रशिक्षण'
  ],
  'mausam': [
    'mausam', 'weather', 'मौसम', 'वातावरण', 'बारिश', 'rain',
    'गर्मी', 'heat', 'ठंड', 'cold', 'तापमान', 'temperature',
    'climate', 'forecast', 'पूर्वानुमान'
  ],
  'calculator': [
    'calculator', 'calculate', 'कैलकुलेटर', 'गणना', 'हिसाब',
    'calculation', 'जोड़', 'add', 'घटाना', 'subtract'
  ],
  'translator': [
    'translator', 'translate', 'अनुवादक', 'अनुवाद', 'भाषा',
    'language', 'बदलना', 'change', 'convert', 'translation'
  ],
  'community': [
    'community', 'समुदाय', 'सामुदायिक', 'लोग', 'people',
    'forum', 'मंच', 'discuss', 'चर्चा'
  ],
  'profile': [
    'profile', 'account', 'प्रोफाइल', 'खाता', 'settings',
    'सेटिंग', 'details', 'विवरण'
  ],
  'analytics': [
    'analytics', 'analysis', 'विश्लेषण', 'data', 'डेटा',
    'stats', 'statistics', 'आंकड़े', 'report', 'रिपोर्ट'
  ],
};

// Natural language intent detection phrases
const INTENT_PHRASES: Record<string, RegExp[]> = {
  'mandi': [
    /bhav|price|rate|दाम|कीमत|बेच/i,
    /mandi|market|मंडी|बाजार/i,
  ],
  'mausam': [
    /mausam|weather|मौसम|बारिश|rain/i,
    /temperature|तापमान|गर्मी|ठंड/i,
  ],
  'translator': [
    /translate|अनुवाद|भाषा|language/i,
    /convert|बदल|change/i,
  ],
  'calculator': [
    /calculat|गणना|हिसाब|calculation/i,
    /add|subtract|जोड़|घटा/i,
  ],
  'khata': [
    /transaction|लेनदेन|money|पैसा/i,
    /balance|बैलेंस|account|खाता/i,
  ],
  'saathi': [
    /help|मदद|advice|सलाह/i,
    /question|सवाल|पूछ|ask/i,
  ],
  'yojana': [
    /scheme|योजना|government|सरकारी/i,
    /benefit|लाभ|subsidy|सब्सिडी/i,
  ],
};

export const VoiceNavigationButton: React.FC<VoiceNavigationButtonProps> = ({ 
  onNavigate, 
  lang,
  currentView,
  onKhataAction
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState('');

  const parseCommand = (text: string): { view?: string; khataAction?: { type: 'add' | 'send' | 'receive'; amount?: number } } => {
    const lowerText = text.toLowerCase().trim();
    
    // Check for Khatabook-specific actions first
    const addMoneyRegex = /(add|deposit|जोड़|जमा).*?(\d+)/i;
    const sendMoneyRegex = /(send|pay|transfer|भेज|भुगतान).*?(\d+)/i;
    const receiveRegex = /(receive|get|payment|प्राप्त|पाना|qr)/i;
    
    const addMatch = text.match(addMoneyRegex);
    if (addMatch && addMatch[2]) {
      return { 
        view: 'khata',
        khataAction: { 
          type: 'add', 
          amount: parseInt(addMatch[2]) 
        }
      };
    }
    
    const sendMatch = text.match(sendMoneyRegex);
    if (sendMatch && sendMatch[2]) {
      return { 
        view: 'khata',
        khataAction: { 
          type: 'send', 
          amount: parseInt(sendMatch[2]) 
        }
      };
    }
    
    if (receiveRegex.test(lowerText)) {
      return { 
        view: 'khata',
        khataAction: { 
          type: 'receive' 
        }
      };
    }
    
    // First, try intent-based matching for natural language
    for (const [view, patterns] of Object.entries(INTENT_PHRASES)) {
      const matchCount = patterns.filter(pattern => pattern.test(lowerText)).length;
      if (matchCount > 0) {
        return { view };
      }
    }
    
    // Fallback to exact keyword matching
    for (const [view, commands] of Object.entries(COMMAND_MAP)) {
      if (commands.some(cmd => lowerText.includes(cmd.toLowerCase()))) {
        return { view };
      }
    }
    
    return {};
  };

  const handleVoiceInput = (text: string) => {
    setTranscript(text);
    const result = parseCommand(text);
    
    if (result.view || result.khataAction) {
      // Navigate to view if specified
      if (result.view) {
        onNavigate(result.view);
      }
      
      // Trigger Khatabook action if specified
      if (result.khataAction && onKhataAction) {
        setTimeout(() => {
          onKhataAction(result.khataAction!);
        }, 500); // Small delay to let navigation happen first
      }
      
      setIsListening(false);
      setTranscript('');
      setError('');
    } else {
      setError(lang === 'en' ? 'Command not recognized' : 'आदेश समझ नहींआया');
      setTimeout(() => {
        setError('');
        setTranscript('');
      }, 2000);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (recognition) {
        recognition.stop();
      }
      setIsListening(false);
      setTranscript('');
      setError('');
    } else {
      // Start listening
      setError('');
      setTranscript('');
      const recog = startVoiceRecognition(handleVoiceInput, lang);
      
      if (!recog) {
        setError(lang === 'en' ? 'Voice not supported' : 'आवाज समर्थित नहीं');
        setTimeout(() => setError(''), 2000);
        return;
      }

      recog.onerror = () => {
        setError(lang === 'en' ? 'Voice error' : 'आवाज त्रुटि');
        setIsListening(false);
        setTimeout(() => setError(''), 2000);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
      setIsListening(true);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        data-tour="voice"
        onClick={toggleListening}
        className={`group fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-lg transform transition-all duration-300 ease-out ${
          isListening 
            ? 'bg-red-500 scale-110 animate-pulse' 
            : 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] hover:scale-110'
        }`}
        style={{
          boxShadow: isListening 
            ? '0 0 30px rgba(239, 68, 68, 0.6), 0 10px 40px rgba(0, 0, 0, 0.3)'
            : 'var(--shadow-neon), 0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
        aria-label={isListening 
          ? (lang === 'en' ? 'Stop listening' : 'सुनना बंद करें')
          : (lang === 'en' ? 'Voice navigation' : 'आवाज नेविगेशन')
        }
        title={isListening
          ? (lang === 'en' ? 'Listening...' : 'सुन रहे हैं...')
          : (lang === 'en' ? 'Say a command' : 'आदेश बोलें')
        }
      >
        {isListening ? (
          <MicOff size={28} className="text-white" />
        ) : (
          <Mic size={28} className="text-white group-hover:scale-110 transition-transform duration-300" />
        )}
        
        {/* Pulsing animation ring */}
        {!isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-[var(--primary)] opacity-75 animate-ping"></span>
        )}
      </button>

      {/* Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full mx-4 border border-[var(--border)] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                <Mic size={24} className="text-red-500 animate-pulse" />
                {lang === 'en' ? 'Listening...' : 'सुन रहे हैं...'}
              </h3>
              <button 
                onClick={toggleListening}
                className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)]"
              >
                <X size={20} />
              </button>
            </div>
            
            {transcript && (
              <div className="mb-4 p-4 bg-[var(--bg-glass)] rounded-xl">
                <p className="text-[var(--text-main)] text-center">{transcript}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 rounded-xl border border-red-500/50">
                <p className="text-red-500 text-center text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-[var(--text-muted)] text-sm text-center">
                {lang === 'en' ? 'Try saying:' : 'कोशिश करें:'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {lang === 'en' 
                  ? ['Open Mandi', 'Show weather', 'I need to translate', 'Check prices', 'Saathi help'].map(cmd => (
                      <span key={cmd} className="px-3 py-1 bg-[var(--bg-glass)] rounded-full text-[var(--primary)] text-xs font-medium border border-[var(--border)]">
                        "{cmd}"
                      </span>
                    ))
                  : ['मंडी खोलो', 'मौसम बताओ', 'अनुवाद करना है', 'भाव देखो', 'साथी मदद'].map(cmd => (
                      <span key={cmd} className="px-3 py-1 bg-[var(--bg-glass)] rounded-full text-[var(--primary)] text-xs font-medium border border-[var(--border)]">
                        "{cmd}"
                      </span>
                    ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
