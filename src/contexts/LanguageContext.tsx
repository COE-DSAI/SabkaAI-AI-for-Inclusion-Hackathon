import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'hi' | 'en';

interface Translations {
  [key: string]: {
    hi: string;
    en: string;
  };
}

export const translations: Translations = {
  // Header
  appName: { hi: 'ग्रामीण साथी', en: 'Gramin Saathi' },
  
  // Navigation
  home: { hi: 'होम', en: 'Home' },
  saathi: { hi: 'साथी', en: 'Saathi' },
  khata: { hi: 'खाता', en: 'Ledger' },
  yojana: { hi: 'योजना', en: 'Schemes' },
  seekho: { hi: 'सीखो', en: 'Learn' },
  identity: { hi: 'पहचान', en: 'Identity' },
  
  // Greetings
  namaste: { hi: 'नमस्ते 🙏', en: 'Namaste 🙏' },
  goodMorning: { hi: 'राम जी, शुभ प्रभात!', en: 'Ram Ji, Good Morning!' },
  
  // Cash Health
  cashHealth: { hi: 'नकद स्वास्थ्य', en: 'Cash Health' },
  balance: { hi: 'शेष राशि', en: 'Balance' },
  income: { hi: 'आय', en: 'Income' },
  expense: { hi: 'खर्च', en: 'Expense' },
  thisMonth: { hi: 'इस महीने', en: 'This Month' },
  
  // Quick Actions
  quickActions: { hi: 'त्वरित कार्य', en: 'Quick Actions' },
  addIncome: { hi: 'आय जोड़ें', en: 'Add Income' },
  addExpense: { hi: 'खर्च जोड़ें', en: 'Add Expense' },
  checkSchemes: { hi: 'योजनाएं देखें', en: 'Check Schemes' },
  askSaathi: { hi: 'साथी से पूछें', en: 'Ask Saathi' },
  
  // Festival Predictor
  festivalExpenses: { hi: 'त्योहार खर्च अनुमान', en: 'Festival Expense Prediction' },
  upcomingFestival: { hi: 'आगामी त्योहार', en: 'Upcoming Festival' },
  estimatedCost: { hi: 'अनुमानित खर्च', en: 'Estimated Cost' },
  savingTip: { hi: 'बचत सुझाव', en: 'Saving Tip' },
  
  // Schemes
  schemesForYou: { hi: 'आपके लिए योजनाएं', en: 'Schemes For You' },
  eligible: { hi: 'पात्र', en: 'Eligible' },
  apply: { hi: 'आवेदन करें', en: 'Apply' },
  learnMore: { hi: 'और जानें', en: 'Learn More' },
  
  // Saathi AI
  aiAssistant: { hi: 'AI सहायक', en: 'AI Assistant' },
  askQuestion: { hi: 'अपना प्रश्न पूछें...', en: 'Ask your question...' },
  voiceInput: { hi: 'बोलकर पूछें', en: 'Voice Input' },
  
  // Khata/Ledger
  transactions: { hi: 'लेनदेन', en: 'Transactions' },
  addTransaction: { hi: 'लेनदेन जोड़ें', en: 'Add Transaction' },
  allTransactions: { hi: 'सभी लेनदेन', en: 'All Transactions' },
  farming: { hi: 'खेती', en: 'Farming' },
  household: { hi: 'घरेलू', en: 'Household' },
  
  // Seekho/Learn
  financialLiteracy: { hi: 'वित्तीय साक्षरता', en: 'Financial Literacy' },
  courses: { hi: 'पाठ्यक्रम', en: 'Courses' },
  progress: { hi: 'प्रगति', en: 'Progress' },
  
  // Identity
  financialId: { hi: 'वित्तीय पहचान पत्र', en: 'Financial ID Card' },
  personalInfo: { hi: 'व्यक्तिगत जानकारी', en: 'Personal Info' },
  
  // Common
  save: { hi: 'सहेजें', en: 'Save' },
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  submit: { hi: 'जमा करें', en: 'Submit' },
  loading: { hi: 'लोड हो रहा है...', en: 'Loading...' },
  error: { hi: 'त्रुटि', en: 'Error' },
  success: { hi: 'सफल', en: 'Success' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as Language;
      return stored || 'hi';
    }
    return 'hi';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'hi' ? 'en' : 'hi');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
