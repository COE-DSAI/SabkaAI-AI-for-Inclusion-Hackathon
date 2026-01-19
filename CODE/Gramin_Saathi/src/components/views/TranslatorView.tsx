import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ArrowLeftRight, 
  Mic, 
  Volume2, 
  Loader, 
  History 
} from 'lucide-react';

export function TranslatorView({ t, lang, user, db, appId }: any) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('hi');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Load translation history from Firebase
  useEffect(() => {
    if (!user || !db) return;
    
    const loadHistory = async () => {
      try {
        const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'translations');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        const items: any[] = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        setHistory(items);
      } catch (err) {
        console.error('Error loading translation history:', err);
      }
    };
    
    loadHistory();
  }, [user, db, appId]);

  // Save translation to history
  const saveToHistory = async (input: string, output: string, from: string, to: string) => {
    if (!user || !db || !input || !output) return;
    
    try {
      const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'translations');
      const newItem = {
        inputText: input.slice(0, 200),
        outputText: output.slice(0, 200),
        fromLang: from,
        toLang: to,
        createdAt: serverTimestamp()
      };
      await addDoc(historyRef, newItem);
      setHistory(prev => [{ ...newItem, id: Date.now().toString() }, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error('Error saving translation:', err);
    }
  };

  const languages = [
    { code: 'en', name: lang === 'en' ? 'English' : 'अंग्रेज़ी', voice: 'en-US' },
    { code: 'hi', name: lang === 'en' ? 'Hindi' : 'हिंदी', voice: 'hi-IN' },
    { code: 'mr', name: lang === 'en' ? 'Marathi' : 'मराठी', voice: 'mr-IN' },
    { code: 'gu', name: lang === 'en' ? 'Gujarati' : 'गुजराती', voice: 'gu-IN' },
    { code: 'pa', name: lang === 'en' ? 'Punjabi' : 'पंजाबी', voice: 'pa-IN' },
    { code: 'bn', name: lang === 'en' ? 'Bengali' : 'बंगाली', voice: 'bn-IN' },
    { code: 'ta', name: lang === 'en' ? 'Tamil' : 'तमिल', voice: 'ta-IN' },
    { code: 'te', name: lang === 'en' ? 'Telugu' : 'तेलुगू', voice: 'te-IN' },
    { code: 'hr', name: lang === 'en' ? 'Haryanvi' : 'हरियाणवी', voice: 'hi-IN' },
    { code: 'bh', name: lang === 'en' ? 'Bhojpuri' : 'भोजपुरी', voice: 'hi-IN' },
  ];

  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  // Voice Input (Speech-to-Text)
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'en' ? 'Voice input not supported. Try Chrome/Edge.' : 'वॉयस इनपुट सपोर्ट नहीं है। Chrome/Edge ट्राई करें।');
      return;
    }
    
    const recognition = new SpeechRecognition();
    const selectedLang = languages.find(l => l.code === fromLang);
    recognition.lang = selectedLang?.voice || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Text-to-Speech
  const speakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'en' ? 'Text-to-speech not supported.' : 'टेक्स्ट-टू-स्पीच सपोर्ट नहीं है।');
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedLang = languages.find(l => l.code === langCode);
    utterance.lang = selectedLang?.voice || 'en-US';
    utterance.rate = 0.9;
    
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Offline dictionary for common terms
  const offlineDictionary: {[key: string]: {[key: string]: string}} = {
    'en_hi': {
      'farmer': 'किसान', 'crop': 'फसल', 'soil': 'मिट्टी', 'water': 'पानी', 'seed': 'बीज',
      'loan': 'ऋण', 'money': 'पैसा', 'bank': 'बैंक', 'insurance': 'बीमा', 'weather': 'मौसम',
      'rain': 'बारिश', 'harvest': 'फसल कटाई', 'tractor': 'ट्रैक्टर', 'fertilizer': 'खाद',
      'market': 'बाजार', 'price': 'कीमत', 'government': 'सरकार', 'scheme': 'योजना',
      'help': 'मदद', 'hello': 'नमस्ते', 'thank you': 'धन्यवाद', 'yes': 'हाँ', 'no': 'नहीं',
      'today': 'आज', 'tomorrow': 'कल', 'how much': 'कितना', 'where': 'कहाँ', 'when': 'कब'
    },
    'hi_en': {
      'किसान': 'farmer', 'फसल': 'crop', 'मिट्टी': 'soil', 'पानी': 'water', 'बीज': 'seed',
      'ऋण': 'loan', 'पैसा': 'money', 'बैंक': 'bank', 'बीमा': 'insurance', 'मौसम': 'weather',
      'बारिश': 'rain', 'खाद': 'fertilizer', 'बाजार': 'market', 'कीमत': 'price',
      'सरकार': 'government', 'योजना': 'scheme', 'मदद': 'help', 'नमस्ते': 'hello',
      'धन्यवाद': 'thank you', 'हाँ': 'yes', 'नहीं': 'no', 'आज': 'today', 'कल': 'tomorrow'
    }
  };

  const offlineFallback = (text: string) => {
    const dictKey = `${fromLang}_${toLang}`;
    const dict = offlineDictionary[dictKey] || {};
    
    const lowerText = text.toLowerCase().trim();
    if (dict[lowerText]) {
      return { text: dict[lowerText], offline: true };
    }
    
    let result = text;
    let translated = false;
    Object.keys(dict).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      if (result.match(regex)) {
        result = result.replace(regex, dict[key]);
        translated = true;
      }
    });
    
    if (translated) {
      return { text: result + ' (Offline)', offline: true };
    }
    
    return { 
      text: lang === 'en' 
        ? 'Translation unavailable offline. Connect to internet.' 
        : 'अनुवाद ऑफ़लाइन उपलब्ध नहीं। इंटरनेट से कनेक्ट करें।',
      offline: true,
      failed: true
    };
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          from: fromLang,
          to: toLang
        })
      });

      const data = await response.json();
      
      if (data.success && data.translatedText) {
        setOutputText(data.translatedText);
        saveToHistory(inputText, data.translatedText, fromLang, toLang);
        setLoading(false);
        return;
      }
      
      throw new Error(data.error || 'Translation failed');
    } catch (e) {
      console.error('Translation error, using offline fallback:', e);
      const fallback = offlineFallback(inputText);
      setOutputText(fallback.text);
    }
    setLoading(false);
  };

  return (
    <div className="w-full md:max-w-4xl md:mx-auto space-y-4 md:space-y-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <ArrowLeftRight className="text-[var(--primary)]" />
          {lang === 'en' ? 'Voice Translator' : 'वॉयस अनुवादक'}
        </h2>
        <p className="text-[var(--text-muted)]">{lang === 'en' ? 'Speak or type to translate between Indian languages' : 'भारतीय भाषाओं में अनुवाद के लिए बोलें या टाइप करें'}</p>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-6">
          <select value={fromLang} onChange={(e) => setFromLang(e.target.value)} className="flex-1 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] font-medium text-sm md:text-base">
            {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <button onClick={swapLanguages} className="p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shrink-0"><ArrowLeftRight size={20} /></button>
          <select value={toLang} onChange={(e) => setToLang(e.target.value)} className="flex-1 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] font-medium text-sm md:text-base">
            {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={lang === 'en' ? 'Enter text or tap mic to speak...' : 'टेक्स्ट दर्ज करें या माइक टैप करें...'} className="w-full h-44 p-4 pb-14 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <button onClick={startVoiceInput} disabled={isListening} className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--bg-glass)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'}`}><Mic size={20} /></button>
              {inputText && <button onClick={() => speakText(inputText, fromLang)} disabled={isSpeaking} className="p-3 rounded-full bg-[var(--bg-glass)] text-[var(--text-muted)] hover:text-[var(--primary)]"><Volume2 size={20} /></button>}
            </div>
            {isListening && <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"><div className="text-white text-center"><Mic size={40} className="mx-auto mb-2 animate-pulse" /><p>{lang === 'en' ? 'Listening...' : 'सुन रहा हूं...'}</p></div></div>}
          </div>

          <div className="relative">
            <div className="w-full h-44 p-4 pb-14 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-main)] overflow-y-auto">
              {loading ? <div className="flex items-center justify-center h-full"><Loader className="animate-spin text-[var(--primary)]" size={28} /></div> : (outputText || <span className="text-[var(--text-muted)]">{lang === 'en' ? 'Translation will appear here' : 'अनुवाद यहां दिखाई देगा'}</span>)}
            </div>
            {outputText && !loading && <div className="absolute bottom-3 right-3"><button onClick={() => speakText(outputText, toLang)} disabled={isSpeaking} className={`p-3 rounded-full transition-all ${isSpeaking ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'}`}><Volume2 size={20} /></button></div>}
          </div>
        </div>

        <button onClick={handleTranslate} disabled={loading || !inputText.trim()} className="mt-4 w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {loading ? <Loader className="animate-spin" size={18} /> : <ArrowLeftRight size={18} />}
          {lang === 'en' ? 'Translate' : 'अनुवाद करें'}
        </button>

        <div className="mt-4 p-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2"><Mic size={14} className="text-[var(--primary)]" /> {lang === 'en' ? 'Tip: Tap the mic button to speak in your language' : 'टिप: अपनी भाषा में बोलने के लिए माइक बटन टैप करें'}</p>
        </div>
      </div>

      {user && history.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-[var(--shadow-card)]">
          <h3 className="font-bold text-[var(--text-main)] mb-3 flex items-center gap-2"><History size={18} className="text-[var(--primary)]" /> {lang === 'en' ? 'Recent Translations' : 'हाल के अनुवाद'}</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.slice(0, 15).map((item: any, idx) => (
              <div key={idx} onClick={() => { setInputText(item.inputText); setOutputText(item.outputText); setFromLang(item.fromLang); setToLang(item.toLang); }} className="p-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-colors group">
                <div className="text-xs text-[var(--text-muted)] mb-1 flex items-center justify-between">
                  <span>{languages.find(l => l.code === item.fromLang)?.name} → {languages.find(l => l.code === item.toLang)?.name}</span>
                  <span className="text-[10px]">{item.createdAt?.toDate?.()?.toLocaleDateString() || ''}</span>
                </div>
                <p className="text-sm text-[var(--text-main)] line-clamp-1">{item.inputText}</p>
                <p className="text-sm text-[var(--primary)] line-clamp-1">{item.outputText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
