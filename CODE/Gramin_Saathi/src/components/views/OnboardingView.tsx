import React, { useState } from 'react';
import { ArrowRight, User, MapPin, Sprout, Loader, Check, Wallet, ShieldCheck } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function OnboardingView({ user, db, appId, onComplete, t, lang, toggleLang }: {
  user: any;
  db: any;
  appId: string;
  onComplete: () => void;
  t: (key: string) => string;
  lang: string;
  toggleLang: () => void;
}) {
  const [formData, setFormData] = useState({ name: '', village: '', crop: '', language: lang });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // Multi-step onboarding

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert(lang === 'en' ? "No user logged in. Please log in again." : "कोई उपयोगकर्ता लॉग इन नहीं है।");
      return;
    }
    if (!formData.name.trim()) {
      alert(lang === 'en' ? "Please enter your name." : "कृपया अपना नाम दर्ज करें।");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), {
        ...formData,
        name: formData.name.trim(),
        village: formData.village.trim(),
        joinedAt: serverTimestamp(),
        financialScore: 50
      });
      onComplete();
    } catch (err) {
      console.error("Save failed", err);
      alert(lang === 'en' ? "Failed to save profile. Check your internet connection." : "प्रोफ़ाइल सहेजने में विफल। इंटरनेट कनेक्शन जांचें।");
    }
    setSaving(false);
  };

  const features = [
    { icon: Wallet, title: lang === 'en' ? 'Track Finances' : 'वित्त ट्रैक करें', desc: lang === 'en' ? 'Record income & expenses easily' : 'आय और खर्च आसानी से रिकॉर्ड करें' },
    { icon: ShieldCheck, title: lang === 'en' ? 'Govt Schemes' : 'सरकारी योजनाएं', desc: lang === 'en' ? 'Find schemes you qualify for' : 'योग्य योजनाएं खोजें' },
    { icon: Sprout, title: lang === 'en' ? 'AI Assistant' : 'AI सहायक', desc: lang === 'en' ? 'Get farming advice in your language' : 'अपनी भाषा में खेती की सलाह पाएं' },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-[var(--bg-main)]">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary)]/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--secondary)]/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm md:max-w-md glass p-5 md:p-8 rounded-3xl relative z-10 animate-in zoom-in duration-500 shadow-2xl shadow-cyan-500/10">
        
        {/* Step 1: Welcome & Features */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-5">
              <img src="/favicon.svg" alt="Gramin Saathi" className="w-16 h-16 mx-auto rounded-2xl mb-3 shadow-lg shadow-white/20" />
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-main)] mb-1">
                {lang === 'en' ? 'Welcome to Gramin Saathi' : 'ग्रामीण साथी में आपका स्वागत है'}
              </h1>
              <p className="text-[var(--primary)] text-xs">
                {lang === 'en' ? 'Your Village Financial Partner' : 'आपका ग्रामीण वित्तीय साथी'}
              </p>
            </div>

            <div className="space-y-3 mb-5">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                  <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                    <feature.icon size={18} className="text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--text-main)]">{feature.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full py-3.5 btn-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-bold flex items-center justify-center gap-2"
            >
              {lang === 'en' ? 'Get Started' : 'शुरू करें'}
              <ArrowRight size={18} />
            </button>

            <div className="mt-4 text-center">
              <button onClick={toggleLang} className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                {lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Profile Form */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center mb-3">
                <User size={24} className="text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-[var(--text-main)] mb-1">
                {lang === 'en' ? 'Create Your Profile' : 'अपनी प्रोफ़ाइल बनाएं'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {lang === 'en' ? 'Help us personalize your experience' : 'हमें आपके अनुभव को बेहतर बनाने में मदद करें'}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5 flex items-center gap-1.5">
                  <User size={12} />
                  {lang === 'en' ? 'Your Name' : 'आपका नाम'}
                </label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none text-sm"
                  placeholder={lang === 'en' ? 'Ram Kumar' : 'राम कुमार'}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5 flex items-center gap-1.5">
                  <MapPin size={12} />
                  {lang === 'en' ? 'Village / Town' : 'गाँव / शहर'}
                </label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none text-sm"
                  placeholder={lang === 'en' ? 'Rampur' : 'रामपुर'}
                  value={formData.village}
                  onChange={e => setFormData({...formData, village: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5 flex items-center gap-1.5">
                  <Sprout size={12} />
                  {lang === 'en' ? 'Main Occupation' : 'मुख्य व्यवसाय'}
                </label>
                <select 
                  className="w-full p-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none appearance-none text-sm"
                  value={formData.crop}
                  onChange={e => setFormData({...formData, crop: e.target.value})}
                >
                  <option value="">{lang === 'en' ? 'Select...' : 'चुनें...'}</option>
                  <option value="wheat">{lang === 'en' ? '🌾 Wheat Farming' : '🌾 गेहूँ की खेती'}</option>
                  <option value="rice">{lang === 'en' ? '🌾 Rice Farming' : '🌾 धान की खेती'}</option>
                  <option value="sugarcane">{lang === 'en' ? '🎋 Sugarcane' : '🎋 गन्ना'}</option>
                  <option value="vegetables">{lang === 'en' ? '🥬 Vegetables' : '🥬 सब्जियाँ'}</option>
                  <option value="fruits">{lang === 'en' ? '🍎 Fruits' : '🍎 फल'}</option>
                  <option value="dairy">{lang === 'en' ? '🐄 Dairy / Cattle' : '🐄 डेयरी / पशुपालन'}</option>
                  <option value="shop">{lang === 'en' ? '🏪 Shop / Business' : '🏪 दुकान / व्यापार'}</option>
                  <option value="labor">{lang === 'en' ? '👷 Labor / Job' : '👷 मजदूरी / नौकरी'}</option>
                  <option value="other">{lang === 'en' ? '📦 Other' : '📦 अन्य'}</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-muted)] font-bold text-sm hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  {lang === 'en' ? 'Back' : 'वापस'}
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-3 btn-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm"
                >
                  {saving ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
                  {saving ? (lang === 'en' ? 'Saving...' : 'सहेज रहे...') : (lang === 'en' ? 'Complete Setup' : 'सेटअप पूरा करें')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
