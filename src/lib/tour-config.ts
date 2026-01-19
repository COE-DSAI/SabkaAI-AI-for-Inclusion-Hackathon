import { TourStep } from '../components/GuidedTour';

// Comprehensive Dashboard Tour (English)
export const DASHBOARD_TOUR_EN: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="sidebar"]',
    title: '👋 Welcome to Gramin Saathi!',
    description: 'Quick 2-minute tour of all features. Let\'s get started!',
    position: 'right',
    action: 'Click Next to begin'
  },
  // Sidebar Navigation
  {
    id: 'nav-dashboard',
    target: '[data-tour="nav-dashboard"]',
    title: '� Dashboard',
    description: 'Your home - balance, transactions, and quick insights.',
    position: 'right'
  },
  {
    id: 'nav-khata',
    target: '[data-tour="nav-khata"]',
    title: '💰 Khatabook',
    description: 'Manage money - add funds, send payments, scan UPI QR codes.',
    position: 'right'
  },
  {
    id: 'nav-saathi',
    target: '[data-tour="saathi"]',
    title: '🤖 Saathi AI',
    description: 'Your farming assistant - ask about crops, schemes, weather, prices.',
    position: 'right'
  },
  {
    id: 'nav-mandi',
    target: '[data-tour="mandi"]',
    title: '📊 Mandi Prices',
    description: 'Live crop prices and MSP rates from mandis across India.',
    position: 'right'
  },
  {
    id: 'nav-yojana',
    target: '[data-tour="nav-yojana"]',
    title: '🛡️ Government Schemes',
    description: 'Browse and apply for PM-KISAN, insurance, and other schemes.',
    position: 'right'
  },
  {
    id: 'nav-community',
    target: '[data-tour="nav-community"]',
    title: '👥 Community',
    description: 'Connect with other farmers, share tips, ask questions.',
    position: 'right'
  },
  {
    id: 'nav-seekho',
    target: '[data-tour="nav-seekho"]',
    title: '� Learn (Seekho)',
    description: 'Watch educational videos on farming, finance, and technology.',
    position: 'right'
  },
  // Dashboard Content
  {
    id: 'balance',
    target: '[data-tour="balance-card"]',
    title: '💵 Financial Overview',
    description: 'Track balance, income, expenses. All encrypted and secure.',
    position: 'bottom'
  },
  {
    id: 'quick-actions',
    target: '[data-tour="quick-actions"]',
    title: '⚡ Quick Shortcuts',
    description: 'Fast access to Saathi AI, Mandi Prices, and Schemes.',
    position: 'left'
  },
  {
    id: 'transactions',
    target: '[data-tour="transactions"]',
    title: '� Transaction History',
    description: 'View all payments, receipts, and money transfers.',
    position: 'top'
  },
  // Bottom Controls
  {
    id: 'language',
    target: '[data-tour="language"]',
    title: '🌐 Language',
    description: 'Switch: Hindi, English, Punjabi, Marathi, Bengali.',
    position: 'top'
  },
  {
    id: 'theme',
    target: '[data-tour="theme"]',
    title: '🎨 Theme',
    description: 'Choose Ocean, Light, or Dark mode.',
    position: 'top'
  },

  {
    id: 'voice',
    target: '[data-tour="voice"]',
    title: '🎤 Voice Commands',
    description: 'Speak: "Add 2000", "Show mandi prices", "Navigate to Saathi".',
    position: 'top'
  },
  {
    id: 'complete',
    target: '[data-tour="sidebar"]',
    title: '🎉 You\'re Ready!',
    description: 'Explore freely. Click ? button anytime to restart this tour.',
    position: 'right'
  }
];

// Comprehensive Dashboard Tour (Hindi)
export const DASHBOARD_TOUR_HI: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="sidebar"]',
    title: '👋 ग्रामीण साथी में स्वागत है!',
    description: '2 मिनट का टूर - सभी सुविधाएं सीखें। चलिए शुरू करें!',
    position: 'right',
    action: 'शुरू करने के लिए आगे क्लिक करें'
  },
  {
    id: 'nav-dashboard',
    target: '[data-tour="nav-dashboard"]',
    title: '� डैशबोर्ड',
    description: 'आपका होम - बैलेंस, लेनदेन और त्वरित जानकारी।',
    position: 'right'
  },
  {
    id: 'nav-khata',
    target: '[data-tour="nav-khata"]',
    title: '💰 खाताबुक',
    description: 'पैसे प्रबंधित करें - धन जोड़ें, भुगतान भेजें, UPI QR स्कैन करें।',
    position: 'right'
  },
  {
    id: 'nav-saathi',
    target: '[data-tour="saathi"]',
    title: '🤖 साथी AI',
    description: 'आपका खेती सहायक - फसल, योजना, मौसम, भाव के बारे में पूछें।',
    position: 'right'
  },
  {
    id: 'nav-mandi',
    target: '[data-tour="mandi"]',
    title: '📊 मंडी भाव',
    description: 'भारत भर की मंडियों से लाइव फसल की कीमतें और MSP दरें।',
    position: 'right'
  },
  {
    id: 'nav-yojana',
    target: '[data-tour="nav-yojana"]',
    title: '🛡️ सरकारी योजनाएं',
    description: 'PM-KISAN, बीमा और अन्य योजनाओं के लिए ब्राउज़ और आवेदन करें।',
    position: 'right'
  },
  {
    id: 'nav-community',
    target: '[data-tour="nav-community"]',
    title: '👥 समुदाय',
    description: 'अन्य किसानों से जुड़ें, टिप्स साझा करें, सवाल पूछें।',
    position: 'right'
  },
  {
    id: 'nav-seekho',
    target: '[data-tour="nav-seekho"]',
    title: '📚 सीखो',
    description: 'खेती, वित्त और तकनीक पर शैक्षिक वीडियो देखें।',
    position: 'right'
  },
  {
    id: 'balance',
    target: '[data-tour="balance-card"]',
    title: '� वित्तीय विवरण',
    description: 'बैलेंस, आय, खर्च ट्रैक करें। सब एन्क्रिप्टेड और सुरक्षित।',
    position: 'bottom'
  },
  {
    id: 'quick-actions',
    target: '[data-tour="quick-actions"]',
    title: '⚡ त्वरित शॉर्टकट',
    description: 'साथी AI, मंडी भाव और योजनाओं तक तेजी से पहुंच।',
    position: 'left'
  },
  {
    id: 'transactions',
    target: '[data-tour="transactions"]',
    title: '� लेनदेन इतिहास',
    description: 'सभी भुगतान, रसीदें और पैसे ट्रांसफर देखें।',
    position: 'top'
  },
  {
    id: 'language',
    target: '[data-tour="language"]',
    title: '🌐 भाषा',
    description: 'स्विच करें: हिंदी, अंग्रेजी, पंजाबी, मराठी, बंगाली।',
    position: 'top'
  },
  {
    id: 'theme',
    target: '[data-tour="theme"]',
    title: '🎨 थीम',
    description: 'ओशन, लाइट या डार्क मोड चुनें।',
    position: 'top'
  },

  {
    id: 'voice',
    target: '[data-tour="voice"]',
    title: '🎤 वॉयस कमांड',
    description: 'बोलें: "2000 जोड़ें", "मंडी भाव दिखाएं", "साथी पर जाएं"।',
    position: 'top'
  },
  {
    id: 'complete',
    target: '[data-tour="sidebar"]',
    title: '🎉 आप तैयार हैं!',
    description: 'स्वतंत्र रूप से एक्सप्लोर करें। टूर फिर शुरू करने के लिए ? बटन क्लिक करें।',
    position: 'right'
  }
];

export const getTourSteps = (lang: string): TourStep[] => {
  return lang === 'hi' ? DASHBOARD_TOUR_HI : DASHBOARD_TOUR_EN;
};
