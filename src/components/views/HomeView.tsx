import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Calculator, 
  Cloud, 
  Users 
} from 'lucide-react';
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { secureSetDoc } from '../../lib/secure-storage';
import { generateDummyTransactions } from '../../lib/app-utils';

export function HomeView({ user, profile, db, appId, t, lang, setView }: any) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Save daily balance snapshot to Firebase (ENCRYPTED)
  const saveBalanceSnapshot = async (balance: number, income: number, expense: number) => {
    if (!user || !db) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const snapshotRef = doc(db, `artifacts/${appId}/users/${user.uid}/balance_history/${today}`);
      // This will auto-encrypt balance, income, expense fields
      await secureSetDoc(snapshotRef, {
        balance,
        income,
        expense,
        date: today,
        timestamp: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error saving balance snapshot:', e);
    }
  };

  // Generate daily balance chart for last 30 days
  const generateChartData = (txns: any[]) => {
    const today = new Date();
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      let dayBalance = 0;
      let dayIncome = 0;
      let dayExpense = 0;
      
      txns.forEach(txn => {
        const txnDate = new Date(txn.timestamp);
        txnDate.setHours(0, 0, 0, 0);
        
        if (txnDate <= date) {
          const amount = Number(txn.amount);
          if (txn.type === 'income') {
            dayBalance += amount;
          } else {
            dayBalance -= amount;
          }
        }
        
        if (txnDate.getTime() === date.getTime()) {
          const amount = Number(txn.amount);
          if (txn.type === 'income') {
            dayIncome += amount;
          } else {
            dayExpense += amount;
          }
        }
      });
      
      data.push({
        date: date.getDate(),
        balance: dayBalance,
        income: dayIncome,
        expense: dayExpense,
        day: date.toLocaleDateString('en-IN', { weekday: 'short' })
      });
    }
    
    return data;
  };

  // Calc balance and history from Firestore
  useEffect(() => {
    const processTransactions = (txnList: any[]) => {
      let total = 0;
      let income = 0;
      let expense = 0;
      const txns: any[] = [];
      
      txnList.forEach(data => {
        const amount = Number(data.amount);
        if (data.type === 'income') {
          total += amount;
          income += amount;
        } else {
          total -= amount;
          expense += amount;
        }
        txns.push({
          ...data,
          timestamp: data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : new Date())
        });
      });
      
      setBalance(total);
      setTotalIncome(income);
      setTotalExpense(expense);
      setTransactions(txns);
      
      const last30Days = generateChartData(txns);
      setChartData(last30Days);
      setLoading(false);
    };

    if (!user) {
      const demoTransactions = generateDummyTransactions(lang);
      processTransactions(demoTransactions);
      return;
    }

    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'khata'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, async (snapshot) => {
       if (snapshot.docs.length === 0) {
         const demoTransactions = generateDummyTransactions(lang);
         processTransactions(demoTransactions);
         return;
       }

       let total = 0;
       let income = 0;
       let expense = 0;
       const txns: any[] = [];
       
       // Decrypt amounts from encrypted fields
       for (const docSnap of snapshot.docs) {
         const data = docSnap.data();
         
         // Decrypt amount if encrypted
         let amount = data.amount;
         if (data.amount_isEncrypted && data.amount_encrypted) {
           try {
             const { decryptData } = await import('../../lib/encryption');
             amount = await decryptData(data.amount_encrypted);
             amount = typeof amount === 'string' ? parseFloat(amount) : amount;
           } catch (error) {
             console.error('Failed to decrypt amount:', error);
             amount = 0;
           }
         }
         
         amount = Number(amount) || 0; // Ensure it's a number
         
         if (data.type === 'income' || data.type === 'payment_received') {
           total += amount;
           income += amount;
         } else if (data.type === 'expense' || data.type === 'payment_sent') {
           total -= amount;
           expense += amount;
         }
         
         txns.push({
           ...data,
           amount, // Use decrypted amount
           id: docSnap.id,
           timestamp: data.date?.toDate ? data.date.toDate() : new Date()
         });
       }
       
       setBalance(total);
       setTotalIncome(income);
       setTotalExpense(expense);
       setTransactions(txns);
       
       saveBalanceSnapshot(total, income, expense);
       
       const last30Days = generateChartData(txns);
       setChartData(last30Days);
       setLoading(false);
    }, (err) => {
      console.error(err);
      const demoTransactions = generateDummyTransactions(lang);
      processTransactions(demoTransactions);
    });
    return () => unsub();
  }, [user, lang, db, appId]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-3xl p-5 relative overflow-hidden border border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[var(--text-muted)] text-sm mb-1">{lang === 'en' ? 'Welcome back' : 'वापस स्वागत है'}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-1">
                {profile?.name?.split(' ')[0] || 'Kisan'} <span className="text-[var(--primary)]">Ji</span>
              </h1>
              <p className="text-[var(--text-muted)] text-sm flex items-center gap-2">
                <MapPin size={14} className="text-[var(--primary)]" />
                {profile?.village || 'Your Village'} • {profile?.crop || 'Crops'}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl shadow-lg text-[var(--bg-main)]">
              {profile?.name?.charAt(0) || '👤'}
            </div>
          </div>
          
          <div data-tour="balance-card" className="mt-5 bg-[var(--bg-glass)] rounded-2xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[var(--text-muted)] text-xs">{lang === 'en' ? "Today's Activity" : 'आज की गतिविधि'}</p>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#374151" strokeWidth="4" />
                  <circle 
                    cx="24" cy="24" r="20" 
                    fill="none" 
                    stroke="#c8e038" 
                    strokeWidth="4" 
                    strokeDasharray={`${Math.min(totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 126 : 0, 126)} 126`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                  {totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[var(--text-main)]">{transactions.length}</span>
              <span className="text-[var(--text-muted)] text-sm">{lang === 'en' ? 'transactions' : 'लेनदेन'}</span>
            </div>
          </div>

          {/* Balance Section - Mobile */}
          <div className="mt-4 lg:hidden bg-gradient-to-br from-[#c8e038] to-[#9ab82a] rounded-2xl p-4 text-[#0a1f1a]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{t('balance')}</span>
              </div>
              <span className="text-xs font-bold bg-[#0a1f1a]/20 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              ₹{loading ? '...' : Math.abs(balance).toLocaleString('en-IN')}
            </p>
            <div className="flex gap-6">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="opacity-70" />
                <div>
                  <p className="text-[10px] opacity-60">{lang === 'en' ? 'Income' : 'आय'}</p>
                  <p className="text-sm font-bold">₹{totalIncome.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown size={14} className="opacity-70" />
                <div>
                  <p className="text-[10px] opacity-60">{lang === 'en' ? 'Expense' : 'खर्च'}</p>
                  <p className="text-sm font-bold">₹{totalExpense.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card - Desktop */}
        <div data-tour="balance-card" className="hidden lg:block bg-gradient-to-br from-[#c8e038] to-[#9ab82a] rounded-3xl p-5 text-[#0a1f1a] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#0a1f1a]/20 rounded-xl">
                <Wallet size={20} />
              </div>
              <span className="text-xs font-bold bg-[#0a1f1a]/20 px-2 py-1 rounded-full">LIVE</span>
            </div>
            <p className="text-[#0a1f1a]/70 text-xs font-semibold uppercase tracking-wide mb-1">{t('balance')}</p>
            <p className="text-4xl font-bold tracking-tight mb-3">
              ₹{loading ? '...' : Math.abs(balance).toLocaleString('en-IN')}
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] text-[#0a1f1a]/60">{lang === 'en' ? 'Income' : 'आय'}</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <TrendingUp size={12} />
                  ₹{totalIncome.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#0a1f1a]/60">{lang === 'en' ? 'Expense' : 'खर्च'}</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <TrendingDown size={12} />
                  ₹{totalExpense.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]">
          <p className="text-[var(--text-muted)] text-xs mb-1">{lang === 'en' ? 'Savings Rate' : 'बचत दर'}</p>
          <p className="text-[var(--text-muted)] text-[10px]">{lang === 'en' ? 'This month' : 'इस महीने'}</p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-2">{totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]">
          <p className="text-[var(--text-muted)] text-xs mb-1">{lang === 'en' ? 'Activity' : 'गतिविधि'}</p>
          <p className="text-[var(--text-muted)] text-[10px]">{lang === 'en' ? 'This week' : 'इस सप्ताह'}</p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-2">{transactions.length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 col-span-2 border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-muted)] text-xs mb-1">{lang === 'en' ? 'New schemes' : 'नई योजनाएं'}</p>
              <p className="text-[var(--text-muted)] text-[10px]">{lang === 'en' ? 'Available for you' : 'आपके लिए उपलब्ध'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--text-main)]">4 <span className="text-[var(--primary)] text-lg">▲</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">● PM-KISAN</span>
            <span className="text-[10px] text-[var(--text-muted)]">● {lang === 'en' ? 'Crop Insurance' : 'फसल बीमा'}</span>
          </div>
        </div>
      </div>

      {/* Chart + Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[var(--text-muted)] text-xs">{lang === 'en' ? 'Weekly Overview' : 'साप्ताहिक विवरण'}</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">₹{totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <button onClick={() => setView('khata')} className="text-[var(--primary)] text-xs hover:underline flex items-center gap-1">
              {lang === 'en' ? 'View All' : 'सभी देखें'} <ChevronRight size={14} />
            </button>
          </div>
          
          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-32 mt-4">
            {chartData.slice(-7).map((day, i) => {
              const maxVal = Math.max(...chartData.map(d => Math.max(d.income || 0, d.expense || 0)), 1);
              const height = Math.max(((day.income || 0) / maxVal) * 100, 5);
              const isToday = i === chartData.slice(-7).length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end h-24">
                    <div 
                      className={`w-full rounded-t transition-all ${isToday ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                    {isToday ? (lang === 'en' ? 'TODAY' : 'आज') : day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Shortcuts Widget */}
        <div data-tour="quick-actions" className="space-y-3">
          <div 
            onClick={() => setView('saathi')}
            className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-glass)] rounded-2xl p-4 cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/50 transition-all group border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]">
                <Sparkles size={18} className="text-[var(--bg-main)]" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--text-main)] font-semibold text-sm">{lang === 'en' ? 'Saathi AI' : 'साथी AI'}</p>
                <p className="text-[var(--text-muted)] text-xs">{lang === 'en' ? 'Ask anything' : 'कुछ भी पूछें'}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
            </div>
          </div>
          
          <div 
            onClick={() => setView('mandi')}
            className="bg-[var(--bg-card)] rounded-2xl p-4 cursor-pointer hover:ring-2 hover:ring-orange-500/50 transition-all group border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20">
                <TrendingUp size={18} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--text-main)] font-semibold text-sm">{lang === 'en' ? 'Mandi Rates' : 'मंडी भाव'}</p>
                <p className="text-[var(--text-muted)] text-xs">{lang === 'en' ? 'Live prices' : 'लाइव भाव'}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-orange-500 transition-colors" />
            </div>
          </div>

          <div 
            onClick={() => setView('yojana')}
            className="bg-[var(--bg-card)] rounded-2xl p-4 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all group border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20">
                <ShieldCheck size={18} className="text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--text-main)] font-semibold text-sm">{lang === 'en' ? 'Schemes' : 'योजनाएं'}</p>
                <p className="text-[var(--text-muted)] text-xs">{lang === 'en' ? '7 available' : '7 उपलब्ध'}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-purple-500 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div data-tour="transactions" className="bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[var(--text-main)] font-semibold">{lang === 'en' ? 'Recent Transactions' : 'हाल के लेनदेन'}</p>
          <button onClick={() => setView('khata')} className="text-[var(--primary)] text-xs hover:underline">
            {lang === 'en' ? 'See all' : 'सभी देखें'}
          </button>
        </div>
        
        <div className="space-y-2">
          {transactions.slice(0, 4).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{lang === 'en' ? 'No transactions yet' : 'कोई लेनदेन नहीं'}</p>
            </div>
          ) : transactions.slice(0, 4).map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--bg-input)] transition-colors border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  txn.type === 'income' ? 'bg-[var(--primary)]/20' : 'bg-red-500/20'
                }`}>
                  {txn.type === 'income' ? (
                    <TrendingUp size={18} className="text-[var(--primary)]" />
                  ) : (
                    <TrendingDown size={18} className="text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-[var(--text-main)] text-sm font-medium">{txn.description || (txn.type === 'income' ? 'Income' : 'Expense')}</p>
                  <p className="text-[var(--text-muted)] text-xs">
                    {txn.timestamp ? new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                  </p>
                </div>
              </div>
              <p className={`font-bold ${txn.type === 'income' ? 'text-[var(--primary)]' : 'text-red-500'}`}>
                {txn.type === 'income' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setView('seekho')} className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-left hover:scale-105 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/20">
              <BookOpen size={20} className="text-white" />
            </div>
            <p className="text-white font-medium text-sm">{lang === 'en' ? 'Seekho' : 'सीखो'}</p>
          </div>
        </button>
        <button onClick={() => setView('calculator')} className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-left hover:scale-105 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/20">
              <Calculator size={20} className="text-white" />
            </div>
            <p className="text-white font-medium text-sm">{lang === 'en' ? 'Calculator' : 'कैलकुलेटर'}</p>
          </div>
        </button>
        <button onClick={() => setView('mausam')} className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-left hover:scale-105 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/20">
              <Cloud size={20} className="text-white" />
            </div>
            <p className="text-white font-medium text-sm">{lang === 'en' ? 'Weather' : 'मौसम'}</p>
          </div>
        </button>
        <button onClick={() => setView('community')} className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-left hover:scale-105 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/20">
              <Users size={20} className="text-white" />
            </div>
            <p className="text-white font-medium text-sm">{lang === 'en' ? 'Community' : 'समुदाय'}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
