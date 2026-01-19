// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Leaf,
  ArrowRight,
  Play,
  ChevronDown,
  Menu,
  X,
  Quote,
  Mic,
  Wallet,
  Landmark,
  TrendingUp,
  Cloud,
  BookOpen,
  Languages,
  WifiOff,
  Shield,
  IndianRupee,
  Sprout,
  BarChart3,
  Sun,
  CheckCircle,
  User,
  Users
} from 'lucide-react';
import { LandingChatbot } from './LandingChatbot';
import { VoiceNavigationButton } from './VoiceNavigationButton';
import { VideoPlayer } from './VideoPlayer';
import { getDemoVideo } from '../lib/video-library';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onGetStarted: () => void;
  lang: string;
  toggleLang: () => void;
  onFeatureClick?: (id: string) => void;
  onLogoClick?: () => void;
  user?: any;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
}

const allTestimonials = [
  {
    name: 'Ramesh Kumar',
    name_hi: 'रमेश कुमार',
    location: 'Sonipat, Haryana',
    location_hi: 'सोनीपत, हरियाणा',
    icon: Sprout,
    quote: 'Found PM-KISAN through this app. Got ₹6,000 deposited directly!',
    quote_hi: 'इस ऐप से PM-KISAN मिला। ₹6,000 सीधे जमा हुए!'
  },
  {
    name: 'Sunita Devi',
    name_hi: 'सुनीता देवी',
    location: 'Vaishali, Bihar',
    location_hi: 'वैशाली, बिहार',
    icon: Mic,
    quote: 'I just speak in Hindi and it writes everything. No typing needed!',
    quote_hi: 'बस हिंदी में बोलो, सब लिख जाता है। टाइप नहीं करना!'
  },
  {
    name: 'Ganesh Patil',
    name_hi: 'गणेश पाटिल',
    location: 'Nashik, Maharashtra',
    location_hi: 'नासिक, महाराष्ट्र',
    icon: Cloud,
    quote: 'Weather alert saved my grape crop. Got 2 days advance warning!',
    quote_hi: 'मौसम अलर्ट ने अंगूर की फसल बचाई। 2 दिन पहले चेतावनी मिली!'
  },
  {
    name: 'Kavita Singh',
    name_hi: 'कविता सिंह',
    location: 'Lucknow, UP',
    location_hi: 'लखनऊ, UP',
    icon: TrendingUp,
    quote: 'Mandi prices helped me sell potatoes at better rate.',
    quote_hi: 'मंडी भाव से आलू अच्छे दाम पर बेचा।'
  },
  {
    name: 'Mohan Reddy',
    name_hi: 'मोहन रेड्डी',
    location: 'Anantapur, AP',
    location_hi: 'अनंतपुर, AP',
    icon: Sprout,
    quote: 'AI advice on groundnut pest control was very helpful.',
    quote_hi: 'मूंगफली कीट नियंत्रण पर AI सलाह बहुत मददगार थी।'
  },
  {
    name: 'Priya Sharma',
    name_hi: 'प्रिया शर्मा',
    location: 'Jaipur, Rajasthan',
    location_hi: 'जयपुर, राजस्थान',
    icon: Wallet,
    quote: 'Easy to track daily expenses. Very useful for small farmers.',
    quote_hi: 'रोज का खर्च ट्रैक करना आसान। छोटे किसानों के लिए उपयोगी।'
  },
  {
    name: 'Arjun Yadav',
    name_hi: 'अर्जुन यादव',
    location: 'Indore, MP',
    location_hi: 'इंदौर, MP',
    icon: BookOpen,
    quote: 'Learned about organic farming from Seekho section.',
    quote_hi: 'सीखो सेक्शन से जैविक खेती सीखी।'
  },
  {
    name: 'Lakshmi Bai',
    name_hi: 'लक्ष्मी बाई',
    location: 'Nagpur, Maharashtra',
    location_hi: 'नागपुर, महाराष्ट्र',
    icon: Landmark,
    quote: 'Got crop insurance scheme through Yojana Hub.',
    quote_hi: 'योजना हब से फसल बीमा योजना मिली।'
  },
  {
    name: 'Ravi Meena',
    name_hi: 'रवि मीणा',
    location: 'Kota, Rajasthan',
    location_hi: 'कोटा, राजस्थान',
    icon: WifiOff,
    quote: 'Works offline in my village. Very important feature!',
    quote_hi: 'मेरे गांव में ऑफलाइन काम करता है। बहुत जरूरी फीचर!'
  },
  {
    name: 'Sarita Kumari',
    name_hi: 'सरिता कुमारी',
    location: 'Patna, Bihar',
    location_hi: 'पटना, बिहार',
    icon: IndianRupee,
    quote: 'Now I manage my farm finances properly. Thank you!',
    quote_hi: 'अब मैं अपने खेत का हिसाब ठीक से रखती हूं। धन्यवाद!'
  }
];

const featuresList = [
  {
    id: 'saathi',
    Icon: Sprout,
    title: { en: 'AI Farming Advisor', hi: 'AI कृषि सलाहकार' },
    desc: { 
      en: 'Get personalized crop advice and pest control tips in your language', 
      hi: 'अपनी भाषा में फसल सलाह और कीट नियंत्रण टिप्स पाएं' 
    }
  },
  {
    id: 'khata',
    Icon: Wallet,
    title: { en: 'Voice Khata Book', hi: 'वॉइस खाता बुक' },
    desc: { 
      en: 'Just speak to track income and expenses. No typing needed!', 
      hi: 'बस बोलकर आय-खर्च का हिसाब रखें। टाइप नहीं करना!' 
    }
  },
  {
    id: 'yojana',
    Icon: Landmark,
    title: { en: 'Government Schemes', hi: 'सरकारी योजनाएं' },
    desc: { 
      en: 'Discover PM-KISAN, crop insurance & schemes you qualify for', 
      hi: 'PM-KISAN, फसल बीमा और पात्र योजनाएं खोजें' 
    }
  },
  {
    id: 'mandi',
    Icon: BarChart3,
    title: { en: 'Live Mandi Rates', hi: 'लाइव मंडी भाव' },
    desc: { 
      en: 'Real-time prices from nearby markets. Sell at best price!', 
      hi: 'नजदीकी मंडियों से रियल-टाइम भाव। सबसे अच्छे दाम पर बेचें!' 
    }
  },
  {
    id: 'mausam',
    Icon: Sun,
    title: { en: 'Weather Alerts', hi: 'मौसम अलर्ट' },
    desc: { 
      en: '7-day forecast with alerts to protect your crops', 
      hi: 'फसल सुरक्षा के लिए 7 दिन का पूर्वानुमान और अलर्ट' 
    }
  },
  {
    id: 'seekho',
    Icon: BookOpen,
    title: { en: 'Learn & Grow', hi: 'सीखें और बढ़ें' },
    desc: { 
      en: 'Financial literacy and modern farming techniques', 
      hi: 'वित्तीय साक्षरता और आधुनिक खेती तकनीक' 
    }
  }
];

const statsList = [
  { value: '1,200+', label: { en: 'Active Users', hi: 'सक्रिय उपयोगकर्ता' }, Icon: Users },
  { value: '₹15L+', label: { en: 'Transactions Tracked', hi: 'लेनदेन ट्रैक किए' }, Icon: IndianRupee },
  { value: '50+', label: { en: 'Villages Reached', hi: 'गांव पहुंचे' }, Icon: Landmark }
];

export default function LandingPage({ onGetStarted, lang, toggleLang, onFeatureClick, onLogoClick, user, onLogout, onNavigate }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  
  // Get demo video based on current language
  const demoVideo = getDemoVideo(lang);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // GSAP Animations
    const ctx = gsap.context(() => {
      // Hero Animation
      gsap.from('.hero-content > *', {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
      });

      gsap.from('.hero-image', {
        scale: 1.1,
        opacity: 0,
        duration: 1.5,
        ease: 'power2.out'
      });

      // Feature Cards Scroll Animation
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '#features',
          start: 'top 95%', 
          toggleActions: 'play none none none',
          once: true,
        },
        y: 40,
        opacity: 0,
        scale: 0.98,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        immediateRender: false // Crucial: don't hide until the trigger is reached or animation starts
      });

      // Impact Stats Animation
      gsap.from('.stat-card', {
        scrollTrigger: {
          trigger: '#impact',
          start: 'top 85%',
          once: true
        },
        scale: 0.9,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'back.out(1.7)'
      });
      
      // Refresh ScrollTrigger after a short delay to ensure DOM is settled
      setTimeout(() => ScrollTrigger.refresh(), 1000);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      ctx.revert();
    };
  }, [lang]);

  // Randomly select 5 testimonials on mount
  const testimonials = useMemo(() => {
    const shuffled = [...allTestimonials].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [lang]);

  const DEMO_VIDEO_URL = 'https://www.youtube.com/watch?v=RcG1TwdPoKI';

  return (
    <div className="min-h-screen bg-[#0a1f1a] text-white overflow-x-hidden">
      {/* Import Space Grotesk font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .heading-font { font-family: 'Space Grotesk', system-ui, sans-serif; }
        body { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .feature-card { opacity: 1; visibility: visible; }
      `}</style>
      
      {/* ===== NAVBAR ===== */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0a1f1a]/95 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <button 
              onClick={onLogoClick} 
              className="flex items-center gap-2 sm:gap-3 hover:scale-[1.02] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#c8e038] rounded-xl p-1"
            >
              <img src="/favicon.svg" alt="Gramin Saathi" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-lg" />
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                Gramin <span className="text-[#c8e038]">Saathi</span>
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#features" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {lang === 'en' ? 'Features' : 'विशेषताएं'}
              </a>
              <a href="#impact" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {lang === 'en' ? 'Impact' : 'प्रभाव'}
              </a>
              <a href="#stories" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {lang === 'en' ? 'Stories' : 'कहानियां'}
              </a>
            </div>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={toggleLang} 
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white border border-white/20 rounded-lg hover:border-white/40 transition-all"
              >
                {lang === 'en' ? 'हिंदी' : 'EN'}
              </button>
              {user && onLogout ? (
                <button 
                  onClick={onLogout}
                  className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  {lang === 'en' ? 'Sign Out' : 'साइन आउट'}
                </button>
              ) : (
                <button 
                  onClick={onGetStarted}
                  className="px-5 py-2 bg-[#c8e038] text-[#0a1f1a] text-sm font-semibold rounded-lg hover:bg-[#d4ea4d] transition-all"
                >
                  {lang === 'en' ? 'Get Started' : 'शुरू करें'}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white/80">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a1f1a] border-t border-white/10 px-4 py-4 space-y-3">
            <a href="#features" className="block py-2 text-white/70">{lang === 'en' ? 'Features' : 'विशेषताएं'}</a>
            <a href="#impact" className="block py-2 text-white/70">{lang === 'en' ? 'Impact' : 'प्रभाव'}</a>
            <a href="#stories" className="block py-2 text-white/70">{lang === 'en' ? 'Stories' : 'कहानियां'}</a>
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <button onClick={toggleLang} className="flex-1 py-2.5 border border-white/20 rounded-lg text-sm">
                {lang === 'en' ? 'हिंदी' : 'EN'}
              </button>
              <button onClick={onGetStarted} className="flex-1 py-2.5 bg-[#c8e038] text-[#0a1f1a] font-semibold rounded-lg">
                {lang === 'en' ? 'Start' : 'शुरू'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center pt-14 sm:pt-16">
        {/* Background */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80" 
            alt="" 
            className="w-full h-full object-cover hero-image"
          />
          <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#0a1f1a] via-[#0a1f1a]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f1a] to-transparent opacity-60" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-20 hero-content">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            {/* Left - Text Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c8e038]/15 border border-[#c8e038]/30 rounded-full mb-3 sm:mb-6">
                <span className="w-1.5 h-1.5 bg-[#c8e038] rounded-full animate-pulse" />
                <span className="text-[10px] sm:text-xs text-[#c8e038] font-medium">
                  {lang === 'en' ? 'Built for Indian Farmers' : 'भारतीय किसानों के लिए बनाया'}
                </span>
              </div>

              {/* Heading */}
              <h1 className="heading-font text-2xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] mb-3 sm:mb-5">
                {lang === 'en' ? (
                  <>Your Digital <span className="text-[#c8e038]">Farming</span> Companion</>
                ) : (
                  <>आपका डिजिटल <span className="text-[#c8e038]">खेती</span> साथी</>
                )}
              </h1>

              {/* Subheading */}
              <p className="text-xs sm:text-base text-white/60 mb-5 sm:mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">
                {lang === 'en' 
                  ? 'Track finances by voice, access schemes, get AI crop advice, and check mandi prices—all in your language.' 
                  : 'आवाज से हिसाब रखें, योजनाएं पाएं, AI फसल सलाह लें, मंडी भाव देखें—अपनी भाषा में।'
                }
              </p>

              {/* CTAs */}
              <div className="relative z-20 flex flex-col sm:flex-row gap-2.5 sm:gap-4 mb-6 sm:mb-10 justify-center lg:justify-start">
                <button 
                  onClick={onGetStarted}
                  className="group px-5 py-2.5 sm:px-6 sm:py-3 bg-[#c8e038] text-[#0a1f1a] font-semibold rounded-xl hover:bg-[#d4ea4d] active:scale-95 transition-all flex items-center justify-center gap-2 select-none cursor-pointer no-underline border-none outline-none"
                >
                  {lang === 'en' ? 'Start' : 'शुरू करें'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button 
                  onClick={() => setShowDemoVideo(true)}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 border border-white/20 text-white font-medium rounded-xl hover:border-white/40 active:scale-95 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  {lang === 'en' ? 'Watch Demo' : lang === 'pa' ? 'ਡੈਮੋ ਦੇਖੋ' : lang === 'mr' ? 'डेमो पहा' : 'डेमो देखें'}
                </button>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 sm:gap-8 justify-center lg:justify-start">
                {statsList.map((stat, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-lg sm:text-2xl font-bold text-[#c8e038]">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-white/50 whitespace-nowrap">{stat.label[lang] || stat.label.en}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Interactive Chatbot (Desktop only) */}
            <div className="hidden lg:block">
              <LandingChatbot lang={lang} />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-5 h-5 text-white/40 animate-bounce" />
        </div>
      </section>

      
      {/* ===== FEATURES ===== */}
      <section id="features" className="py-12 sm:py-20 bg-[#0d2922]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-xs uppercase tracking-widest text-[#c8e038] font-medium mb-2 sm:mb-3">
              {lang === 'en' ? 'Features' : 'विशेषताएं'}
            </p>
            <h2 className="heading-font text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              {lang === 'en' ? 'Everything You Need to Farm Smarter' : 'स्मार्ट खेती के लिए सब कुछ'}
            </h2>
          </div>

          {/* Grid - Full width on mobile */}
          <div className="features-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {featuresList.map((f, i) => (
              <div 
                key={i}
                onClick={() => onFeatureClick?.(f.id)}
                className="feature-card p-4 sm:p-6 bg-[#0a1f1a] rounded-xl sm:rounded-2xl border border-white/10 hover:border-[#c8e038]/50 hover:bg-[#0a1f1a]/80 active:scale-[0.98] transition-all duration-300 cursor-pointer group text-left select-none no-underline block"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#c8e038]/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#c8e038]/30 transition-colors">
                  <f.Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#c8e038]" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">{f.title[lang] || f.title.en}</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{f.desc[lang] || f.desc.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 sm:py-20 bg-[#f8f6f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Image */}
            <div className="relative order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                <img 
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
                  alt="Person using smartphone"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-[#0d2922] p-3 sm:p-4 rounded-xl shadow-xl max-w-[150px] sm:max-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#c8e038] flex items-center justify-center">
                    <Mic className="w-4 h-4 text-[#0a1f1a]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{lang === 'en' ? 'Voice Entry' : 'आवाज से'}</p>
                    <p className="text-[10px] text-white/60">{lang === 'en' ? '₹500 added' : '₹500 जोड़ा'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <p className="text-xs uppercase tracking-widest text-[#22c55e] font-medium mb-2 sm:mb-3">
                {lang === 'en' ? 'Easy to Use' : 'उपयोग में आसान'}
              </p>
              <h2 className="heading-font text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a1f1a] mb-4 sm:mb-6">
                {lang === 'en' ? 'Simple Enough for Everyone' : 'सभी के लिए आसान'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">
                {lang === 'en' 
                  ? 'No complicated forms. Just speak in your language and the app does the rest. Works even without internet connection.' 
                  : 'कोई जटिल फॉर्म नहीं। बस अपनी भाषा में बोलें। इंटरनेट के बिना भी काम करता है।'
                }
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto lg:mx-0">
                {[
                  { Icon: Languages, text: lang === 'en' ? 'Voice-first in 5+ languages' : '5+ भाषाओं में वॉइस-फर्स्ट' },
                  { Icon: WifiOff, text: lang === 'en' ? 'Works offline' : 'ऑफलाइन काम करता है' },
                  { Icon: Shield, text: lang === 'en' ? 'Your data stays private' : 'आपका डेटा सुरक्षित' },
                  { Icon: IndianRupee, text: lang === 'en' ? 'Completely free' : 'पूरी तरह मुफ्त' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 p-3 bg-[#0d2922]/10 rounded-xl border border-[#0d2922]/10">
                    <item.Icon className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-[#0a1f1a]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== IMPACT ===== */}
      <section id="impact" className="py-12 sm:py-20 bg-[#0a1f1a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-xs uppercase tracking-widest text-[#c8e038] font-medium mb-2 sm:mb-3">
              {lang === 'en' ? 'Our Impact' : 'हमारा प्रभाव'}
            </p>
            <h2 className="heading-font text-xl sm:text-2xl lg:text-3xl font-bold">
              {lang === 'en' ? 'Making a Real Difference' : 'वास्तविक बदलाव ला रहे हैं'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {statsList.map((stat, i) => (
              <div key={i} className="stat-card text-center p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#c8e038]/10 flex items-center justify-center">
                  <stat.Icon className="w-6 h-6 text-[#c8e038]" />
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#c8e038] mb-1 sm:mb-2">{stat.value}</p>
                <p className="text-xs sm:text-sm text-white/60">{stat.label[lang] || stat.label.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="stories" className="py-12 sm:py-20 bg-[#f8f6f0] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-xs uppercase tracking-widest text-[#22c55e] font-medium mb-2 sm:mb-3">
              {lang === 'en' ? 'Success Stories' : 'सफलता की कहानियां'}
            </p>
            <h2 className="heading-font text-xl sm:text-2xl lg:text-3xl font-bold text-[#0a1f1a]">
              {lang === 'en' ? 'What Farmers Say' : 'किसान क्या कहते हैं'}
            </h2>
          </div>

          {/* Infinite Sliding Carousel */}
          <div className="relative">
            <style>{`
              @keyframes slide {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .testimonial-track {
                animation: slide 30s linear infinite;
              }
              .testimonial-track:hover {
                animation-play-state: paused;
              }
            `}</style>
            
            <div className="flex testimonial-track" style={{ width: 'max-content' }}>
              {/* Duplicate testimonials for seamless loop */}
              {[...allTestimonials, ...allTestimonials].map((t, i) => {
                const TestimonialIcon = t.icon;
                const isHi = lang === 'hi';
                return (
                  <div key={i} className="w-[280px] sm:w-[350px] flex-shrink-0 mx-2 sm:mx-2.5 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-[#c8e038] mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 sm:mb-5">"{isHi ? t.quote_hi : t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#c8e038]/20 flex items-center justify-center">
                        <TestimonialIcon className="w-4 h-4 text-[#22c55e]" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-[#0a1f1a]">{isHi ? t.name_hi : t.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{isHi ? t.location_hi : t.location}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-12 sm:py-20 bg-[#0a1f1a]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="heading-font text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
            {lang === 'en' ? 'Ready to Get Started?' : 'शुरू करने के लिए तैयार?'}
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
            {lang === 'en' 
              ? 'Join farmers who are already farming smarter. Free forever.' 
              : 'स्मार्ट खेती करने वाले किसानों से जुड़ें। हमेशा मुफ्त।'
            }
          </p>
          <button 
            onClick={onGetStarted}
            className="px-6 sm:px-8 py-3 sm:py-3.5 bg-[#c8e038] text-[#0a1f1a] font-semibold rounded-xl hover:bg-[#d4ea4d] active:scale-95 transition-all inline-flex items-center gap-2 no-underline border-none outline-none"
          >
            {lang === 'en' ? 'Get Started Free' : 'मुफ्त शुरू करें'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 sm:py-8 bg-[#061410] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Gramin Saathi" className="w-7 h-7 rounded-md" />
              <span className="text-sm font-medium">Gramin Saathi</span>
            </div>
            <p className="text-xs text-white/40 text-center">
              © 2024 • {lang === 'en' ? 'Made for Indian Farmers' : 'भारतीय किसानों के लिए बनाया'}
            </p>
            <button onClick={toggleLang} className="text-xs text-white/40 hover:text-white/60 transition-colors">
              {lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
            </button>
          </div>
        </div>
      </footer>
      
      {/* Voice Navigation Button - Available on landing page */}
      {onNavigate && (
        <VoiceNavigationButton 
          onNavigate={onNavigate} 
          lang={lang}
          currentView="landing"
        />
      )}
      
      {/* Demo Video Player */}
      {showDemoVideo && demoVideo && (
        <VideoPlayer
          videoPath={demoVideo.path}
          title={demoVideo.title}
          onClose={() => setShowDemoVideo(false)}
          autoPlay
        />
      )}
    </div>
  );
}
