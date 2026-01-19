import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Home, 
 Wallet, 
  Sprout, 
  BookOpen, 
  Sun, 
  Moon, 
  Menu, 
  Store, 
  Cloud, 
  Droplet, 
  Calculator, 
  ArrowLeftRight, 
  MessageCircle,
  ShieldCheck,
  User,
  ChevronDown,
  Wrench,
  X,
  TrendingUp
} from 'lucide-react';

// Firebase Imports
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { clearEncryption, initEncryption, isEncryptionReady, tryRestoreEncryption } from './lib/encryption';

// Component Imports
import LandingPage from './components/LandingPage';
import { AuthView } from './components/views/AuthView';
import { OnboardingView } from './components/views/OnboardingView';
import { HomeView } from './components/views/HomeView';
import { KhataView } from './components/views/KhataView';
import { SaathiView } from './components/views/SaathiView';
import { MandiView } from './components/views/MandiView';
import { YojanaView } from './components/views/YojanaView';
import { SeekhoView } from './components/views/SeekhoView';
import { WeatherView } from './components/views/WeatherView';
import { CalculatorView } from './components/views/CalculatorView';
import { TranslatorView } from './components/views/TranslatorView';
import { CommunityView } from './components/views/CommunityView';
import { ProfileView } from './components/views/ProfileView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { YieldPredictorView } from './components/views/YieldPredictorView';
import SchemeEligibilityAdvisor from './components/views/SchemeEligibilityAdvisor';
import InsuranceAdvisor from './components/views/InsuranceAdvisor';
import LoanRecommender from './components/views/LoanRecommender';
import { CashFlowPlannerView } from './components/views/CashFlowPlannerView';
import { GuidedTour, TourButton, hasCompletedTour, markTourCompleted } from './components/GuidedTour';
import { getTourSteps } from './lib/tour-config';

// Custom UI Components
import { NavItem } from './components/custom-ui/NavigationElements';
import { IdentityMiniCard } from './components/views/IdentityMiniCard';
import { VoiceNavigationButton } from './components/VoiceNavigationButton';

// Utility Imports
import { TRANSLATIONS } from './lib/translations';
import { auth, db } from './lib/firebase-config';

// Types
interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  state?: string;
  district?: string;
  crops?: string[];
  landholding?: number;
  // add other profile fields as needed
}

type ViewName = 'dashboard' | 'khata' | 'saathi' | 'mandi' | 'yojana' | 'calculator' | 'seekho' | 'mausam' | 'translator' | 'community' | 'analytics' | 'yield-predictor' | 'scheme-advisor' | 'insurance-advisor' | 'loan-recommender' | 'cashflow-planner' | 'profile';

const appId = 'gramin-saathi';

// Main App Component
export default function GraminSaathiOS() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Global State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [theme, setTheme] = useState<'blue' | 'light' | 'dark'>(() => 
    (localStorage.getItem('app_theme') as 'blue' | 'light' | 'dark') || 'blue'
  );
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(() => 
    (localStorage.getItem('app_fontSize') as 'small' | 'medium' | 'large') || 'medium'
  ); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);

  // Tour State
  const [showTour, setShowTour] = useState(false);
  const [tourSteps, setTourSteps] = useState<any[]>([]);
  const [tourKey, setTourKey] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(() => 
    sessionStorage.getItem('tour_dismissed_session') === 'true'
  );

  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply theme and font size to body
  useEffect(() => {
    document.body.classList.remove('theme-blue', 'theme-dark', 'theme-light');
    if (theme !== 'blue') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('app_theme', theme);
    
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${fontSize}`);
    localStorage.setItem('app_fontSize', fontSize);
  }, [theme, fontSize]);

  // Initialize Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        loadProfile(u.uid);
        
        // Auto-initialize encryption for persistent sessions
        if (!isEncryptionReady()) {
          try {
            const restored = await tryRestoreEncryption(u.uid);
            if (!restored) {
              await initEncryption(u.uid, u.uid);
            }
            console.log('Encryption initialized for existing session');
          } catch (error) {
            console.warn('Could not initialize encryption:', error);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubAuth();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-show guided tour on first visit
  useEffect(() => {
    const isProtectedRoute = location.pathname !== '/' && location.pathname !== '/login';
    if (user && isProtectedRoute && !hasCompletedTour('dashboard') && !tourDismissed) {
      setTourSteps(getTourSteps(lang));
      setTimeout(() => setShowTour(true), 1500);
    }
  }, [user, lang, location.pathname, tourDismissed]);

  // Load User Profile
  const loadProfile = async (uid: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'main');
      
      try {
        const cachedDoc = await getDocFromCache(docRef);
        if (cachedDoc.exists() && cachedDoc.data()?.name) {
          setProfile(cachedDoc.data() as UserProfile);
          setLoading(false);
          return;
        }
      } catch (cacheErr) {
        // Cache miss, continue to network fetch
      }
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.name) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // No profile, redirect to onboarding
        navigate('/onboarding', { replace: true });
      }
    } catch (e: any) {
      console.warn("Profile load error:", e.message);
      navigate('/onboarding', { replace: true });
    }
    setLoading(false);
  };

  // UI Handlers
  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : 'en');
  };

  const cycleTheme = () => {
    setTheme(prev => prev === 'blue' ? 'light' : prev === 'light' ? 'dark' : 'blue');
  };

  const handleViewChange = (view: ViewName) => {
    navigate(`/${view}`);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    clearEncryption();
    await signOut(auth);
    setUser(null);
    setProfile(null);
    navigate('/', { replace: true });
  };

  const t = (key: string) => TRANSLATIONS[lang]?.[key] || key;

  // Loading Screen
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#011627] text-[#41ead4]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
      </div>
    );
  }

  // Protected Layout Component
  const ProtectedLayout = () => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="flex h-screen w-screen overflow-hidden">
        <a href="#main-content" className="skip-link">
          {lang === 'en' ? 'Skip to content' : 'विषय पर जाएं'}
        </a>
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
        
        {/* Sidebar */}
        <aside 
          data-tour="sidebar" 
          className={`flex flex-col glass fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 ${
            sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'
          } md:relative md:w-72 md:translate-x-0 md:m-4 md:rounded-3xl md:h-[calc(100vh-2rem)] overflow-hidden`}
        >
          <div className="p-6 flex items-center gap-3 border-b border-[var(--border)] cursor-pointer shrink-0">
            <img 
              onClick={() => navigate('/')} 
              src="/favicon.svg" 
              alt="Logo" 
              className="w-10 h-10 rounded-xl" 
            />
            <h1 
              onClick={() => navigate('/')} 
              className="flex-1 font-bold text-xl text-[var(--text-main)]"
            >
              Gramin <span className="text-[var(--primary)]">Saathi</span>
            </h1>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)]"
            >
              <X size={20} />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 min-h-0">
            <NavItem 
              data-tour="nav-dashboard" 
              active={location.pathname === '/dashboard'} 
              onClick={() => handleViewChange('dashboard')} 
              icon={Home} 
              label={t('nav_home')} 
            />
            <NavItem 
              data-tour="nav-khata" 
              active={location.pathname === '/khata'} 
              onClick={() => handleViewChange('khata')} 
              icon={Wallet} 
              label={t('nav_khata')} 
            />
            <NavItem 
              data-tour="saathi" 
              active={location.pathname === '/saathi'} 
              onClick={() => handleViewChange('saathi')} 
              icon={Sprout} 
              label={t('nav_saathi')} 
            />
            
            {/* Utilities Dropdown */}
            <div className="space-y-1">
              <button 
                onClick={() => setUtilitiesOpen(!utilitiesOpen)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  ['/mandi', '/mausam', '/calculator', '/translator'].includes(location.pathname)
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-glass)]'
                }`}
              >
                <Wrench size={18} />
                <span className="flex-1 text-left">{lang === 'en' ? 'Utilities' : 'उपकरण'}</span>
                <ChevronDown size={16} className={`transition-transform ${utilitiesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {utilitiesOpen && (
                <div className="ml-4 pl-4 border-l-2 border-[var(--border)] space-y-1">
                  <NavItem 
                    data-tour="mandi" 
                    active={location.pathname === '/mandi'} 
                    onClick={() => handleViewChange('mandi')} 
                    icon={Store} 
                    label={lang === 'en' ? 'Mandi' : 'मंडी'} 
                  />
                  <NavItem 
                    active={location.pathname === '/mausam'} 
                    onClick={() => handleViewChange('mausam')} 
                    icon={Cloud} 
                    label={lang === 'en' ? 'Weather' : 'मौसम'} 
                  />
                  <NavItem 
                    active={location.pathname === '/calculator'} 
                    onClick={() => handleViewChange('calculator')} 
                    icon={Calculator} 
                    label={lang === 'en' ? 'Calculator' : 'कैलकुलेटर'} 
                  />
                  <NavItem 
                    active={location.pathname === '/translator'} 
                    onClick={() => handleViewChange('translator')} 
                    icon={ArrowLeftRight} 
                    label={lang === 'en' ? 'Translator' : 'अनुवादक'} 
                  />
                </div>
              )}
            </div>
            <NavItem 
              active={location.pathname === '/cashflow-planner'} 
              onClick={() => handleViewChange('cashflow-planner')} 
              icon={TrendingUp} 
              label={lang === 'en' ? 'Savings Planner' : 'बचत योजनाकार'} 
            />
            <NavItem 
              data-tour="nav-community" 
              active={location.pathname === '/community'} 
              onClick={() => handleViewChange('community')} 
              icon={MessageCircle} 
              label={lang === 'en' ? 'Community' : 'समुदाय'} 
            />
            <NavItem 
              data-tour="nav-seekho" 
              active={location.pathname === '/seekho'} 
              onClick={() => handleViewChange('seekho')} 
              icon={BookOpen} 
              label={t('nav_seekho')} 
            />
            <NavItem 
              active={location.pathname === '/yield-predictor'} 
              onClick={() => handleViewChange('yield-predictor')} 
              icon={Sprout} 
              label={lang === 'en' ? 'Yield Predictor' : 'उपज भविष्यवक्ता'} 
            />
            
            <NavItem 
              data-tour="nav-yojana" 
              active={location.pathname === '/yojana'} 
              onClick={() => handleViewChange('yojana')} 
              icon={ShieldCheck} 
              label={t('nav_yojana')} 
            />
            
            {/* AI Advisors */}
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs font-bold text-[var(--text-muted)] px-3 mb-2 uppercase">
                {lang === 'en' ? 'AI Advisors' : 'AI सलाहकार'}
              </p>
              <NavItem 
                active={location.pathname === '/scheme-advisor'} 
                onClick={() => handleViewChange('scheme-advisor')} 
                icon={ShieldCheck} 
                label={lang === 'en' ? 'Schemes' : 'योजनाएं'} 
              />
              <NavItem 
                active={location.pathname === '/insurance-advisor'} 
                onClick={() => handleViewChange('insurance-advisor')} 
                icon={ShieldCheck} 
                label={lang === 'en' ? 'Insurance' : 'बीमा'} 
              />
              <NavItem 
                active={location.pathname === '/loan-recommender'} 
                onClick={() => handleViewChange('loan-recommender')} 
                icon={Wallet} 
                label={lang === 'en' ? 'Loans' : 'ऋण'} 
              />
            </div>
          </nav>

          <div className="p-4 border-t border-[var(--border)] space-y-3 bg-[var(--bg-card)] shrink-0">
            <IdentityMiniCard 
              profile={profile} 
              onClick={() => handleViewChange('profile')} 
              t={t} 
            />
            <div className="grid grid-cols-3 gap-2">
              <button 
                data-tour="language" 
                onClick={toggleLang} 
                className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] text-xs font-bold border border-[var(--border)]"
              >
                {lang === 'en' ? 'EN' : 'हिं'}
              </button>
              <button 
                data-tour="theme" 
                onClick={cycleTheme} 
                className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] flex items-center justify-center gap-1 text-xs font-medium"
              >
                {theme === 'blue' ? <Droplet size={14} /> : theme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <TourButton 
                onClick={() => { 
                  setTourSteps(getTourSteps(lang)); 
                  setTourKey(prev => prev + 1); 
                  setShowTour(true); 
                }} 
                lang={lang} 
              />
            </div>
          </div>
        </aside>

        <main id="main-content" className="flex-1 flex flex-col relative overflow-hidden">
          <header className="md:hidden h-16 glass flex items-center justify-between px-4 shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="p-2">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
              <span className="font-bold">{t('app_name')}</span>
            </div>
            <div className="flex items-center gap-2">
              <TourButton 
                onClick={() => { setTourSteps(getTourSteps(lang)); setShowTour(true); }} 
                lang={lang} 
              />
              <button 
                onClick={toggleLang} 
                className="text-xs font-bold uppercase bg-[var(--bg-input)] px-2 py-1 rounded-lg"
              >
                {lang}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
        
        {/* Voice Navigation Button */}
        <VoiceNavigationButton 
          onNavigate={handleViewChange} 
          lang={lang}
          currentView={location.pathname.slice(1) as any}
        />
        
        {/* Guided Tour */}
        {showTour && tourSteps.length > 0 && (
          <GuidedTour
            key={tourKey}
            steps={tourSteps}
            onComplete={() => {
              markTourCompleted('dashboard');
              setShowTour(false);
            }}
            onSkip={() => {
              sessionStorage.setItem('tour_dismissed_session', 'true');
              setTourDismissed(true);
              setShowTour(false);
            }}
            lang={lang}
          />
        )}
      </div>
    );
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <LandingPage 
          onGetStarted={() => user ? navigate('/dashboard') : navigate('/login')} 
          lang={lang} 
          toggleLang={toggleLang} 
          onFeatureClick={(id: string) => user ? navigate(`/${id}`) : navigate('/login')}
          onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          user={user}
          onLogout={user ? handleLogout : undefined}
          onNavigate={handleViewChange}
        />
      } />
      
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> :
        <AuthView 
          onLogin={() => navigate('/dashboard', { replace: true })} 
          t={t} 
          lang={lang} 
          toggleLang={toggleLang} 
        />
      } />

      <Route path="/onboarding" element={
        !user ? <Navigate to="/login" replace /> :
        <OnboardingView 
          user={user} 
          db={db} 
          appId={appId} 
          t={t} 
          lang={lang} 
          toggleLang={toggleLang}
          onComplete={() => loadProfile(user.uid)}
        />
      } />

      {/* Protected Routes with Layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={
          <HomeView 
            user={user!} 
            profile={profile} 
            db={db} 
            appId={appId} 
            t={t} 
            lang={lang} 
            setView={handleViewChange} 
          />
        } />
        <Route path="/khata" element={
          <KhataView user={user!} db={db} appId={appId} t={t} lang={lang} />
        } />
        <Route path="/saathi" element={
          <SaathiView user={user!} profile={profile} db={db} appId={appId} t={t} lang={lang} />
        } />
        <Route path="/mandi" element={<MandiView lang={lang} />} />
        <Route path="/yojana" element={<YojanaView t={t} lang={lang} user={user!} db={db} appId={appId} />} />
        <Route path="/calculator" element={<CalculatorView user={user!} db={db} appId={appId} t={t} lang={lang} />} />
        <Route path="/seekho" element={<SeekhoView t={t} lang={lang} user={user!} db={db} appId={appId} />} />
        <Route path="/mausam" element={<WeatherView t={t} lang={lang} setView={handleViewChange} profile={profile} />} />
        <Route path="/translator" element={<TranslatorView lang={lang} user={user!} db={db} appId={appId} />} />
        <Route path="/community" element={<CommunityView lang={lang} user={user!} db={db} appId={appId} profile={profile} />} />
        <Route path="/analytics" element={<AnalyticsView lang={lang} t={t} />} />
        <Route path="/yield-predictor" element={<YieldPredictorView lang={lang} t={t} />} />
        <Route path="/scheme-advisor" element={<SchemeEligibilityAdvisor lang={lang} t={t} />} />
        <Route path="/insurance-advisor" element={<InsuranceAdvisor lang={lang} t={t} />} />
        <Route path="/loan-recommender" element={<LoanRecommender lang={lang} t={t} />} />
        <Route path="/cashflow-planner" element={
          <CashFlowPlannerView 
            user={user!} 
            profile={profile} 
            db={db} 
            appId={appId} 
            t={t} 
            lang={lang} 
          />
        } />
        <Route path="/profile" element={
          <ProfileView 
            user={user!} 
            profile={profile} 
            db={db} 
            appId={appId} 
            t={t} 
            loadProfile={loadProfile} 
            lang={lang} 
            fontSize={fontSize} 
            changeFontSize={(size: string) => setFontSize(size as 'small' | 'medium' | 'large')}
          />
        } />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
