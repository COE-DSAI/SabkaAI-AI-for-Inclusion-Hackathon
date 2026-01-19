import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { Eye, EyeOff, Loader, Chrome } from 'lucide-react';
import { auth } from '../../lib/firebase-config';
import { initEncryption } from '../../lib/encryption';

// Check if encryption was previously initialized with different password
const checkPasswordMismatch = (userId: string, password: string): boolean => {
  const storedHash = localStorage.getItem(`enc_${userId}`);
  if (!storedHash) return false;
  
  // Simple hash check (not cryptographically secure, just for warning)
  const newHash = btoa(password + userId);
  return storedHash !== newHash && storedHash !== btoa(userId + userId); // Allow UID-based key
};

export function AuthView({ onLogin, t, lang, toggleLang }: { onLogin: () => void, t: any, lang: string, toggleLang: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Persistence logic
      if (rememberMe) {
        localStorage.setItem('remember_email', email);
        await setPersistence(auth, browserLocalPersistence);
      } else {
        localStorage.removeItem('remember_email');
      }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Warn if different password detected
        if (checkPasswordMismatch(userCredential.user.uid, password)) {
          setPasswordWarning(lang === 'en' 
            ? '⚠️ Different password detected. Previous encrypted data may be unreadable on this device.'
            : '⚠️ अलग पासवर्ड का पता चला। पिछला एन्क्रिप्टेड डेटा इस डिवाइस पर अपठनीय हो सकता है।'
          );
        }
        
        // Initialize encryption with user's password
        await initEncryption(userCredential.user.uid, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize encryption for new user
        await initEncryption(userCredential.user.uid, password);
      }
      onLogin(); 
    } catch (err: any) {
      console.error(err);
      setError(
        err.code === 'auth/invalid-credential' ? 'Invalid email or password.' :
        err.code === 'auth/email-already-in-use' ? 'Email already used.' :
        err.code === 'auth/weak-password' ? 'Password too weak.' :
        'Authentication failed. Try again.'
      );
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // For Google auth, use UID as password (user won't see it)
      await initEncryption(result.user.uid, result.user.uid);
      onLogin();
    } catch (err: any) {
      console.error(err);
      setError('Google Sign-In failed.');
    }
  };

  const handleForgotPass = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-[var(--bg-main)]">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[var(--primary)]/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--secondary)]/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm md:max-w-md glass p-6 md:p-8 rounded-3xl relative z-10 animate-in zoom-in duration-500 shadow-2xl shadow-cyan-500/10">
        {/* Logo & Title */}
        <div className="text-center mb-6">
           <img src="/favicon.svg" alt="Gramin Saathi" className="w-16 h-16 mx-auto rounded-2xl mb-3 shadow-lg shadow-white/20" />
           <p className="text-[var(--text-muted)] text-sm">Gramin Saathi</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-[var(--bg-input)] rounded-xl p-1 border border-[var(--border)]">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isLogin 
                ? 'bg-[var(--primary)] text-white shadow-md' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {lang === 'en' ? 'Login' : 'लॉगिन'}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              !isLogin 
                ? 'bg-[var(--primary)] text-white shadow-md' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {lang === 'en' ? 'Sign Up' : 'साइन अप'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {passwordWarning && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-yellow-200 text-xs text-center">
            {passwordWarning}
          </div>
        )}

        {resetSent && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-sm">
            <p className="font-bold mb-1">
              {lang === 'en' ? '✓ Password reset link sent!' : '✓ पासवर्ड रीसेट लिंक भेजा गया!'}
            </p>
            <p className="text-xs opacity-90">
              {lang === 'en' 
                ? 'Check your email inbox. If you don\'t see it, please check your spam/junk folder.' 
                : 'अपना ईमेल इनबॉक्स जांचें। अगर नहीं मिले तो स्पैम/जंक फोल्डर देखें।'}
            </p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
             <label className="text-xs font-bold text-[var(--text-muted)] uppercase ml-1">
               {lang === 'en' ? 'Email' : 'ईमेल'}
             </label>
             <input 
               type="email" 
               required
               autoComplete="email"
               value={email}
               onChange={e => setEmail(e.target.value)}
               className="w-full p-3.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none text-sm"
               placeholder="name@example.com"
             />
          </div>

          <div className="space-y-1 relative">
             <label className="text-xs font-bold text-[var(--text-muted)] uppercase ml-1">
               {lang === 'en' ? 'Password' : 'पासवर्ड'}
             </label>
             <input 
               type={showPass ? "text" : "password"} 
               required
               autoComplete={isLogin ? "current-password" : "new-password"}
               value={password}
               onChange={e => setPassword(e.target.value)}
               className="w-full p-3.5 pr-12 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none text-sm"
               placeholder="••••••••"
             />
             <button 
               type="button" 
               onClick={() => setShowPass(!showPass)}
               className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
             >
               {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
             </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-input)] accent-[var(--primary)]"
              />
              {lang === 'en' ? 'Remember Me' : 'याद रखें'}
            </label>
            {isLogin && (
              <button type="button" onClick={handleForgotPass} className="text-[var(--primary)] hover:underline font-medium text-xs">
                {lang === 'en' ? 'Forgot Password?' : 'पासवर्ड भूल गए?'}
              </button>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 btn-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 font-bold transition-all"
          >
            {loading ? <Loader className="animate-spin mx-auto" size={20}/> : (isLogin ? (lang === 'en' ? 'Login' : 'लॉगिन करें') : (lang === 'en' ? 'Create Account' : 'खाता बनाएं'))}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-[1px] bg-[var(--border)] flex-1" />
          <span className="text-xs text-[var(--text-muted)] uppercase">{lang === 'en' ? 'OR' : 'या'}</span>
          <div className="h-[1px] bg-[var(--border)] flex-1" />
        </div>

        <button 
          onClick={handleGoogle} 
          className="w-full py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-main)] font-medium hover:bg-[var(--bg-card-hover)] hover:border-[var(--primary)] transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Chrome size={18} />
          {lang === 'en' ? 'Continue with Google' : 'Google से जारी रखें'}
        </button>

        {/* Language Toggle */}
        <div className="mt-5 text-center">
          <button onClick={toggleLang} className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            {lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
          </button>
        </div>
      </div>
    </div>
  );
}
