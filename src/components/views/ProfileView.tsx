import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Smartphone, 
  Wallet, 
  Sprout, 
  Settings, 
  Type, 
  LogOut, 
  Smartphone as SmartphoneIcon 
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  getFirestore 
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

const auth = getAuth();

export function ProfileView({ user, profile, db, appId, t, loadProfile, lang, fontSize, changeFontSize }: {
  user: any;
  profile: any;
  db: any;
  appId: string;
  t: (key: string) => string;
  loadProfile: (uid: string) => void;
  lang: string;
  fontSize: string;
  changeFontSize: (size: string) => void;
}) {
  const [badges, setBadges] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [financialScore, setFinancialScore] = useState(50);
  const [editForm, setEditForm] = useState({
    name: profile?.name || '',
    village: profile?.village || '',
    crop: profile?.crop || '',
    phone: profile?.phone || '',
    landSize: profile?.landSize || '',
    income: profile?.income || ''
  });

  // Calculate Financial Score based on transactions
  useEffect(() => {
    if (!user || !db) return;
    
    const calculateScore = async () => {
      try {
        const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
        const snapshot = await getDocs(transRef);
        
        let totalIncome = 0;
        let totalExpense = 0;
        let transactionCount = snapshot.size;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.type === 'income') totalIncome += Number(data.amount) || 0;
          else totalExpense += Number(data.amount) || 0;
        });
        
        // Score calculation logic:
        let score = 50;
        if (totalIncome > totalExpense) score += 20;
        else if (totalIncome > 0) score += 10;
        
        if (transactionCount > 0) score += 5;
        if (transactionCount > 10) score += 5;
        if (transactionCount > 30) score += 5;
        
        if (totalIncome > 0) {
          const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
          if (savingsRate >= 20) score += 10;
          else if (savingsRate >= 10) score += 5;
        }
        
        score = Math.min(100, Math.max(0, score));
        setFinancialScore(score);
        
        if (profile && score !== profile.financialScore) {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), {
            ...profile,
            financialScore: score
          }, { merge: true });
        }
      } catch (err) {
        console.error('Error calculating financial score:', err);
        setFinancialScore(profile?.financialScore || 50);
      }
    };
    
    calculateScore();
  }, [user, db, appId, profile]);

  // Load badges
  useEffect(() => {
    if (!user || !db) return;
    
    const loadBadges = async () => {
      try {
        const badgesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'badges');
        const snapshot = await getDocs(badgesRef);
        const badgesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBadges(badgesData);
      } catch (err) {
        console.error('Error loading badges:', err);
      }
    };
    
    loadBadges();
  }, [user, db, appId]);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        village: profile.village || '',
        crop: profile.crop || '',
        phone: profile.phone || '',
        landSize: profile.landSize || '',
        income: profile.income || ''
      });
    }
  }, [profile]);

  const handleLogout = () => signOut(auth);

  const resetProfile = async () => {
    if(confirm(lang === 'en' ? 'Reset all data?' : 'सभी डेटा रीसेट करें?')) {
       await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), { name: null });
       window.location.reload();
    }
  };

  const saveProfile = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), {
        ...profile,
        ...editForm,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      loadProfile(user.uid);
      setIsEditing(false);
      alert(lang === 'en' ? 'Profile updated!' : 'प्रोफाइल अपडेट हो गई!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(lang === 'en' ? 'Failed to save' : 'सेव करने में विफल');
    }
  };

  /* Font sizes definition - commented out
  const fontSizes = [
    { key: 'small', label: lang === 'en' ? 'S' : 'छो', class: 'text-sm' },
    { key: 'medium', label: lang === 'en' ? 'N' : 'सा', class: 'text-base' },
    { key: 'large', label: lang === 'en' ? 'L' : 'बड़', class: 'text-xl' },
  ];
  */

  const cropOptions = ['wheat', 'rice', 'sugarcane', 'cotton', 'maize', 'soybean', 'vegetables', 'fruits', 'pulses', 'other'];

  return (
    <div className="w-full md:max-w-lg md:mx-auto space-y-4">
      {/* Profile Header Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
        <div className="h-20 md:h-24 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"></div>
        <div className="px-4 md:px-6 pb-4 md:pb-6 relative">
          <div className="w-16 md:w-20 h-16 md:h-20 rounded-full bg-white p-1 absolute -top-8 md:-top-10 left-4 md:left-6 shadow-lg">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-2xl font-bold">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-[var(--danger)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--primary)]'}`}
            >
              {isEditing ? (lang === 'en' ? 'Cancel' : 'रद्द करें') : (lang === 'en' ? 'Edit' : 'संपादित करें')}
            </button>
          </div>
          
          <div className="mt-2">
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="text-xl font-bold bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 w-full text-[var(--text-main)]"
                placeholder={lang === 'en' ? 'Your name' : 'आपका नाम'}
              />
            ) : (
              <h2 className="text-xl font-bold text-[var(--text-main)]">{profile?.name || (lang === 'en' ? 'Set your name' : 'नाम सेट करें')}</h2>
            )}
            
            {isEditing ? (
              <input
                type="text"
                value={editForm.village}
                onChange={(e) => setEditForm({...editForm, village: e.target.value})}
                className="mt-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 w-full text-[var(--text-muted)]"
                placeholder={lang === 'en' ? 'Village, District' : 'गांव, जिला'}
              />
            ) : (
              <p className="text-[var(--text-muted)] flex items-center gap-1 mt-1">
                <MapPin size={14} />
                {profile?.village || (lang === 'en' ? 'Add location' : 'स्थान जोड़ें')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {badges.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
            <span className="text-lg">🏆</span>
            {lang === 'en' ? 'Earned Badges' : 'अर्जित बैज'} ({badges.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {badges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center p-2 bg-[var(--bg-input)] rounded-xl">
                <span className="text-2xl mb-1">{badge.icon}</span>
                <span className="text-[10px] font-bold text-center text-[var(--text-main)] leading-tight">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Details */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
          <User size={16} />
          {lang === 'en' ? 'Profile Details' : 'प्रोफाइल विवरण'}
        </h3>
        
        {/* Main Crop */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{t('main_crop')}</p>
          {isEditing ? (
            <select
              value={editForm.crop}
              onChange={(e) => setEditForm({...editForm, crop: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-main)]"
            >
              {cropOptions.map(crop => (
                <option key={crop} value={crop}>{crop.charAt(0).toUpperCase() + crop.slice(1)}</option>
              ))}
            </select>
          ) : (
            <p className="font-medium text-[var(--text-main)] capitalize flex items-center gap-2">
              <Sprout size={16} className="text-[var(--primary)]" />
              {profile?.crop || (lang === 'en' ? 'Not set' : 'सेट नहीं')}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{lang === 'en' ? 'Phone Number' : 'फोन नंबर'}</p>
          {isEditing ? (
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              placeholder="+91 98765 43210"
            />
          ) : (
            <p className="font-medium text-[var(--text-main)] flex items-center gap-2">
              <SmartphoneIcon size={16} className="text-[var(--primary)]" />
              {profile?.phone || (lang === 'en' ? 'Add phone' : 'फोन जोड़ें')}
            </p>
          )}
        </div>

        {/* Land Size */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{lang === 'en' ? 'Land Size' : 'जमीन का आकार'}</p>
          {isEditing ? (
            <input
              type="text"
              value={editForm.landSize}
              onChange={(e) => setEditForm({...editForm, landSize: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              placeholder={lang === 'en' ? 'e.g., 5 acres' : 'जैसे 5 एकड़'}
            />
          ) : (
            <p className="font-medium text-[var(--text-main)] flex items-center gap-2">
              <MapPin size={16} className="text-[var(--primary)]" />
              {profile?.landSize || (lang === 'en' ? 'Add land size' : 'जमीन का आकार जोड़ें')}
            </p>
          )}
        </div>

        {/* Monthly Income */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{lang === 'en' ? 'Monthly Income' : 'मासिक आय'}</p>
          {isEditing ? (
            <input
              type="text"
              value={editForm.income}
              onChange={(e) => setEditForm({...editForm, income: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              placeholder="₹15,000"
            />
          ) : (
            <p className="font-medium text-[var(--text-main)] flex items-center gap-2">
              <Wallet size={16} className="text-[var(--success)]" />
              {profile?.income || (lang === 'en' ? 'Add income' : 'आय जोड़ें')}
            </p>
          )}
        </div>

        {/* Financial Score */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{t('financial_score') || 'Financial Score'}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[var(--bg-card)] rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--success)] rounded-full transition-all"
                style={{ width: `${financialScore}%` }}
              />
            </div>
            <span className="font-bold text-[var(--text-main)]">{financialScore}/100</span>
          </div>
        </div>

        {/* Save Button (when editing) */}
        {isEditing && (
          <button 
            onClick={saveProfile}
            className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            {lang === 'en' ? 'Save Changes' : 'परिवर्तन सहेजें'}
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
          <Settings size={16} />
          {lang === 'en' ? 'Settings' : 'सेटिंग्स'}
        </h3>
        
        {/* Font Size - Commented out for now
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-2">
            <Type size={12} />
            {lang === 'en' ? 'Text Size' : 'टेक्स्ट साइज'}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {fontSizes.map(size => (
              <button
                key={size.key}
                onClick={() => changeFontSize(size.key)}
                className={`p-2 rounded-lg text-center transition-all ${fontSize === size.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border)]'}`}
              >
                <span className={size.class}>{size.label}</span>
              </button>
            ))}
          </div>
        </div>
        */}

        {/* Account Info */}
        <div className="p-3 bg-[var(--bg-input)] rounded-xl">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">{lang === 'en' ? 'Email' : 'ईमेल'}</p>
          <p className="font-medium text-[var(--text-main)] text-sm truncate">{user?.email || 'N/A'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={handleLogout} className="w-full py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--danger)] font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
          <LogOut size={18} />
          {t('logout') || 'Logout'}
        </button>
        
        <button onClick={resetProfile} className="w-full py-2 text-xs text-[var(--text-muted)] hover:underline">
          {t('reset_profile') || 'Reset Profile'}
        </button>
      </div>
    </div>
  );
}
