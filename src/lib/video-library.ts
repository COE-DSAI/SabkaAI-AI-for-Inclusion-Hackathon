/**
 * Video Library Utility
 * Manages language-based video discovery and playback
 */

export interface Video {
  id: string;
  title: string;
  topic: string;
  language: 'hindi' | 'english' | 'punjabi' | 'marathi' | 'bengali';
  path: string;
  thumbnail?: string;
  category: 'demo' | 'learn';
}

// Video catalog based on actual files in public/vid/
export const VIDEO_LIBRARY: Video[] = [
  // Hindi Videos
  {
    id: 'demo-hindi',
    title: 'ग्रामीण सहायक - डेमो',
    topic: 'App Demo',
    language: 'hindi',
    path: '/vid/hindi/GraminSahayak-Hindi.mp4',
    category: 'demo'
  },
  {
    id: 'demo-english',
    title: 'Gramin Sahayak - Demo',
    topic: 'App Demo',
    language: 'english',
    path: '/vid/english/GraminSahayak-English.mp4',
    category: 'demo'
  },
  {
    id: 'banking-hindi',
    title: 'डिजिटल बैंकिंग मूल बातें',
    topic: 'Digital Banking Basics',
    language: 'hindi',
    path: '/vid/hindi/Learn - Digital Banking Basics - hindi.mp4',
    category: 'learn'
  },
  {
    id: 'market-hindi',
    title: 'बाजार मूल्य और एमएसपी',
    topic: 'Market Prices & MSP',
    language: 'hindi',
    path: '/vid/hindi/Learn - Market Prices & MSP - hindi.mp4',
    category: 'learn'
  },
  {
    id: 'insurance-hindi',
    title: 'फसल बीमा आवश्यक',
    topic: 'Crop Insurance Essentials',
    language: 'hindi',
    path: '/vid/hindi/Learn - Crop insurance essentials - hindi.mp4',
    category: 'learn'
  },
  {
    id: 'fraud-hindi',
    title: 'धोखाधड़ी रोकथाम',
    topic: 'Fraud Prevention',
    language: 'hindi',
    path: '/vid/hindi/Learn- Fraud prevention - Hindi.mp4',
    category: 'learn'
  },
  {
    id: 'money-hindi',
    title: 'स्मार्ट मनी मैनेजमेंट',
    topic: 'Smart Money Management',
    language: 'hindi',
    path: '/vid/hindi/Learn-Smart Money Management-Hindi.mp4',
    category: 'learn'
  },
  
  // Punjabi Videos
  {
    id: 'demo-punjabi',
    title: 'ਗਰਾਮੀਣ ਸਹਾਇਕ - ਡੈਮੋ',
    topic: 'App Demo',
    language: 'punjabi',
    path: '/vid/punjabi/GraminSahayak-Punjabi.mp4',
    category: 'demo'
  },
  {
    id: 'banking-punjabi',
    title: 'ਡਿਜੀਟਲ ਬੈਂਕਿੰਗ ਬੇਸਿਕਸ',
    topic: 'Digital Banking Basics',
    language: 'punjabi',
    path: '/vid/punjabi/Learn-Digital Banking Basics - punjabi.mp4',
    category: 'learn'
  },
  {
    id: 'market-punjabi',
    title: 'ਮਾਰਕੀਟ ਕੀਮਤਾਂ ਅਤੇ MSP',
    topic: 'Market Prices & MSP',
    language: 'punjabi',
    path: '/vid/punjabi/Learn - Market Prices & MSP - punjabi .mp4',
    category: 'learn'
  },
  {
    id: 'insurance-punjabi',
    title: 'ਫਸਲ ਬੀਮਾ ਜ਼ਰੂਰੀ',
    topic: 'Crop Insurance Essentials',
    language: 'punjabi',
    path: '/vid/punjabi/Learn - Crop insurance essentials - punjabi.mp4',
    category: 'learn'
  },
  {
    id: 'fraud-punjabi',
    title: 'ਧੋਖਾਧੜੀ ਰੋਕਥਾਮ',
    topic: 'Fraud Prevention',
    language: 'punjabi',
    path: '/vid/punjabi/Learn - Fraud Prevention - punjabi.mp4',
    category: 'learn'
  },
  
  // Marathi Videos
  {
    id: 'demo-marathi',
    title: 'ग्रामीण सहाय्यक - डेमो',
    topic: 'App Demo',
    language: 'marathi',
    path: '/vid/marathi/GraminSahayak-Marathi.mp4',
    category: 'demo'
  },
  {
    id: 'banking-marathi',
    title: 'डिजिटल बँकिंग मूलभूत गोष्टी',
    topic: 'Digital Banking Basics',
    language: 'marathi',
    path: '/vid/marathi/Learn - Digital Banking Basics - marathi.mp4',
    category: 'learn'
  },
  {
    id: 'market-marathi',
    title: 'बाजार किंमती आणि MSP',
    topic: 'Market Prices & MSP',
    language: 'marathi',
    path: '/vid/marathi/Learn - Market Prices & MSP - marathi.mp4',
    category: 'learn'
  },
  {
    id: 'insurance-marathi',
    title: 'पीक विमा आवश्यक',
    topic: 'Crop Insurance Essentials',
    language: 'marathi',
    path: '/vid/marathi/Learn - Crop insurance essentials - marathi.mp4',
    category: 'learn'
  },
  {
    id: 'fraud-marathi',
    title: 'फसवणूक प्रतिबंध',
    topic: 'Fraud Prevention',
    language: 'marathi',
    path: '/vid/marathi/Learn- Fraud Prevention - Marathi.mp4',
    category: 'learn'
  },
  
  // Bengali Video
  {
    id: 'demo-bengali',
    title: 'গ্রামীণ সহায়ক - ডেমো',
    topic: 'App Demo',
    language: 'bengali',
    path: '/vid/bengali/GraminSahayak-Bangla.mp4',
    category: 'demo'
  }
];

/**
 * Get videos by language
 */
export function getVideosByLanguage(lang: string, category?: 'demo' | 'learn'): Video[] {
  // Map app language to video language
  const langMap: Record<string, string> = {
    'hi': 'hindi',
    'en': 'english', // Default to Hindi if English
    'pa': 'punjabi',
    'mr': 'marathi',
    'bn': 'bengali'
  };
  
  const videoLang = langMap[lang] || 'hindi';
  
  let videos = VIDEO_LIBRARY.filter(v => v.language === videoLang);
  
  if (category) {
    videos = videos.filter(v => v.category === category);
  }
  
  return videos;
}

/**
 * Get demo video for current language
 */
export function getDemoVideo(lang: string): Video | null {
  const demos = getVideosByLanguage(lang, 'demo');
  return demos[0] || null;
}

/**
 * Get learning videos for current language
 */
export function getLearningVideos(lang: string): Video[] {
  return getVideosByLanguage(lang, 'learn');
}

/**
 * Get video by ID
 */
export function getVideoById(id: string): Video | undefined {
  return VIDEO_LIBRARY.find(v => v.id === id);
}

/**
 * Group videos by topic
 */
export function groupVideosByTopic(videos: Video[]): Record<string, Video[]> {
  return videos.reduce((acc, video) => {
    if (!acc[video.topic]) {
      acc[video.topic] = [];
    }
    acc[video.topic].push(video);
    return acc;
  }, {} as Record<string, Video[]>);
}
