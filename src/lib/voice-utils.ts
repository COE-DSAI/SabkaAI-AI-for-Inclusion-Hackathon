// --- VOICE FUNCTIONS ---
export const speakText = (text: string, lang = 'en') => {
  if (!('speechSynthesis' in window)) return false;
  
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Map language codes to speech synthesis languages
  const langMap: any = {
    'hi': 'hi-IN',
    'pa': 'pa-IN', // Punjabi
    'te': 'te-IN', // Telugu
    'ta': 'ta-IN', // Tamil
    'kn': 'kn-IN', // Kannada
    'ml': 'ml-IN', // Malayalam
    'gu': 'gu-IN', // Gujarati
    'mr': 'mr-IN', // Marathi
    'bn': 'bn-IN', // Bengali
    'en': 'en-IN'
  };
  
  utterance.lang = langMap[lang] || 'en-IN';
  utterance.rate = 0.85; // Slower for better clarity
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Try to find a voice for the language
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith(langMap[lang]?.split('-')[0]));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  window.speechSynthesis.speak(utterance);
  return true;
};

export const startVoiceRecognition = (onResult: (text: string) => void, lang = 'en') => {
  // @ts-ignore
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    return null;
  }
  
  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };
  
  recognition.start();
  return recognition;
};
