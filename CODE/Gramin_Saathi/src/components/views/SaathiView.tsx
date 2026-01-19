import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  setDoc 
} from 'firebase/firestore';
import { 
  Sparkles, 
  Send, 
  Mic, 
  Camera, 
  X, 
  Volume2, 
  Loader, 
  History, 
  Plus, 
  Trash2, 
  Sprout 
} from 'lucide-react';
import { db } from '../../lib/firebase-config';
import { speakText, startVoiceRecognition } from '../../lib/voice-utils';
import { 
  detectIntent, 
  matchSchemes, 
  recommendLoans, 
  predictInsuranceNeeds,
  calculateFinancialHealth,
  forecastCropPrices 
} from '../../lib/matching_algorithms';

// Markdown renderer for chat messages
const renderMarkdown = (text: string) => {
  // Bold text
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Bullet points - handle various formats
  formatted = formatted.replace(/^[•·●]\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> in <ul>
  formatted = formatted.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul class="list-disc ml-4 space-y-1">${match}</ul>`);
  
  // Line breaks
  formatted = formatted.replace(/\n\n/g, '<br/><br/>');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return formatted;
};

export function SaathiView({ user, profile, appId, t, lang }: any) {
  const [messages, setMessages] = useState([
    { role: 'model', text: t('saathi_intro').replace('{name}', profile?.name || (lang === 'en' ? 'Ji' : 'जी')) }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<number | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'chats'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setChatHistory(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as any);
    }, (error) => console.log("Chat history error:", error));
    return () => unsub();
  }, [user, appId]);

  const saveMessageToFirebase = async (userMsg: string, modelReply: string) => {
    if (!user) return;
    try {
      if (!chatId) {
        const chatRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chats'), {
          title: userMsg.substring(0, 50) + (userMsg.length > 50 ? '...' : ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setChatId(chatRef.id);
        
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatRef.id, 'messages'), {
          role: 'user', text: userMsg, timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatRef.id, 'messages'), {
          role: 'model', text: modelReply, timestamp: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId, 'messages'), {
          role: 'user', text: userMsg, timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId, 'messages'), {
          role: 'model', text: modelReply, timestamp: serverTimestamp()
        });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId), {
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error saving chat:", e);
    }
  };

  const startNewChat = () => {
    setChatId(null);
    setMessages([
      { role: 'model', text: t('saathi_intro').replace('{name}', profile?.name || (lang === 'en' ? 'Ji' : 'जी')) }
    ]);
  };

  // Update intro message when language changes, only if it's the only message (new chat)
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([
        { role: 'model', text: t('saathi_intro').replace('{name}', profile?.name || (lang === 'en' ? 'Ji' : 'जी')) }
      ]);
    }
  }, [lang, t, profile]);

  const loadChat = async (chatSessionId: string) => {
    if (!user) return;
    try {
      const messagesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatSessionId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      const loadedMessages = snapshot.docs.map(doc => ({
        role: doc.data().role,
        text: doc.data().text
      }));
      if (loadedMessages.length > 0) {
        setChatId(chatSessionId);
        setMessages(loadedMessages);
        setShowMobileHistory(false);
      }
    } catch (e) {
      console.error("Error loading chat:", e);
    }
  };

  const deleteChat = async (e: React.MouseEvent, chatSessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const messagesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chats', chatSessionId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chats', chatSessionId));
      if (chatId === chatSessionId) {
        startNewChat();
      }
    } catch (e) {
      console.error("Error deleting chat:", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const userMsg = input;
    const userImg = selectedImage; 
    setInput('');
    setSelectedImage(null); 
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg, image: userImg } as any]);
    setLoading(true);

    try {
      // 1. Detect Intent First - Use Local AI
      const intentResult = detectIntent(userMsg, lang);
      let localResponse = '';
      let useLocalOnly = false;

      // 2. Execute Local Algorithms Based on Intent (80-92% accuracy)
      if (intentResult.confidence > 0.6 && !userImg) {
        const farmerProfile = {
          state: profile?.state || 'Maharashtra',
          landholding: parseFloat(profile?.landSize || '2'),
          annualIncome: parseFloat(profile?.income || '100000'),
          crops: profile?.crop ? [profile?.crop] : ['wheat'],
          age: profile?.age || 35,
          hasLivestock: true
        };

        if (intentResult.intent === 'scheme_query') {
          const result = matchSchemes(farmerProfile);
          if (result.schemes.length > 0) {
            const top3 = result.schemes.slice(0, 3);
            localResponse = `**📋 Top ${top3.length} Schemes for You**\n`;
            top3.forEach((s, idx) => {
              localResponse += `\n${idx + 1}. **${s.name}** (**${s.matchScore}%** match)\n`;
              localResponse += `   • Benefit: ${s.estimatedBenefit}\n`;
              localResponse += `   • ${s.eligibilityReasons.join('\n   • ')}`;
              if (idx < top3.length - 1) localResponse += '\n';
            });
            useLocalOnly = true;
          }
        } 
        else if (intentResult.intent === 'loan_query') {
          const result = recommendLoans({
            ...farmerProfile,
            loanAmountNeeded: 200000,
            hasCollateral: true,
            collateralValue: 500000,
            purpose: 'equipment' as 'equipment'
          });
          if (result.bestOptions.length > 0) {
            const top3 = result.bestOptions.slice(0, 3);
            localResponse = `**🏦 Top ${top3.length} Loan Options**\n`;
            top3.forEach((l, idx) => {
              localResponse += `\n${idx + 1}. **${l.name}** (**${l.matchScore}%** match)\n`;
              localResponse += `   • Interest Rate: **${l.interestRate}%** per year\n`;
              localResponse += `   • Monthly EMI: **₹${l.monthlyEMI?.toLocaleString()}**\n`;
              localResponse += `   • ${l.positiveReasons.join('\n   • ')}`;
              if (idx < top3.length - 1) localResponse += '\n';
            });
            useLocalOnly = true;
          }
        }
        else if (intentResult.intent === 'insurance_query') {
          const result = predictInsuranceNeeds({
            state: profile?.state || 'Maharashtra',
            district: profile?.village || 'District',
            crops: farmerProfile.crops,
            landholding: farmerProfile.landholding,
            hasLivestock: farmerProfile.hasLivestock,
            irrigationType: 'drip'
          });
          if (result.suggestedProducts.length > 0) {
            const top3 = result.suggestedProducts.slice(0, 3);
            localResponse = `**🛡️ Insurance Recommendations**\n`;
            top3.forEach((ins, idx) => {
              localResponse += `\n${idx + 1}. **${ins.name}** (${ins.type})\n`;
              localResponse += `   • Farmer Premium: **₹${ins.farmerPremium?.toLocaleString() || 'N/A'}**\n`;
              localResponse += `   • Coverage: **${ins.coverage}%**\n`;
              localResponse += `   • Sum Insured: **₹${ins.sumInsured?.toLocaleString() || 'N/A'}**`;
              if (idx < top3.length - 1) localResponse += '\n';
            });
            localResponse += `\n\n**Risk Assessment:** ${result.riskLevel} Risk (**${result.overallRiskScore}%**)`;
            useLocalOnly = true;
          }
        }
        else if (intentResult.intent === 'financial_health') {
          const health = calculateFinancialHealth({
            annualIncome: farmerProfile.annualIncome,
            totalDebt: 50000,
            monthlyExpenses: farmerProfile.annualIncome / 15,
            landValue: farmerProfile.landholding * 500000,
            livestockValue: 100000,
            savingsAmount: 20000,
            creditScore: 650,
            loanRepaymentHistory: 'good' as 'good',
            dependents: 4
          });
          localResponse = `**💰 Financial Health: ${health.overallScore}/100** - ${health.riskLevel}\n`;
          localResponse += `\n**Breakdown:**\n`;
          health.factors.forEach(f => {
            localResponse += `• **${f.category}:** ${f.score}/100 (${f.status})\n`;
          });
          localResponse += `\n**Top Recommendations:**\n`;
          health.recommendations.slice(0, 3).forEach((r, i) => {
            localResponse += `${i + 1}. ${r}\n`;
          });
          useLocalOnly = true;
        }
        else if (intentResult.intent === 'price_query') {
          const prices = forecastCropPrices({
            cropName: profile?.crop || 'wheat',
            state: profile?.state || 'Maharashtra',
            currentPrice: 2500,
            historicalPrices: [2400, 2450, 2480, 2500],
            season: 'kharif' as 'kharif',
            weatherCondition: 'normal'
          });
          localResponse = `**📈 Price Forecast for ${profile?.crop || 'Wheat'}**\n`;
          localResponse += `**Current:** ₹${prices.currentPrice}/quintal\n`;
          localResponse += `\n**Forecasts:**\n`;
          localResponse += `• **30 days:** ₹${prices.forecasts.day30.avg} (Range: ₹${prices.forecasts.day30.min}-${prices.forecasts.day30.max})\n`;
          localResponse += `• **60 days:** ₹${prices.forecasts.day60.avg} (Range: ₹${prices.forecasts.day60.min}-${prices.forecasts.day60.max})\n`;
          localResponse += `• **90 days:** ₹${prices.forecasts.day90.avg} (Range: ₹${prices.forecasts.day90.min}-${prices.forecasts.day90.max})\n`;
          localResponse += `\n**Trend:** ${prices.priceChange} | **Confidence:** ${prices.confidence}%\n`;
          localResponse += `\n**Recommendations:**\n`;
          prices.recommendations.slice(0, 2).forEach((r, i) => {
            localResponse += `${i + 1}. ${r}\n`;
          });
          useLocalOnly = true;
        }
      }

      // 3. If local response is good, return it (saves API calls)
      if (useLocalOnly && localResponse) {
        setMessages(prev => [...prev, { role: 'model', text: localResponse }]);
        await saveMessageToFirebase(userMsg, localResponse);
        setLoading(false);
        return;
      }

      // 4. Otherwise, use Gemini with condensed context
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      // Condensed context to save tokens
      let compactContext = `User: ${profile?.name || 'Farmer'}, ${profile?.village || 'Village'}, ${profile?.state || 'State'}`;
      if (profile?.crop) compactContext += `, Crop: ${profile.crop}`;
      if (profile?.landSize) compactContext += `, Land: ${profile.landSize}ha`;
      if (profile?.income) compactContext += `, Income: ₹${profile.income}/yr`;
      if (profile?.age) compactContext += `, Age: ${profile.age}`;
      if (profile?.category) compactContext += `, Category: ${profile.category}`;
      
      const weatherCache = localStorage.getItem('weather_cache');
      if (weatherCache) {
        try {
          const { data } = JSON.parse(weatherCache);
          if (data?.weather) {
            const w = data.weather;
            compactContext += `, Weather: ${Math.round(w.main.temp)}°C ${w.weather[0]?.description}`;
          }
        } catch (e) {}
      }

      const systemInstruction = `You are Gramin Saathi AI. ${compactContext}. 
      STRICT LANGUAGE RULE: You MUST speak ONLY in ${lang === 'en' ? 'English' : 'Hindi'}. 
      If the user speaks English, you reply in ${lang === 'en' ? 'English' : 'Hindi'}. 
      If the user speaks Hindi, you reply in ${lang === 'en' ? 'English' : 'Hindi'}. 
      Do NOT mix languages. ${localResponse ? 'Context: ' + localResponse.substring(0, 200) : ''} Be concise, practical, respectful. Use metaphors for finance.`;

      // Only send last 5 messages to save tokens
      const history = messages.slice(-5).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const currentParts: any[] = [];
      if (userMsg) currentParts.push({ text: userMsg });
      if (userImg) {
        currentParts.push({ 
          inlineData: { 
            mimeType: "image/jpeg", 
            data: userImg.split(',')[1] 
          } 
        });
        currentParts.push({ text: "Analyze: crop disease or document summary." });
      }

      // Use v1 API and move system instruction to prompt for maximum compatibility
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...history, 
            { 
              role: 'user', 
              parts: [
                { text: `SYSTEM INSTRUCTION: ${systemInstruction}\n\nUSER_MESSAGE: ${userMsg || (userImg ? "Analyze this image" : "")}` },
                ...currentParts.filter(p => !p.text || p.text !== userMsg) // Avoid duplicating the text if it was also in currentParts
              ] 
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API Error:', data);
        if (response.status === 429) {
          throw new Error(lang === 'hi' ? 'साथी अभी व्यस्त है, कृपया एक मिनट बाद पुनः प्रयास करें।' : 'Saathi is a bit busy right now. Please try again in about a minute.');
        }
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I encountered an error.";
      
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      await saveMessageToFirebase(userMsg, reply);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: e.message || (lang === 'hi' ? 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।' : "Network error. Please try again.") }]);
    } finally {
      setLoading(false);
    }
  };

  const playTTS = (text: string, index: number) => {
    // Strip markdown formatting for clean TTS
    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
      .replace(/\*(.+?)\*/g, '$1')       // Remove italic
      .replace(/[\u2022\u00b7\u25cf]/g, '') // Remove bullets
      .replace(/\d+\.\s+/g, '')          // Remove numbered lists
      .replace(/\n+/g, '. ')              // Replace line breaks with pauses
      .trim();
    
    speakText(cleanText, lang);
    setAudioPlaying(index);
    setTimeout(() => setAudioPlaying(null), 3000);
  };

  return (
    <div className="flex gap-2 md:gap-6 h-full max-h-[80vh] relative">
      {/* Mobile History Overlay */}
      {showMobileHistory && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileHistory(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--bg-main)] border-r border-[var(--border)] flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] text-sm">{lang === 'en' ? 'Chat History' : 'चैट इतिहास'}</h3>
              <button onClick={() => setShowMobileHistory(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)]">
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              <button onClick={() => { startNewChat(); setShowMobileHistory(false); }} className="w-full py-2 flex items-center justify-center gap-2 btn-white rounded-lg text-sm">
                <Plus size={16} />
                {lang === 'en' ? 'New Chat' : 'नई चर्चा'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {chatHistory.map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => { loadChat(item.id); setShowMobileHistory(false); }}
                  className={`p-2.5 rounded-lg cursor-pointer text-xs text-[var(--text-main)] border transition-colors group flex items-start justify-between gap-2 ${chatId === item.id ? 'bg-[var(--primary)]/20 border-[var(--primary)]' : 'hover:bg-[var(--bg-card-hover)] border-transparent'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                  </div>
                  <button 
                    onClick={(e) => deleteChat(item.id as any, e as any)}
                    className="p-1 hover:bg-red-500/20 rounded transition-all text-[var(--text-muted)] hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-64 glass rounded-3xl overflow-hidden shrink-0 border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)]">
          <button onClick={startNewChat} className="w-full py-3 flex items-center justify-center gap-2 bg-[var(--primary)] text-black rounded-xl font-bold shadow-lg">
            <Plus size={18} />
            {lang === 'en' ? 'New Chat' : 'नई चर्चा'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatHistory.map((item: any) => (
            <div 
              key={item.id} 
              onClick={() => loadChat(item.id)}
              className={`p-3 rounded-xl cursor-pointer text-sm border transition-all flex items-center justify-between group ${chatId === item.id ? 'bg-[var(--primary)] text-black font-bold' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'}`}
            >
              <p className="truncate flex-1">{item.title}</p>
              <button 
                onClick={(e) => deleteChat(e, item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all text-[var(--text-muted)] hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass rounded-3xl flex flex-col overflow-hidden border border-[var(--border)] shadow-2xl">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-glass)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white">
              <Sprout size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-main)]">Saathi AI</h3>
              <p className="text-xs text-[var(--success)]">Online</p>
            </div>
          </div>
          <button onClick={() => setShowMobileHistory(true)} className="md:hidden p-2 rounded-lg bg-[var(--bg-input)]">
            <History size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m: any, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.image && (
                 <img src={m.image} alt="Upload" className="w-48 h-48 object-cover rounded-2xl mb-2 border border-[var(--border)] shadow-md" />
              )}
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-[var(--primary)] text-black rounded-br-none' : 'bg-[var(--bg-input)] text-[var(--text-main)] rounded-bl-none border border-[var(--border)]'}`}>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                {m.role === 'model' && (
                  <button onClick={() => playTTS(m.text, i)} className="mt-2 text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1 text-[10px] font-bold uppercase">
                    {audioPlaying === i ? <Loader size={12} className="animate-spin" /> : <Volume2 size={12} />}
                    {audioPlaying === i ? 'Playing...' : 'Play'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-[var(--bg-input)] p-4 rounded-3xl rounded-bl-none flex gap-1.5 items-center">
                 <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
             </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-[var(--bg-glass)] border-t border-[var(--border)]">
          {selectedImage && (
            <div className="mb-2 relative w-20 h-20">
              <img src={selectedImage} className="w-full h-full object-cover rounded-xl border border-[var(--border)]" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
            </div>
          )}
          <div className="flex gap-2 items-center bg-[var(--bg-input)] p-2 rounded-2xl border border-[var(--border)]">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
              <Camera size={20} />
            </button>
            <button 
              onClick={() => {
                if (isListening) {
                  setIsListening(false);
                  return;
                }
                setIsListening(true);
                const recognition = startVoiceRecognition((text) => {
                  setInput(prev => prev + (prev ? ' ' : '') + text);
                  setIsListening(false);
                }, lang);
                if (!recognition) {
                  setIsListening(false);
                  alert(lang === 'en' ? 'Voice not supported' : 'आवाज समर्थित नहीं');
                }
              }}
              className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--primary)]'}`}
            >
              <Mic size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('ai_prompt')}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2"
            />
            <button onClick={handleSend} disabled={loading} className="p-3 bg-[var(--primary)] text-black rounded-xl">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
