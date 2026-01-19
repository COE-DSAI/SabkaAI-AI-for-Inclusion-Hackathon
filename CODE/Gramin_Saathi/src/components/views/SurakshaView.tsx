import React from 'react';
import { ShieldAlert, Wallet, Zap, Gift, ShieldCheck, AlertTriangle, Phone, Shield } from 'lucide-react';

export function SurakshaView({ lang }: { lang: string }) {
  const scams = [
    {
      title: lang === 'en' ? 'PM-Kisan KYC Scam' : 'PM-किसान KYC धोखाधड़ी',
      desc: lang === 'en' ? 'Calls asking for OTP to "update KYC" for PM-Kisan payments.' : 'PM-किसान भुगतान के लिए "KYC अपडेट" करने के नाम पर OTP मांगना।',
      tip: lang === 'en' ? 'Govt never asks for OTP over phone. Visit CSC for KYC.' : 'सरकार कभी फोन पर OTP नहीं मांगती। KYC के लिए CSC जाएं।',
      icon: <ShieldAlert className="text-red-500" />
    },
    {
      title: lang === 'en' ? 'Fake Loan Apps' : 'फर्जी लोन ऐप',
      desc: lang === 'en' ? 'Apps promising "instant 1-minute loans" but stealing your data.' : '"1 मिनट में लोन" का वादा करने वाले ऐप जो आपका डेटा चुराते हैं।',
      tip: lang === 'en' ? 'Only use apps verified by RBI. Check reviews first.' : 'केवल RBI द्वारा वेरिफाइड ऐप ही उपयोग करें। पहले रिव्यू देखें।',
      icon: <Wallet className="text-orange-500" />
    },
    {
      title: lang === 'en' ? 'Electricity Bill Scam' : 'बिजली बिल धोखाधड़ी',
      desc: lang === 'en' ? 'SMS saying: "Your power will be cut tonight. Call this number."' : 'SMS: "आज रात आपकी बिजली काट दी जाएगी। इस नंबर पर कॉल करें।"',
      tip: lang === 'en' ? 'Ignore such SMS. Check your bill on official portal only.' : 'ऐसे SMS को अनदेखा करें। केवल आधिकारिक पोर्टल पर बिल देखें।',
      icon: <Zap className="text-yellow-500" />
    },
    {
      title: lang === 'en' ? 'Job/Gift Scam' : 'नौकरी/उपहार धोखाधड़ी',
      desc: lang === 'en' ? '"You won a car!" or "Pay ₹500 for a govt job interview."' : '"आपने कार जीती!" या "सरकारी नौकरी के लिए ₹500 दें।"',
      tip: lang === 'en' ? 'Never pay money to get a job or prize. It is always a scam.' : 'नौकरी या इनाम पाने के लिए कभी पैसे न दें। यह हमेशा धोखा होता है।',
      icon: <Gift className="text-purple-500" />
    }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck size={28} />
          {lang === 'en' ? 'Suraksha (Safety)' : 'सुरक्षा'}
        </h2>
        <p className="opacity-90">
          {lang === 'en' ? 'Protect your hard-earned money from online frauds.' : 'अपनी मेहनत की कमाई को ऑनलाइन धोखाधड़ी से बचाएं।'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scams.map((scam, i) => (
          <div key={i} className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] hover:border-red-500/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[var(--bg-input)]">
                {scam.icon}
              </div>
              <h3 className="font-bold text-[var(--text-main)]">{scam.title}</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">{scam.desc}</p>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400 font-bold flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{lang === 'en' ? 'SAFETY TIP:' : 'सुरक्षा टिप:'} {scam.tip}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Contact */}
      <div className="bg-[var(--bg-input)] p-6 rounded-2xl border-2 border-dashed border-[var(--border)] text-center">
        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
          {lang === 'en' ? 'Victim of Cyber Fraud?' : 'साइबर धोखाधड़ी का शिकार हुए?'}
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {lang === 'en' ? 'Call the National Cyber Crime Helpline immediately.' : 'तुरंत राष्ट्रीय साइबर अपराध हेल्पलाइन पर कॉल करें।'}
        </p>
        <a 
          href="tel:1930" 
          className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-2xl font-bold text-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20"
        >
          <Phone size={24} />
          1930
        </a>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          {lang === 'en' ? 'Available 24/7 across India' : 'पूरे भारत में 24/7 उपलब्ध'}
        </p>
      </div>

      {/* General Rules */}
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)]">
        <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
          <Shield size={20} className="text-[var(--primary)]" />
          {lang === 'en' ? 'Golden Rules for Safety' : 'सुरक्षा के सुनहरे नियम'}
        </h3>
        <ul className="space-y-3">
          {[
            lang === 'en' ? 'Never share your OTP or PIN with anyone.' : 'किसी के साथ अपना OTP या पिन साझा न करें।',
            lang === 'en' ? 'Do not click on unknown links in SMS or WhatsApp.' : 'SMS या WhatsApp में अज्ञात लिंक पर क्लिक न करें।',
            lang === 'en' ? 'Banks never ask for personal details over phone.' : 'बैंक कभी फोन पर व्यक्तिगत जानकारी नहीं मांगते।',
            lang === 'en' ? 'Verify any scheme caller by visiting the local office.' : 'स्थानीय कार्यालय जाकर किसी भी योजना कॉल करने वाले को वेरिफाई करें।'
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-main)]">
              <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0 mt-0.5">✓</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
