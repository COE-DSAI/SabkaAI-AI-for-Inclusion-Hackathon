import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  Check, 
  X, 
  PlayCircle, 
  Clock, 
  Star,
  Sprout,
  Wallet,
  Shield,
  Smartphone,
  TrendingUp,
  AlertTriangle,
  Loader,
  Volume2
} from 'lucide-react';
import { SurakshaView } from './SurakshaView';

export function SeekhoView({ t, lang, user, db, appId }: any) {
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [lessonSaved, setLessonSaved] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Load progress from Firebase or LocalStorage
  useEffect(() => {
    if (!user || !db) {
      const saved = localStorage.getItem('completed_lessons');
      if (saved) setCompletedLessons(JSON.parse(saved));
      return;
    }
    
    const loadProgress = async () => {
      try {
        const lessonsSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'lessons'));
        const lessons: any[] = [];
        lessonsSnap.forEach(doc => {
          lessons.push({ id: parseInt(doc.id), ...doc.data() });
        });
        setCompletedLessons(lessons);
      } catch (err) {
        console.error('Error loading lesson progress:', err);
        const saved = localStorage.getItem('completed_lessons');
        if (saved) setCompletedLessons(JSON.parse(saved));
      }
    };
    
    loadProgress();
  }, [user, db, appId]);
  
  // Load badges
  useEffect(() => {
    if (!user || !db) {
      const saved = localStorage.getItem(`badges_${user?.uid || 'guest'}`);
      if (saved) setBadges(JSON.parse(saved));
      return;
    }
    
    const loadBadges = async () => {
      try {
        const badgesSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'badges'));
        const userBadges: any[] = [];
        badgesSnap.forEach(doc => userBadges.push({ id: doc.id, ...doc.data() }));
        setBadges(userBadges);
      } catch (err) {
        console.error('Error loading badges:', err);
      }
    };
    
    loadBadges();
  }, [user, db, appId]);

  const awardBadges = async (lessonId: number, score: number, completed: any[]) => {
    const newBadges: any[] = [];
    
    if (completed.length === 1 && !badges.find(b => b.id === 'first_lesson')) {
      newBadges.push({
        id: 'first_lesson',
        name: lang === 'en' ? 'Getting Started' : 'शुरुआत',
        icon: '🌟',
        description: lang === 'en' ? 'Completed your first lesson' : 'पहला पाठ पूरा किया',
        earnedAt: new Date().toISOString()
      });
    }
    
    if (score === 100 && !badges.find(b => b.id === `perfect_${lessonId}`)) {
      newBadges.push({
        id: `perfect_${lessonId}`,
        name: lang === 'en' ? 'Perfect Score' : 'परिपूर्ण स्कोर',
        icon: '🏆',
        description: lang === 'en' ? `100% on lesson ${lessonId}` : `पाठ ${lessonId} पर 100%`,
        earnedAt: new Date().toISOString()
      });
    }
    
    if (completed.length >= 8 && !badges.find(b => b.id === 'master')) {
      newBadges.push({
        id: 'master',
        name: lang === 'en' ? 'Master Learner' : 'मास्टर शिक्षार्थी',
        icon: '🎓',
        description: lang === 'en' ? 'Completed all lessons' : 'सभी पाठ पूरे किए',
        earnedAt: new Date().toISOString()
      });
    }
    
    const avgScore = completed.reduce((sum, l) => sum + l.score, 0) / completed.length;
    if (avgScore >= 80 && completed.length >= 5 && !badges.find(b => b.id === 'high_achiever')) {
      newBadges.push({
        id: 'high_achiever',
        name: lang === 'en' ? 'High Achiever' : 'उच्च उपलब्धि',
        icon: '⭐',
        description: lang === 'en' ? '80%+ average score' : '80%+ औसत स्कोर',
        earnedAt: new Date().toISOString()
      });
    }
    
    if (newBadges.length > 0) {
      const updatedBadges = [...badges, ...newBadges];
      setBadges(updatedBadges);
      localStorage.setItem(`badges_${user?.uid || 'guest'}`, JSON.stringify(updatedBadges));
      
      if (user && db) {
        for (const badge of newBadges) {
          try {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'badges', badge.id), badge);
          } catch (err) {
            console.error('Error saving badge:', err);
          }
        }
      }
      
      setTimeout(() => {
        alert(`🎉 ${lang === 'en' ? 'New Badge Earned!' : 'नया बैज मिला!'} ${newBadges[0].icon} ${newBadges[0].name}`);
      }, 500);
    }
  };

  const markLessonComplete = async (lessonId: number, score: number) => {
    const lessonData = { id: lessonId, score, date: new Date().toISOString() };
    const newCompleted = [...completedLessons.filter(c => c.id !== lessonId), lessonData];
    setCompletedLessons(newCompleted);
    localStorage.setItem('completed_lessons', JSON.stringify(newCompleted));
    await awardBadges(lessonId, score, newCompleted);
    
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'lessons', String(lessonId)), {
          score,
          completedAt: serverTimestamp(),
          attempts: (completedLessons.find(c => c.id === lessonId)?.attempts || 0) + 1
        });
      } catch (err) {
        console.error('Error saving lesson progress:', err);
      }
    }
  };

  const getLessonCompletion = (lessonId: number) => {
    return completedLessons.find(c => c.id === lessonId);
  };

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const questionBanks: {[key: number]: any[]} = {
    1: [
      { question: lang === 'en' ? 'How often should you test your soil?' : 'कितनी बार मिट्टी की जांच करनी चाहिए?', options: lang === 'en' ? ['Every month', 'Every season', 'Every 2-3 years', 'Never'] : ['हर महीने', 'हर मौसम', 'हर 2-3 साल', 'कभी नहीं'], correct: 2 },
      { question: lang === 'en' ? 'Which nutrient is responsible for leaf growth?' : 'पत्ती वृद्धि के लिए कौन सा पोषक तत्व जिम्मेदार है?', options: lang === 'en' ? ['Phosphorus (P)', 'Potassium (K)', 'Nitrogen (N)', 'Calcium (Ca)'] : ['फॉस्फोरस (P)', 'पोटेशियम (K)', 'नाइट्रोजन (N)', 'कैल्शियम (Ca)'], correct: 2 },
      { question: lang === 'en' ? 'Which nutrient helps in root development?' : 'जड़ विकास में कौन सा पोषक तत्व मदद करता है?', options: lang === 'en' ? ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'Iron (Fe)'] : ['नाइट्रोजन (N)', 'फॉस्फोरस (P)', 'पोटेशियम (K)', 'आयरन (Fe)'], correct: 1 },
      { question: lang === 'en' ? 'What is the Soil Health Card helpline number?' : 'मृदा स्वास्थ्य कार्ड हेल्पलाइन नंबर क्या है?', options: ['1800-180-1551', '1800-200-2000', '100', '108'], correct: 0 },
      { question: lang === 'en' ? 'What sample depth is recommended for soil testing?' : 'मिट्टी परीक्षण के लिए कितनी गहराई से नमूना लें?', options: lang === 'en' ? ['1-2 inches', '4-6 inches', '10-12 inches', '1 foot'] : ['1-2 इंच', '4-6 इंच', '10-12 इंच', '1 फुट'], correct: 1 },
      { question: lang === 'en' ? 'What does K stand for in NPK?' : 'NPK में K का क्या मतलब है?', options: lang === 'en' ? ['Kalcium', 'Potassium', 'Krypton', 'Kelp'] : ['कैल्शियम', 'पोटेशियम', 'क्रिप्टन', 'केल्प'], correct: 1 },
      { question: lang === 'en' ? 'Where can you get free soil testing?' : 'मुफ्त मिट्टी परीक्षण कहां होता है?', options: lang === 'en' ? ['Post Office', 'Krishi Vigyan Kendra', 'Railway Station', 'Hospital'] : ['डाकघर', 'कृषि विज्ञान केंद्र', 'रेलवे स्टेशन', 'अस्पताल'], correct: 1 },
      { question: lang === 'en' ? 'How much soil sample is needed for testing?' : 'मिट्टी परीक्षण के लिए कितना नमूना चाहिए?', options: ['100g', '250g', '500g', '1kg'], correct: 2 }
    ],
    2: [
      { question: lang === 'en' ? 'According to the 50-30-20 rule, how much should go to basic needs?' : '50-30-20 नियम के अनुसार, बुनियादी जरूरतों में कितना जाना चाहिए?', options: ['20%', '30%', '50%', '60%'], correct: 2 },
      { question: lang === 'en' ? 'How much should you save from harvest income?' : 'फसल आय से कितना बचत करनी चाहिए?', options: ['5%', '10%', '20%', '50%'], correct: 2 },
      { question: lang === 'en' ? 'What is a safe interest rate for agricultural loans?' : 'कृषि ऋण के लिए सुरक्षित ब्याज दर क्या है?', options: ['20-25%', '15-18%', '4% (KCC)', '35%'], correct: 2 },
      { question: lang === 'en' ? 'What is the target for emergency fund?' : 'आपातकालीन फंड का लक्ष्य क्या है?', options: lang === 'en' ? ['1 month expenses', '3-6 months expenses', '1 year expenses', 'No need'] : ['1 महीने का खर्च', '3-6 महीने का खर्च', '1 साल का खर्च', 'जरूरत नहीं'], correct: 1 },
      { question: lang === 'en' ? 'Which is a safe option for emergency savings?' : 'आपातकालीन बचत के लिए कौन सा विकल्प सुरक्षित है?', options: lang === 'en' ? ['Lotteries', 'Stock trading', 'Post Office savings', 'Lending to friends'] : ['लॉटरी', 'शेयर ट्रेडिंग', 'डाकघर बचत', 'दोस्तों को उधार'], correct: 2 },
      { question: lang === 'en' ? 'What percentage goes to farm improvements in 50-30-20?' : '50-30-20 में खेती सुधार में कितना जाता है?', options: ['20%', '30%', '50%', '40%'], correct: 1 },
      { question: lang === 'en' ? 'What is KCC?' : 'KCC क्या है?', options: lang === 'en' ? ['Kisan Call Center', 'Kisan Credit Card', 'Krishi Care Card', 'Kisan Cash Card'] : ['किसान कॉल सेंटर', 'किसान क्रेडिट कार्ड', 'कृषि केयर कार्ड', 'किसान कैश कार्ड'], correct: 1 },
      { question: lang === 'en' ? 'When is the best time to buy farm inputs in bulk?' : 'खेती सामान थोक में कब खरीदें?', options: lang === 'en' ? ['Peak season', 'Off-season', 'During harvest', 'Never bulk buy'] : ['व्यस्त सीजन', 'ऑफ-सीजन', 'फसल के दौरान', 'थोक में कभी न खरीदें'], correct: 1 }
    ],
    3: [
      { question: lang === 'en' ? 'What is the premium for Kharif crop insurance?' : 'खरीफ फसल बीमा का प्रीमियम कितना है?', options: ['1%', '2%', '5%', '10%'], correct: 1 },
      { question: lang === 'en' ? 'When should you register for crop insurance?' : 'फसल बीमा के लिए कब रजिस्टर करना चाहिए?', options: lang === 'en' ? ['After harvest', 'Before sowing', 'Anytime in year', 'After damage'] : ['फसल के बाद', 'बुवाई से पहले', 'साल में कभी भी', 'नुकसान के बाद'], correct: 1 },
      { question: lang === 'en' ? 'How soon must you report crop damage for insurance claim?' : 'बीमा दावे के लिए फसल नुकसान कितनी जल्दी रिपोर्ट करना चाहिए?', options: lang === 'en' ? ['Within 72 hours', 'Within 1 week', 'Within 1 month', 'Anytime'] : ['72 घंटे में', '1 हफ्ते में', '1 महीने में', 'कभी भी'], correct: 0 },
      { question: lang === 'en' ? 'What is the premium for Rabi crop insurance?' : 'रबी फसल बीमा का प्रीमियम कितना है?', options: ['1.5%', '2%', '2.5%', '3%'], correct: 0 },
      { question: lang === 'en' ? 'Which website to use for online crop insurance?' : 'ऑनलाइन फसल बीमा के लिए कौन सी वेबसाइट?', options: ['pmkisan.gov.in', 'pmfby.gov.in', 'kisan.gov.in', 'agri.gov.in'], correct: 1 },
      { question: lang === 'en' ? 'What document is NOT needed for crop insurance?' : 'फसल बीमा के लिए कौन सा दस्तावेज नहीं चाहिए?', options: lang === 'en' ? ['Aadhaar Card', 'Land documents', 'Passport', 'Bank Passbook'] : ['आधार कार्ड', 'जमीन दस्तावेज', 'पासपोर्ट', 'बैंक पासबुक'], correct: 2 },
      { question: lang === 'en' ? 'PM Fasal Bima covers which of these?' : 'PM फसल बीमा इनमें से किसे कवर करता है?', options: lang === 'en' ? ['Only drought', 'Only flood', 'All natural calamities', 'Only pest attack'] : ['केवल सूखा', 'केवल बाढ़', 'सभी प्राकृतिक आपदाएं', 'केवल कीट हमला'], correct: 2 },
      { question: lang === 'en' ? 'What should you NOT do after crop damage?' : 'फसल नुकसान के बाद क्या नहीं करना चाहिए?', options: lang === 'en' ? ['Take photos', 'Call helpline', 'Harvest immediately', 'Wait for surveyor'] : ['फोटो लें', 'हेल्पलाइन कॉल करें', 'तुरंत कटाई करें', 'सर्वेयर का इंतजार करें'], correct: 2 }
    ],
    4: [
      { question: lang === 'en' ? 'Is there any fee for UPI transactions?' : 'UPI लेनदेन के लिए कोई शुल्क है?', options: lang === 'en' ? ['Yes, ₹5 per transfer', 'Yes, 1% charge', 'No, completely FREE', 'Only for large amounts'] : ['हाँ, ₹5 प्रति ट्रांसफर', 'हाँ, 1% शुल्क', 'नहीं, बिल्कुल मुफ्त', 'केवल बड़ी राशि के लिए'], correct: 2 },
      { question: lang === 'en' ? 'What number to dial for banking without internet?' : 'इंटरनेट के बिना बैंकिंग के लिए कौन सा नंबर डायल करें?', options: ['*100#', '*99#', '*121#', '*123#'], correct: 1 },
      { question: lang === 'en' ? 'You receive a call asking for UPI PIN to "verify" your account. What should you do?' : 'खाता "वेरिफाई" करने के लिए UPI पिन मांगने वाला कॉल आया। क्या करें?', options: lang === 'en' ? ['Give PIN to verify', 'Share OTP only', 'Hang up immediately', 'Visit their office'] : ['वेरिफाई के लिए पिन दें', 'केवल OTP शेयर करें', 'तुरंत फोन काटें', 'उनके ऑफिस जाएं'], correct: 2 },
      { question: lang === 'en' ? 'How many digits in a UPI PIN?' : 'UPI पिन में कितने अंक होते हैं?', options: ['3', '4 or 6', '8', '10'], correct: 1 },
      { question: lang === 'en' ? 'Which is NOT a UPI app?' : 'कौन सा UPI ऐप नहीं है?', options: ['BHIM', 'PhonePe', 'WhatsApp', 'Calculator'], correct: 3 },
      { question: lang === 'en' ? 'UPI works on which days?' : 'UPI किन दिनों काम करता है?', options: lang === 'en' ? ['Only weekdays', 'Only bank days', '24/7 every day', 'Only daytime'] : ['केवल कार्य दिवस', 'केवल बैंक दिन', '24/7 हर दिन', 'केवल दिन में'], correct: 2 },
      { question: lang === 'en' ? 'What is safe to share for receiving money?' : 'पैसे प्राप्त करने के लिए क्या साझा करना सुरक्षित है?', options: lang === 'en' ? ['UPI PIN', 'OTP', 'UPI ID', 'Password'] : ['UPI पिन', 'OTP', 'UPI ID', 'पासवर्ड'], correct: 2 },
      { question: lang === 'en' ? 'Where should you download UPI apps from?' : 'UPI ऐप्स कहां से डाउनलोड करें?', options: lang === 'en' ? ['Any website', 'Friends phone', 'Official Play Store', 'Random links'] : ['कोई भी वेबसाइट', 'दोस्त का फोन', 'आधिकारिक Play Store', 'रैंडम लिंक'], correct: 2 }
    ],
    5: [
      { question: lang === 'en' ? 'What is the MSP for wheat (2024-25)?' : 'गेहूं का MSP (2024-25) क्या है?', options: ['₹1,950', '₹2,100', '₹2,275', '₹2,500'], correct: 2 },
      { question: lang === 'en' ? 'Which days are best for selling at mandi?' : 'मंडी में बेचने के लिए कौन से दिन सबसे अच्छे हैं?', options: lang === 'en' ? ['Monday-Tuesday', 'Wednesday-Friday', 'Saturday-Sunday', 'Any day'] : ['सोमवार-मंगलवार', 'बुधवार-शुक्रवार', 'शनिवार-रविवार', 'कोई भी दिन'], correct: 1 },
      { question: lang === 'en' ? 'What is the main benefit of joining an FPO?' : 'FPO में शामिल होने का मुख्य लाभ क्या है?', options: lang === 'en' ? ['Free seeds', 'Better bargaining power', 'Free tractors', 'No work needed'] : ['मुफ्त बीज', 'बेहतर सौदेबाजी शक्ति', 'मुफ्त ट्रैक्टर', 'काम की जरूरत नहीं'], correct: 1 },
      { question: lang === 'en' ? 'What does MSP stand for?' : 'MSP का पूरा नाम क्या है?', options: lang === 'en' ? ['Maximum Support Price', 'Minimum Support Price', 'Market Selling Price', 'Mandi Standard Price'] : ['अधिकतम समर्थन मूल्य', 'न्यूनतम समर्थन मूल्य', 'बाजार बिक्री मूल्य', 'मंडी मानक मूल्य'], correct: 1 },
      { question: lang === 'en' ? 'What does FPO stand for?' : 'FPO का पूरा नाम क्या है?', options: lang === 'en' ? ['Farm Product Office', 'Farmer Producer Organization', 'Field Production Organization', 'Food Processing Office'] : ['फार्म प्रोडक्ट ऑफिस', 'किसान उत्पादक संगठन', 'फील्ड प्रोडक्शन संगठन', 'फूड प्रोसेसिंग ऑफिस'], correct: 1 },
      { question: lang === 'en' ? 'Which app shows all mandi prices?' : 'कौन सा ऐप सभी मंडी भाव दिखाता है?', options: ['WhatsApp', 'eNAM', 'Calculator', 'Camera'], correct: 1 },
      { question: lang === 'en' ? 'What helps get higher prices at mandi?' : 'मंडी में अधिक कीमत पाने में क्या मदद करता है?', options: lang === 'en' ? ['Selling quickly', 'Good packaging & grading', 'Selling to middlemen', 'Random selling'] : ['जल्दी बेचना', 'अच्छी पैकेजिंग और ग्रेडिंग', 'बिचौलियों को बेचना', 'बिना सोचे बेचना'], correct: 1 },
      { question: lang === 'en' ? 'When to check mandi prices?' : 'मंडी भाव कब देखें?', options: lang === 'en' ? ['After selling', 'Early morning before going', 'Never', 'Once a month'] : ['बेचने के बाद', 'जाने से पहले सुबह', 'कभी नहीं', 'महीने में एक बार'], correct: 1 }
    ],
    6: [
      { question: lang === 'en' ? 'You get SMS: "Pay ₹500 to get ₹10,000 PM Kisan bonus". What is this?' : 'SMS आया: "₹500 दें, ₹10,000 PM किसान बोनस पाएं"। यह क्या है?', options: lang === 'en' ? ['Real government scheme', 'Bank offer', 'Fraud/Scam', 'Insurance benefit'] : ['असली सरकारी योजना', 'बैंक ऑफर', 'धोखाधड़ी', 'बीमा लाभ'], correct: 2 },
      { question: lang === 'en' ? 'Someone calls saying "verify your KYC or account will be blocked". What should you do?' : 'कोई कॉल करके कहता है "KYC वेरिफाई करें वरना खाता बंद होगा"। क्या करें?', options: lang === 'en' ? ['Share OTP to verify', 'Give Aadhaar details', 'Hang up and call bank directly', 'Visit their office'] : ['वेरिफाई करने के लिए OTP दें', 'आधार विवरण दें', 'फोन काटें और सीधे बैंक को कॉल करें', 'उनके कार्यालय जाएं'], correct: 2 },
      { question: lang === 'en' ? 'What is the national cyber crime helpline number?' : 'राष्ट्रीय साइबर अपराध हेल्पलाइन नंबर क्या है?', options: ['100', '108', '1930', '1800'], correct: 2 },
      { question: lang === 'en' ? 'Which should you NEVER share?' : 'कौन सा कभी साझा नहीं करना चाहिए?', options: lang === 'en' ? ['Account number', 'UPI ID', 'OTP/PIN', 'IFSC code'] : ['खाता नंबर', 'UPI ID', 'OTP/पिन', 'IFSC कोड'], correct: 2 },
      { question: lang === 'en' ? 'What is a red flag for fraud?' : 'धोखाधड़ी का खतरे का संकेत क्या है?', options: lang === 'en' ? ['Official bank branch', 'Government office', 'Urgency & pressure', 'Verified apps'] : ['आधिकारिक बैंक शाखा', 'सरकारी कार्यालय', 'जल्दबाजी और दबाव', 'वेरिफाइड ऐप्स'], correct: 2 },
      { question: lang === 'en' ? 'Where to report cyber fraud?' : 'साइबर धोखाधड़ी की रिपोर्ट कहां करें?', options: ['WhatsApp', 'cybercrime.gov.in', 'Facebook', 'Instagram'], correct: 1 },
      { question: lang === 'en' ? 'What should you do immediately if fraud happens?' : 'धोखाधड़ी होने पर तुरंत क्या करें?', options: lang === 'en' ? ['Wait and see', 'Block card & call bank', 'Share OTP again', 'Ignore it'] : ['इंतजार करें', 'कार्ड ब्लॉक करें और बैंक को कॉल करें', 'OTP फिर से शेयर करें', 'अनदेखा करें'], correct: 1 },
      { question: lang === 'en' ? 'Banks ask for OTP over phone - True or False?' : 'बैंक फोन पर OTP मांगते हैं - सही या गलत?', options: lang === 'en' ? ['True, they verify', 'False, banks never ask', 'Sometimes', 'Only for big amount'] : ['सही, वे वेरिफाई करते हैं', 'गलत, बैंक कभी नहीं मांगते', 'कभी-कभी', 'केवल बड़ी राशि के लिए'], correct: 1 }
    ]
  };

  const lessons = [
    { id: 1, icon: Sprout, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-100', duration: '10 min', title: lang === 'en' ? 'Understanding Soil Health' : 'मिट्टी स्वास्थ्य समझें', desc: lang === 'en' ? 'Learn how to test soil and choose the right fertilizers to boost crop yield.' : 'मिट्टी परीक्षण और सही खाद चुनकर फसल बढ़ाना सीखें।', steps: [
      { title: lang === 'en' ? 'Why Soil Health Matters' : 'मिट्टी स्वास्थ्य क्यों जरूरी है', content: lang === 'en' ? 'Healthy soil = Healthy crops! Testing soil helps you understand which nutrients (N, P, K) are missing...\n\n🌍 Soil is a living ecosystem with billions of microorganisms that help plants absorb nutrients. When we take care of our soil, it takes care of our crops.' : 'स्वस्थ मिट्टी = स्वस्थ फसल! मिट्टी जांच से पता चलता है कि कौन से पोषक तत्व (N, P, K) कम हैं...\n\n🌍 मिट्टी एक जीवित पारिस्थितिकी तंत्र है जिसमें अरबों सूक्ष्मजीव होते हैं जो पौधों को पोषक तत्व अवशोषित करने में मदद करते हैं।' },
      { title: lang === 'en' ? 'Understanding N-P-K' : 'N-P-K को समझें', content: lang === 'en' ? '🌱 N (Nitrogen): For leaf growth...\n🌾 P (Phosphorus): For root development...\n💪 K (Potassium): For overall strength...' : '🌱 N (नाइट्रोजन): पत्ती वृद्धि...\n🌾 P (फॉस्फोरस): जड़ विकास...\n💪 K (पोटेशियम): समग्र शक्ति...' },
      { title: lang === 'en' ? 'How to Get Free Soil Testing' : 'मुफ्त मिट्टी जांच कैसे करें', content: lang === 'en' ? '📍 Where to Test:\n1. KVK - Every district has one!\n2. State Agricultural University labs...' : '📍 कहां परीक्षण करें:\n1. KVK - हर जिले में है!\n2. राज्य कृषि विश्वविद्यालय...' },
      { title: lang === 'en' ? 'Understanding Your Soil Health Card' : 'मृदा स्वास्थ्य कार्ड समझें', content: lang === 'en' ? '📄 Contains: pH Level, Organic Carbon, NPK Status...' : '📄 इसमें है: pH स्तर, जैविक कार्बन, NPK स्थिति...' },
      { title: lang === 'en' ? 'Organic Practices' : 'मिट्टी स्वास्थ्य के लिए जैविक तरीके', content: lang === 'en' ? '🌿 Natural Ways: Crop Rotation, Green Manure, Vermicompost, Mulching.' : '🌿 प्राकृतिक तरीके: फसल चक्र, हरी खाद, केंचुआ खाद, मल्चिंग।' }
    ]},
    { id: 2, icon: Wallet, iconColor: 'text-amber-600', bgColor: 'bg-amber-100', duration: '12 min', title: lang === 'en' ? 'Smart Money Management' : 'स्मार्ट पैसा प्रबंधन', desc: lang === 'en' ? 'Master the 50-30-20 rule for farming income and build emergency funds.' : 'खेती आय के लिए 50-30-20 नियम और आपातकालीन फंड बनाना सीखें।', steps: [
      { title: lang === 'en' ? 'The 50-30-20 Rule' : '50-30-20 नियम', content: lang === 'en' ? '50% Needs, 30% Improvements, 20% Savings.' : '50% जरूरत, 30% सुधार, 20% बचत।' },
      { title: lang === 'en' ? 'Building Emergency Fund' : 'आपातकालीन फंड बनाना', content: lang === 'en' ? 'Save 3-6 months of expenses.' : '3-6 महीने के खर्च की बचत करें।' },
      { title: lang === 'en' ? 'Smart Saving Tricks' : 'स्मार्ट बचत ट्रिक्स', content: lang === 'en' ? 'Auto-transfer 20% on mandi day.' : 'मंडी दिवस पर 20% ऑटो-ट्रांसफर।' },
      { title: lang === 'en' ? 'Avoiding Debt Traps' : 'कर्ज जाल से बचें', content: lang === 'en' ? 'Interest > 12% is a red flag.' : '12% से अधिक ब्याज लाल झंडा है।' },
      { title: lang === 'en' ? 'Kisan Credit Card (KCC)' : 'किसान क्रेडिट कार्ड (KCC)', content: lang === 'en' ? '4% interest with timely repayment.' : 'समय पर भुगतान पर 4% ब्याज।' }
    ]},
    { id: 3, icon: Shield, iconColor: 'text-blue-600', bgColor: 'bg-blue-100', duration: '11 min', title: lang === 'en' ? 'Crop Insurance Essentials' : 'फसल बीमा आवश्यक', desc: lang === 'en' ? 'Learn how PM Fasal Bima protects your crops for just 2% premium.' : 'PM फसल बीमा से सिर्फ 2% प्रीमियम में फसल सुरक्षा पाएं।', steps: [
      { title: lang === 'en' ? 'Why Crop Insurance?' : 'फसल बीमा क्यों?', content: lang === 'en' ? 'PMFBY covers pre-sowing, standing crop & post-harvest.' : 'PMFBY बुवाई से पहले, खड़ी फसल और कटाई के बाद को कवर करता है।' },
      { title: lang === 'en' ? 'Premium & Coverage' : 'प्रीमियम और कवरेज', content: lang === 'en' ? 'Kharif 2%, Rabi 1.5%.' : 'खरीफ 2%, रबी 1.5%।' },
      { title: lang === 'en' ? 'Documents Required' : 'आवश्यक दस्तावेज', content: lang === 'en' ? 'Aadhaar, Land docs, Bank passbook.' : 'आधार, जमीन दस्तावेज, बैंक पासबुक।' },
      { title: lang === 'en' ? 'How to Register' : 'रजिस्टर कैसे करें', content: lang === 'en' ? 'Visit Bank/CSC or pmfby.gov.in.' : 'बैंक/CSC जाएं या pmfby.gov.in पर जाएं।' },
      { title: lang === 'en' ? 'How to File a Claim' : 'दावा कैसे दर्ज करें', content: lang === 'en' ? 'Report within 72 hours!' : '72 घंटे के भीतर रिपोर्ट करें!' }
    ]},
    { id: 4, icon: Smartphone, iconColor: 'text-purple-600', bgColor: 'bg-purple-100', duration: '10 min', title: lang === 'en' ? 'Digital Banking Basics' : 'डिजिटल बैंकिंग मूल बातें', desc: lang === 'en' ? 'Learn UPI, BHIM, and online banking to save time and money.' : 'UPI, BHIM और ऑनलाइन बैंकिंग सीखें, समय और पैसा बचाएं।', steps: [
      { title: lang === 'en' ? 'What is UPI?' : 'UPI क्या है?', content: lang === 'en' ? 'Free transfers 24/7.' : '24/7 मुफ्त ट्रांसफर।' },
      { title: lang === 'en' ? 'Setting Up UPI' : 'UPI सेटअप', content: lang === 'en' ? 'Download BHIM, PhonePe, GPay, etc.' : 'BHIM, PhonePe, GPay आदि डाउनलोड करें।' },
      { title: lang === 'en' ? 'Sending & Receiving' : 'भेजना और प्राप्त करना', content: lang === 'en' ? 'Send via Mobile/UPI ID/QR.' : 'मोबाइल/UPI ID/QR के माध्यम से भेजें।' },
      { title: lang === 'en' ? 'Offline (*99#)' : 'ऑफलाइन (*99#)', content: lang === 'en' ? 'Banking without internet.' : 'इंटरनेट के बिना बैंकिंग।' },
      { title: lang === 'en' ? 'Security Tips' : 'सुरक्षा टिप्स', content: lang === 'en' ? 'Never share PIN/OTP!' : 'पिन/OTP कभी साझा न करें!' }
    ]},
    { id: 5, icon: TrendingUp, iconColor: 'text-green-600', bgColor: 'bg-green-100', duration: '8 min', title: lang === 'en' ? 'Market Prices & MSP' : 'बाजार भाव और MSP', desc: lang === 'en' ? 'Understand MSP & eNAM.' : 'MSP और eNAM समझें।', steps: [
      { title: lang === 'en' ? 'What is MSP?' : 'MSP क्या है?', content: lang === 'en' ? 'Guaranteed minimum price.' : 'गारंटीकृत न्यूनतम मूल्य।' },
      { title: lang === 'en' ? 'eNAM' : 'eNAM', content: lang === 'en' ? 'Compare mandi prices online.' : 'ऑनलाइन मंडी भावों की तुलना करें।' },
      { title: lang === 'en' ? 'Mandi Tips' : 'मंडी टिप्स', content: lang === 'en' ? 'Grading = Better price.' : 'ग्रेडिंग = बेहतर कीमत।' },
      { title: lang === 'en' ? 'FPO' : 'FPO', content: lang === 'en' ? 'Farmer Producer Organizations.' : 'किसान उत्पादक संगठन।' }
    ]},
    { id: 6, icon: AlertTriangle, iconColor: 'text-red-600', bgColor: 'bg-red-100', duration: '7 min', title: lang === 'en' ? 'Fraud Prevention' : 'धोखाधड़ी से बचाव', desc: lang === 'en' ? 'Stay safe.' : 'सुरक्षित रहें।', steps: [
      { title: lang === 'en' ? 'Common Scams' : 'आम घोटाले', content: lang === 'en' ? 'Fake bonus, KYC block threats.' : 'नकली बोनस, KYC ब्लॉक की धमकी।' },
      { title: lang === 'en' ? 'Never Share' : 'कभी साझा न करें', content: lang === 'en' ? 'OTP, PIN, Passwords.' : 'OTP, पिन, पासवर्ड।' },
      { title: lang === 'en' ? 'Red Flags' : 'खतरे के संकेत', content: lang === 'en' ? 'Urgency & Pressure.' : 'जल्दबाजी और दबाव।' },
      { title: lang === 'en' ? 'Report' : 'रिपोर्ट करें', content: lang === 'en' ? 'Call 1930 immediately.' : 'तुरंत 1930 पर कॉल करें।' }
    ]}
  ];

  const handleStartLesson = (lesson: any) => {
    const theorySteps = lesson.steps.filter((step: any) => !step.question);
    const lessonQuestions = questionBanks[lesson.id] || [];
    const shuffledQuestions = shuffleArray(lessonQuestions);
    const selectedQuestions = shuffledQuestions.slice(0, 3).map((q, idx) => ({
      title: lang === 'en' ? `Quiz ${idx + 1}` : `प्रश्नोत्तरी ${idx + 1}`,
      question: q.question,
      options: q.options,
      correct: q.correct
    }));
    
    const lessonWithQuestions = {
      ...lesson,
      steps: [...theorySteps, ...selectedQuestions]
    };
    
    setSelectedLesson(lessonWithQuestions);
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setLessonSaved(false);
    setHasAnswered(false);
    setAnswerFeedback(null);
  };

  const handleAnswer = (stepIndex: number, answerIndex: number) => {
    if (hasAnswered) return;
    setAnswers(prev => ({ ...prev, [stepIndex]: answerIndex }));
    setHasAnswered(true);
    const step = selectedLesson.steps[stepIndex];
    const isCorrect = answerIndex === step.correct;
    setAnswerFeedback({
      correct: isCorrect,
      correctAnswer: step.correct,
      selectedAnswer: answerIndex
    });
  };

  const handleNextStep = () => {
    setAnswerFeedback(null);
    setHasAnswered(false);
    if (currentStep < selectedLesson.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    const quizSteps = selectedLesson.steps.filter((step: any) => step.question);
    const correctCount = quizSteps.filter((step: any) => {
      const idx = selectedLesson.steps.indexOf(step);
      return answers[idx] === step.correct;
    }).length;
    return Math.round((correctCount / quizSteps.length) * 100);
  };

  useEffect(() => {
    if (showResults && selectedLesson && !lessonSaved) {
      const score = calculateScore();
      markLessonComplete(selectedLesson.id, score);
      setLessonSaved(true);
    }
  }, [showResults, selectedLesson, lessonSaved]);

  if (selectedLesson) {
    const step = selectedLesson.steps[currentStep];
    const progress = ((currentStep + 1) / selectedLesson.steps.length) * 100;

    if (showResults) {
      const score = calculateScore();
      return (
        <div className="max-w-2xl mx-auto p-4 md:p-0">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8 text-center shadow-xl">
             <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-6">
                {score >= 70 ? <CheckCircle size={40} className="text-green-600" /> : <XCircle size={40} className="text-orange-600" />}
             </div>
             <h2 className="text-2xl font-bold mb-2">{score >= 70 ? 'Excellent!' : 'Good Try!'}</h2>
             <p className="text-4xl font-bold text-[var(--primary)] mb-6">{score}%</p>
             <button onClick={() => setSelectedLesson(null)} className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 transition-all">
                {lang === 'en' ? 'Back to Lessons' : 'पाठों पर वापस जाएं'}
             </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-0">
        <button onClick={() => setSelectedLesson(null)} className="mb-4 flex items-center gap-2 text-[var(--primary)] font-bold">
           <ChevronDown size={18} className="rotate-90" /> {lang === 'en' ? 'Back' : 'वापस'}
        </button>

        <div className="mb-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
           <div className="h-1.5 bg-[var(--bg-input)]">
              <div className="h-full bg-[var(--primary)] transition-all" style={{width: `${progress}%`}} />
           </div>
           <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
              {step.question ? (
                 <div className="space-y-4">
                    <p className="text-lg mb-4">{step.question}</p>
                    {step.options.map((opt: string, i: number) => {
                       const isSelected = answers[currentStep] === i;
                       const feedback = answerFeedback && hasAnswered;
                       const isCorrect = i === step.correct;
                       let btnStyle = "w-full p-4 rounded-xl text-left border-2 transition-all font-medium flex justify-between items-center ";
                       if (feedback) {
                          if (isSelected && isCorrect) btnStyle += "bg-green-100 border-green-500 text-green-700";
                          else if (isSelected && !isCorrect) btnStyle += "bg-red-100 border-red-500 text-red-700";
                          else if (isCorrect) btnStyle += "bg-green-50 border-green-300 text-green-700";
                          else btnStyle += "bg-[var(--bg-input)] border-transparent opacity-50";
                       } else if (isSelected) btnStyle += "bg-[var(--primary)] border-[var(--primary)] text-white";
                       else btnStyle += "bg-[var(--bg-input)] border-transparent hover:border-[var(--primary)]";

                       return (
                          <button key={i} onClick={() => handleAnswer(currentStep, i)} disabled={hasAnswered} className={btnStyle}>
                             {opt}
                             {feedback && isCorrect && <Check size={18} />}
                             {feedback && isSelected && !isCorrect && <X size={18} />}
                          </button>
                       );
                    })}
                 </div>
              ) : (
                <p className="text-[var(--text-muted)] text-lg leading-relaxed whitespace-pre-line">{step.content}</p>
              )}
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-6 py-4 bg-[var(--bg-input)] rounded-xl font-bold disabled:opacity-50">
              {lang === 'en' ? 'Prev' : 'पिछला'}
           </button>
           <button onClick={handleNextStep} disabled={step.question && !hasAnswered} className="flex-1 py-4 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-all">
              {currentStep === selectedLesson.steps.length - 1 ? (lang === 'en' ? 'Finish' : 'समाप्त') : (lang === 'en' ? 'Next' : 'अगला')}
           </button>
        </div>
      </div>
    );
  }

  const completedCount = lessons.filter(l => getLessonCompletion(l.id)).length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="w-full md:max-w-5xl md:mx-auto space-y-6">
      <div className="bg-gradient-to-r from-[var(--primary)] to-blue-600 rounded-3xl p-6 text-white shadow-xl">
         <div className="flex justify-between items-start mb-6">
            <div>
               <h2 className="text-3xl font-black mb-1">{t('nav_seekho')}</h2>
               <p className="opacity-80">{lang === 'en' ? 'Master new skills' : 'नई कौशल सीखें'}</p>
            </div>
            <div className="text-4xl font-black">{progressPercent}%</div>
         </div>
         <div className="h-4 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-1000" style={{width: `${progressPercent}%`}} />
         </div>
         <p className="mt-4 text-sm font-bold">{completedCount} / {lessons.length} {lang === 'en' ? 'Lessons Completed' : 'पाठ पूरे हुए'}</p>
      </div>

      {badges.length > 0 && (
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
           <h3 className="font-bold mb-4 flex items-center gap-2">
              <Star size={20} className="text-yellow-500" /> 
              {lang === 'en' ? 'Your Achievement Badges' : 'आपकी उपलब्धियां'}
           </h3>
           <div className="flex gap-4 overflow-x-auto pb-2">
              {badges.map(b => (
                <div key={b.id} className="flex flex-col items-center gap-1 group shrink-0">
                   <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {b.icon}
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter text-center max-w-[80px]">
                      {b.name}
                   </span>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map(lesson => {
          const completion = getLessonCompletion(lesson.id);
          const Icon = lesson.icon;
          return (
            <div key={lesson.id} onClick={() => handleStartLesson(lesson)} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] overflow-hidden hover:border-[var(--primary)] transition-all cursor-pointer group shadow-sm hover:shadow-xl">
               <div className={`h-32 ${lesson.bgColor} flex items-center justify-center relative`}>
                  <Icon size={48} className={`${lesson.iconColor} group-hover:scale-110 transition-transform`} />
                  {completion && <div className="absolute top-3 right-3 p-1.5 bg-green-500 text-white rounded-full"><Check size={16} /></div>}
               </div>
               <div className="p-5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase mb-1">
                     <Clock size={12} /> {lesson.duration}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{lesson.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">{lesson.desc}</p>
                  <button className="w-full py-3 bg-[var(--bg-input)] group-hover:bg-[var(--primary)] group-hover:text-white rounded-2xl font-bold transition-all">
                     {completion ? (lang === 'en' ? 'Review' : 'दोहराएं') : (lang === 'en' ? 'Start' : 'शुरू करें')}
                  </button>
               </div>
            </div>
          );
        })}
      </div>

      <div className="pt-8 border-t border-[var(--border)]">
         <SurakshaView lang={lang} />
      </div>
    </div>
  );
}
