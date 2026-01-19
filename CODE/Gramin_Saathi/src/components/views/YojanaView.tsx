import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Settings, 
  User, 
  Sun, 
  Smartphone, 
  Bookmark, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { db } from '../../lib/firebase-config';
import { SchemeChecker } from './SchemeChecker';

export function YojanaView({ t, lang, user, appId }: any) {
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [bookmarkedSchemes, setBookmarkedSchemes] = useState<Set<number>>(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);

  // Load bookmarked schemes from Firebase
  useEffect(() => {
    if (!user || !db) return;
    
    const loadBookmarks = async () => {
      try {
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${user.uid}/bookmarked_schemes`);
        const snapshot = await getDocs(bookmarksRef);
        const bookmarked = new Set<number>();
        snapshot.forEach(doc => bookmarked.add(parseInt(doc.id)));
        setBookmarkedSchemes(bookmarked);
      } catch (e) {
        console.error('Error loading bookmarks:', e);
      }
    };
    
    loadBookmarks();
  }, [user, appId]);

  // Toggle bookmark
  const toggleBookmark = async (schemeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    
    const isBookmarked = bookmarkedSchemes.has(schemeId);
    const newBookmarks = new Set(bookmarkedSchemes);
    
    try {
      const bookmarkRef = doc(db, `artifacts/${appId}/users/${user.uid}/bookmarked_schemes/${schemeId}`);
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        newBookmarks.delete(schemeId);
      } else {
        await setDoc(bookmarkRef, { schemeId, savedAt: new Date().toISOString() });
        newBookmarks.add(schemeId);
      }
      setBookmarkedSchemes(newBookmarks);
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  };
  
  // Scheme Icons & Colors mapping
  const schemeStyles: any = {
    1: { icon: Wallet, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    2: { icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
    3: { icon: Shield, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    4: { icon: Settings, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
    5: { icon: User, color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30' },
    6: { icon: Sun, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
    7: { icon: Smartphone, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
    8: { icon: Shield, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    9: { icon: Wallet, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    10: { icon: Settings, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
    11: { icon: Wallet, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    12: { icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  };

  const tagColors: any = {
    'Income': 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    'Loan': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    'Insurance': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    'Skill': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    'Women': 'bg-pink-500/20 text-pink-500 border-pink-500/30',
    'Energy': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    'Tech': 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
  };

  const schemes = [
    {
      id: 1,
      nameEn: "PM Kisan Samman Nidhi",
      nameHi: "पीएम किसान सम्मान निधि",
      descEn: "Get ₹6000 per year directly in your bank account.",
      descHi: "अपने बैंक खाते में सीधे ₹6000 प्रति वर्ष प्राप्त करें।",
      tag: "Income",
      benefitsEn: ["₹6000 per year in 3 installments", "Direct bank transfer", "No middlemen involved"],
      benefitsHi: ["3 किस्तों में प्रति वर्ष ₹6000", "सीधे बैंक ट्रांसफर", "कोई बिचौलिया नहीं"],
      eligibilityEn: ["All land-holding farmer families", "Aadhar card linked to bank", "Cultivable land ownership"],
      eligibilityHi: ["सभी भूमिधारक किसान परिवार", "बैंक से जुड़ा आधार कार्ड", "खेती योग्य भूमि का स्वामित्व"],
      docsEn: ["Aadhar Card", "Bank Passbook", "Land Records (Khatauni)"],
      docsHi: ["आधार कार्ड", "बैंक पासबुक", "भूमि रिकॉर्ड (खतौनी)"],
      applyLink: "https://pmkisan.gov.in"
    },
    {
      id: 2,
      nameEn: "Kisan Credit Card (KCC)",
      nameHi: "किसान क्रेडिट कार्ड (केसीसी)",
      descEn: "Low interest loans (4%) for seeds and fertilizers.",
      descHi: "बीज और खाद के लिए कम ब्याज (4%) वाला ऋण।",
      tag: "Loan",
      benefitsEn: ["4% interest rate (with subsidy)", "Flexible repayment", "Crop insurance included", "Up to ₹3 lakh loan"],
      benefitsHi: ["4% ब्याज दर (सब्सिडी के साथ)", "लचीला पुनर्भुगतान", "फसल बीमा शामिल", "₹3 लाख तक का ऋण"],
      eligibilityEn: ["Farmers owning or leasing land", "Sharecroppers and tenant farmers", "Self-help groups"],
      eligibilityHi: ["भूमि के मालिक या पट्टेदार किसान", "बटाईदार और किरायेदार किसान", "स्वयं सहायता समूह"],
      docsEn: ["Aadhar Card", "Land documents", "Passport photo", "Application form"],
      docsHi: ["आधार कार्ड", "भूमि दस्तावेज", "पासपोर्ट फोटो", "आवेदन पत्र"],
      applyLink: "https://pmkisan.gov.in/KCC"
    },
    {
      id: 3,
      nameEn: "Pradhan Mantri Fasal Bima",
      nameHi: "प्रधानमंत्री फसल बीमा योजना",
      descEn: "Insurance for crop failure due to rain or drought.",
      descHi: "बारिश या सूखे के कारण फसल खराब होने का बीमा।",
      tag: "Insurance",
      benefitsEn: ["Low premium (1.5-2%)", "Full sum insured coverage", "Quick claim settlement", "Covers all crops"],
      benefitsHi: ["कम प्रीमियम (1.5-2%)", "पूर्ण बीमित राशि कवरेज", "त्वरित दावा निपटान", "सभी फसलों को कवर करता है"],
      eligibilityEn: ["All farmers growing notified crops", "Both loanee and non-loanee farmers", "Sharecroppers with land docs"],
      eligibilityHi: ["अधिसूचित फसल उगाने वाले सभी किसान", "ऋणी और गैर-ऋणी दोनों किसान", "भूमि दस्तावेजों वाले बटाईदार"],
      docsEn: ["Aadhar Card", "Bank details", "Land records", "Sowing certificate"],
      docsHi: ["आधार कार्ड", "बैंक विवरण", "भूमि रिकॉर्ड", "बुवाई प्रमाण पत्र"],
      applyLink: "https://pmfby.gov.in"
    },
    {
      id: 4,
      nameEn: "PM Vishwakarma",
      nameHi: "पीएम विश्वकर्मा",
      descEn: "Loans and skill training for traditional artisans/craftsmen.",
      descHi: "पारंपरिक कारीगरों और शिल्पकारों के लिए ऋण और कौशल प्रशिक्षण।",
      tag: "Skill",
      benefitsEn: ["₹500/day during training", "Up to ₹3 lakh loan at 5%", "Free toolkit worth ₹15,000", "PM Vishwakarma Certificate"],
      benefitsHi: ["प्रशिक्षण के दौरान ₹500/दिन", "5% पर ₹3 लाख तक का ऋण", "₹15,000 मूल्य की मुफ्त टूलकिट", "पीएम विश्वकर्मा प्रमाण पत्र"],
      eligibilityEn: ["Traditional artisans/craftsmen", "Age 18+ years", "Working in 18 identified trades"],
      eligibilityHi: ["पारंपरिक कारीगर/शिल्पकार", "आयु 18+ वर्ष", "18 पहचाने गए व्यापारों में काम करना"],
      docsEn: ["Aadhar Card", "Bank account", "Mobile number", "Trade proof"],
      docsHi: ["आधार कार्ड", "बैंक खाता", "मोबाइल नंबर", "व्यापार प्रमाण"],
      applyLink: "https://pmvishwakarma.gov.in"
    },
    {
      id: 5,
      nameEn: "Lakhpati Didi",
      nameHi: "लखपति दीदी",
      descEn: "Skill development training for women in SHGs to earn more.",
      descHi: "स्वयं सहायता समूहों में महिलाओं के लिए कौशल विकास प्रशिक्षण।",
      tag: "Women",
      benefitsEn: ["Free skill training", "Market linkage support", "Bank loan access", "Target: ₹1 lakh/year income"],
      benefitsHi: ["मुफ्त कौशल प्रशिक्षण", "बाजार संपर्क सहायता", "बैंक ऋण पहुंच", "लक्ष्य: ₹1 लाख/वर्ष आय"],
      eligibilityEn: ["Women in Self Help Groups", "Rural women 18-60 years", "Interest in entrepreneurship"],
      eligibilityHi: ["स्वयं सहायता समूहों में महिलाएं", "ग्रामीण महिलाएं 18-60 वर्ष", "उद्यमिता में रुचि"],
      docsEn: ["Aadhar Card", "SHG membership proof", "Bank account"],
      docsHi: ["आधार कार्ड", "एसएचजी सदस्यता प्रमाण", "बैंक खाता"],
      applyLink: "https://nrlm.gov.in"
    },
    {
      id: 6,
      nameEn: "PM Surya Ghar",
      nameHi: "पीएम सूर्य घर",
      descEn: "Free electricity via rooftop solar panels.",
      descHi: "छत पर सौर पैनलों के माध्यम से मुफ्त बिजली।",
      tag: "Energy",
      benefitsEn: ["300 units free electricity/month", "Subsidy up to ₹78,000", "25 year panel life", "Sell extra power to grid"],
      benefitsHi: ["300 यूनिट मुफ्त बिजली/माह", "₹78,000 तक की सब्सिडी", "25 साल पैनल जीवन", "ग्रिड को अतिरिक्त बिजली बेचें"],
      eligibilityEn: ["Residential house owner", "Valid electricity connection", "Suitable rooftop space"],
      eligibilityHi: ["आवासीय घर का मालिक", "वैध बिजली कनेक्शन", "उपयुक्त छत की जगह"],
      docsEn: ["Aadhar Card", "Electricity bill", "Bank account", "Property documents"],
      docsHi: ["आधार कार्ड", "बिजली बिल", "बैंक खाता", "संपत्ति दस्तावेज"],
      applyLink: "https://pmsuryaghar.gov.in"
    },
    {
      id: 7,
      nameEn: "Namo Drone Didi",
      nameHi: "नमो ड्रोन दीदी",
      descEn: "Drones for women to help in agriculture.",
      descHi: "कृषि में मदद करने के लिए महिलाओं के लिए ड्रोन।",
      tag: "Tech",
      benefitsEn: ["Free drone + training", "Earn ₹1 lakh+/year as drone pilot", "Agriculture spraying service", "Modern technology access"],
      benefitsHi: ["मुफ्त ड्रोन + प्रशिक्षण", "ड्रोन पायलट के रूप में ₹1 लाख+/वर्ष कमाएं", "कृषि छिड़काव सेवा", "आधुनिक तकनीक तक पहुंच"],
      eligibilityEn: ["Women from SHGs", "Age 18-50 years", "10th pass minimum", "Physical fitness"],
      eligibilityHi: ["एसएचजी से महिलाएं", "आयु 18-50 वर्ष", "न्यूनतम 10वीं पास", "शारीरिक फिटनेस"],
      docsEn: ["Aadhar Card", "10th marksheet", "SHG certificate", "Medical certificate"],
      docsHi: ["आधार कार्ड", "10वीं की मार्कशीट", "एसएचजी प्रमाण पत्र", "चिकित्सा प्रमाण पत्र"],
      applyLink: "https://agriculture.gov.in/drone"
    },
    {
      id: 8,
      nameEn: "Ayushman Bharat",
      nameHi: "आयुष्मान भारत",
      descEn: "Free health insurance of ₹5 lakh for family.",
      descHi: "परिवार के लिए ₹5 लाख का मुफ्त स्वास्थ्य बीमा।",
      tag: "Insurance",
      benefitsEn: ["₹5 lakh coverage per family/year", "Free treatment at empanelled hospitals", "Covers 1400+ medical procedures", "No age limit"],
      benefitsHi: ["₹5 लाख कवरेज प्रति परिवार/वर्ष", "सूचीबद्ध अस्पतालों में मुफ्त इलाज", "1400+ चिकित्सा प्रक्रियाओं को कवर करता है", "कोई आयु सीमा नहीं"],
      eligibilityEn: ["Families listed in SECC 2011", "Rural and urban poor", "Automatic eligibility for eligible families"],
      eligibilityHi: ["SECC 2011 में सूचीबद्ध परिवार", "ग्रामीण और शहरी गरीब", "पात्र परिवारों के लिए स्वचालित पात्रता"],
      docsEn: ["Aadhar Card", "Ration Card", "Mobile number", "Family details"],
      docsHi: ["आधार कार्ड", "राशन कार्ड", "मोबाइल नंबर", "परिवार विवरण"],
      applyLink: "https://pmjay.gov.in"
    },
    {
      id: 9,
      nameEn: "MGNREGA",
      nameHi: "मनरेगा",
      descEn: "Guaranteed 100 days employment at ₹300/day.",
      descHi: "₹300/दिन की दर से 100 दिन की गारंटी रोजगार।",
      tag: "Income",
      benefitsEn: ["100 days guaranteed work/year", "₹300+ per day wages", "Direct bank payment within 15 days", "Work near home"],
      benefitsHi: ["100 दिन गारंटी काम/वर्ष", "₹300+ प्रति दिन मजदूरी", "15 दिनों के भीतर सीधे बैंक भुगतान", "घर के पास काम"],
      eligibilityEn: ["Rural household adults", "18+ years age", "Willing to do manual work"],
      eligibilityHi: ["ग्रामीण परिवार के वयस्क", "18+ वर्ष आयु", "शारीरिक काम करने के लिए तैयार"],
      docsEn: ["Job card", "Aadhar Card", "Bank account", "Passport photo"],
      docsHi: ["जॉब कार्ड", "आधार कार्ड", "बैंक खाता", "पासपोर्ट फोटो"],
      applyLink: "https://nrega.nic.in"
    },
    {
      id: 10,
      nameEn: "Soil Health Card",
      nameHi: "मृदा स्वास्थ्य कार्ड",
      descEn: "Free soil testing to increase crop yield by 15-20%.",
      descHi: "फसल की उपज 15-20% बढ़ाने के लिए मुफ्त मिट्टी परीक्षण।",
      tag: "Skill",
      benefitsEn: ["Free soil nutrient analysis", "Customized fertilizer recommendations", "Save 15-20% on fertilizer costs", "Increase yield by 15-20%"],
      benefitsHi: ["मुफ्त मिट्टी पोषक तत्व विश्लेषण", "अनुकूलित उर्वरक सिफारिशें", "उर्वरक लागत पर 15-20% बचत", "उपज में 15-20% वृद्धि"],
      eligibilityEn: ["All farmers with cultivable land", "Both loanee and non-loanee", "Sharecroppers with permission"],
      eligibilityHi: ["खेती योग्य भूमि वाले सभी किसान", "ऋणी और गैर-ऋणी दोनों", "अनुमति वाले बटाईदार"],
      docsEn: ["Aadhar Card", "Land records", "Soil sample"],
      docsHi: ["आधार कार्ड", "भूमि रिकॉर्ड", "मिट्टी का नमूना"],
      applyLink: "https://soilhealth.dac.gov.in"
    },
    {
      id: 11,
      nameEn: "Atal Pension Yojana",
      nameHi: "अटल पेंशन योजना",
      descEn: "Guaranteed monthly pension of ₹1000-₹5000 after 60.",
      descHi: "60 के बाद ₹1000-₹5000 की गारंटी मासिक पेंशन।",
      tag: "Income",
      benefitsEn: ["Fixed pension ₹1000-₹5000/month", "Minimum ₹42-₹210 per month contribution", "Government co-contribution for eligible", "Spouse pension available"],
      benefitsHi: ["निश्चित पेंशन ₹1000-₹5000/माह", "न्यूनतम ₹42-₹210 प्रति माह योगदान", "पात्र के लिए सरकारी सह-योगदान", "जीवनसाथी पेंशन उपलब्ध"],
      eligibilityEn: ["Age 18-40 years", "Bank account holder", "Not income tax payer", "Aadhar linked"],
      eligibilityHi: ["आयु 18-40 वर्ष", "बैंक खाता धारक", "आयकर दाता नहीं", "आधार लिंक"],
      docsEn: ["Aadhar Card", "Bank account", "Mobile number"],
      docsHi: ["आधार कार्ड", "बैंक खाता", "मोबाइल नंबर"],
      applyLink: "https://npscra.nsdl.co.in/atal-pension-yojana.php"
    },
    {
      id: 12,
      nameEn: "National Livestock Mission",
      nameHi: "राष्ट्रीय पशुधन मिशन",
      descEn: "Subsidy on cattle, dairy, and poultry farming.",
      descHi: "पशुपालन, डेयरी और मुर्गी पालन पर सब्सिडी।",
      tag: "Loan",
      benefitsEn: ["25-50% subsidy on livestock", "Low interest loans available", "Free training and insurance", "Market linkage support"],
      benefitsHi: ["पशुधन पर 25-50% सब्सिडी", "कम ब्याज ऋण उपलब्ध", "मुफ्त प्रशिक्षण और बीमा", "बाजार संपर्क सहायता"],
      eligibilityEn: ["Farmers and landless laborers", "Self-help groups", "Dairy cooperatives"],
      eligibilityHi: ["किसान और भूमिहीन मजदूर", "स्वयं सहायता समूह", "डेयरी सहकारिताएं"],
      docsEn: ["Aadhar Card", "Bank account", "Land documents (if any)", "Project report"],
      docsHi: ["आधार कार्ड", "बैंक खाता", "भूमि दस्तावेज (यदि कोई हो)", "परियोजना रिपोर्ट"],
      applyLink: "https://dahd.nic.in"
    }
  ];

  if (selectedScheme) {
    const s = selectedScheme;
    const isBookmarked = bookmarkedSchemes.has(s.id);
    return (
      <div className="w-full md:max-w-3xl md:mx-auto space-y-4 pb-6">
        {/* Back Button */}
        <div className="flex items-center justify-between sticky top-0 bg-[var(--bg-main)] py-2 z-10">
          <button 
            onClick={() => setSelectedScheme(null)}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
          >
            <ChevronRight className="rotate-180" size={18} />
            {lang === 'en' ? 'Back' : 'वापस'}
          </button>
          <button
            onClick={(e) => toggleBookmark(s.id, e)}
            className={`p-2 rounded-lg transition-all ${isBookmarked ? 'bg-amber-500 text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500'}`}
          >
            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">{s.tag}</span>
          <h2 className="text-lg md:text-xl font-bold mt-2">{lang === 'en' ? s.nameEn : s.nameHi}</h2>
          <p className="opacity-90 mt-1 text-sm">{lang === 'en' ? s.descEn : s.descHi}</p>
        </div>

        {/* Benefits */}
        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
          <h3 className="font-bold text-sm text-[var(--primary)] mb-2 flex items-center gap-2">
            <Sparkles size={16} />
            {lang === 'en' ? 'Benefits' : 'लाभ'}
          </h3>
          <ul className="space-y-1.5">
            {(lang === 'en' ? s.benefitsEn : s.benefitsHi).map((b: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                <span className="text-[var(--success)] mt-0.5">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Eligibility */}
        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
          <h3 className="font-bold text-sm text-[var(--secondary)] mb-2 flex items-center gap-2">
            <User size={16} />
            {lang === 'en' ? 'Who Can Apply' : 'कौन आवेदन कर सकता है'}
          </h3>
          <ul className="space-y-1.5">
            {(lang === 'en' ? s.eligibilityEn : s.eligibilityHi).map((e: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <span className="text-[var(--primary)]">•</span>
                {e}
              </li>
            ))}
          </ul>
        </div>

        {/* Documents Required */}
        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
          <h3 className="font-bold text-sm text-[var(--accent)] mb-2 flex items-center gap-2">
            <BookOpen size={16} />
            {lang === 'en' ? 'Documents Required' : 'आवश्यक दस्तावेज'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(lang === 'en' ? s.docsEn : s.docsHi).map((d: string, i: number) => (
              <span key={i} className="bg-[var(--bg-input)] px-2.5 py-1 rounded-lg text-xs text-[var(--text-main)] border border-[var(--border)]">
                {d}
              </span>
            ))}
          </div>
        </div>

        <a 
          href={s.applyLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-center font-bold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-lg"
        >
          {lang === 'en' ? 'Apply Now →' : 'अभी आवेदन करें →'}
        </a>
      </div>
    );
  }

  const displaySchemes = showBookmarked ? schemes.filter(s => bookmarkedSchemes.has(s.id)) : schemes;

  return (
    <div className="w-full md:max-w-3xl md:mx-auto space-y-4">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-xl shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-bold">{t('nav_yojana')}</h2>
            <p className="opacity-90 text-xs md:text-sm">{t('gov_support')}</p>
          </div>
          <ShieldCheck size={36} className="opacity-30" />
        </div>
      </div>

      {/* Bookmarks Filter */}
      {bookmarkedSchemes.size > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowBookmarked(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!showBookmarked ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            {lang === 'en' ? 'All Schemes' : 'सभी योजनाएं'}
          </button>
          <button
            onClick={() => setShowBookmarked(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${showBookmarked ? 'bg-amber-500 text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            <Bookmark size={12} />
            {lang === 'en' ? 'Saved' : 'सहेजा'} ({bookmarkedSchemes.size})
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {displaySchemes.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
            <Bookmark size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{lang === 'en' ? 'No saved schemes yet' : 'अभी तक कोई योजना सहेजी नहीं गई'}</p>
          </div>
        ) : displaySchemes.map(s => {
          const style = schemeStyles[s.id] || schemeStyles[1];
          const SchemeIcon = style.icon;
          const tagColor = tagColors[s.tag] || 'bg-gray-500/20 text-gray-500';
          const isBookmarked = bookmarkedSchemes.has(s.id);
          
          return (
            <div 
              key={s.id} 
              onClick={() => setSelectedScheme(s)}
              className="bg-[var(--bg-card)] p-3 md:p-4 rounded-xl border border-[var(--border)] shadow-sm hover:border-[var(--primary)] hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
            >
              <div className="flex gap-3 items-start">
                <div className={`p-2.5 md:p-3 rounded-xl ${style.bgColor} ${style.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  <SchemeIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tagColor}`}>{s.tag}</span>
                    {isBookmarked && <Bookmark size={12} className="text-amber-500" fill="currentColor" />}
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-[var(--text-main)] mb-0.5 group-hover:text-[var(--primary)] transition-colors line-clamp-1">{lang === 'en' ? s.nameEn : s.nameHi}</h3>
                  <p className="text-[var(--text-muted)] text-xs line-clamp-2">{lang === 'en' ? s.descEn : s.descHi}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-8 border-t border-[var(--border)]">
        <SchemeChecker lang={lang} />
      </div>
    </div>
  );
}
