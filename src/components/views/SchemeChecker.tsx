import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  ArrowRight, 
  Check, 
  Sparkles, 
  CheckCircle 
} from 'lucide-react';

export function SchemeChecker({ lang }: { lang: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male',
    landless: false,
    landSize: '',
    income: '',
    occupation: 'farmer'
  });
  const [eligibleSchemes, setEligibleSchemes] = useState<any[]>([]);

  const schemes = [
    {
      id: 1,
      name: lang === 'en' ? 'PM Kisan Samman Nidhi' : 'पीएम किसान सम्मान निधि',
      check: (d: any) => d.occupation === 'farmer' && !d.landless && parseFloat(d.landSize) > 0
    },
    {
      id: 2,
      name: lang === 'en' ? 'PM-KMY (Pension for Farmers)' : 'पीएम-केएमवाई (किसान पेंशन)',
      check: (d: any) => d.occupation === 'farmer' && parseInt(d.age) >= 18 && parseInt(d.age) <= 40 && parseFloat(d.landSize) <= 2
    },
    {
      id: 3,
      name: lang === 'en' ? 'Lakhpati Didi' : 'लखपति दीदी',
      check: (d: any) => d.gender === 'female' && parseInt(d.age) >= 18
    },
    {
      id: 4,
      name: lang === 'en' ? 'PM Vishwakarma' : 'पीएम विश्वकर्मा',
      check: (d: any) => d.occupation === 'artisan' && parseInt(d.age) >= 18
    },
    {
      id: 5,
      name: lang === 'en' ? 'MGNREGA' : 'मनरेगा',
      check: (d: any) => d.income === 'low' || parseInt(d.age) >= 18
    },
    {
      id: 6,
      name: lang === 'en' ? 'Ayushman Bharat' : 'आयुष्मान भारत',
      check: (d: any) => (d.income === 'low' || d.occupation === 'labor')
    }
  ];

  const handleCheck = () => {
    const results = schemes.filter(s => s.check(formData));
    setEligibleSchemes(results);
    setStep(4);
  };

  return (
    <div className="w-full">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-t-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <ClipboardCheck size={28} />
          {lang === 'en' ? 'Scheme Eligibility Checker' : 'योजना पात्रता जाँच'}
        </h2>
        <p className="opacity-90 text-sm">
          {lang === 'en' ? 'Find matching government schemes in 3 simple steps.' : '3 सरल चरणों में मेल खाने वाली सरकारी योजनाएं खोजें।'}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] p-6 rounded-b-2xl border border-[var(--border)] border-t-0 shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Step 1: Basic Information' : 'चरण 1: बुनियादी जानकारी'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">{lang === 'en' ? 'Your Age' : 'आपकी आयु'}</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                  className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">{lang === 'en' ? 'Gender' : 'लिंग'}</label>
                <div className="flex gap-3">
                  {['male', 'female', 'other'].map(g => (
                    <button
                      key={g}
                      onClick={() => setFormData({...formData, gender: g})}
                      className={`flex-1 py-3 rounded-xl font-bold capitalize border transition-all ${formData.gender === g ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-input)] text-[var(--text-main)] border-[var(--border)]'}`}
                    >
                      {lang === 'en' ? g : (g === 'male' ? 'पुरुष' : g === 'female' ? 'महिला' : 'अन्य')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold mt-4 shadow-lg hover:opacity-90 transition-opacity">
              {lang === 'en' ? 'Next Step' : 'अगला चरण'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Step 2: Occupation & Land' : 'चरण 2: व्यवसाय और भूमि'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">{lang === 'en' ? 'What is your main work?' : 'आपका मुख्य काम क्या है?'}</label>
                <select 
                  value={formData.occupation}
                  onChange={e => setFormData({...formData, occupation: e.target.value})}
                  className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
                >
                  <option value="farmer">{lang === 'en' ? 'Farmer' : 'किसान'}</option>
                  <option value="artisan">{lang === 'en' ? 'Artisan / Craftsman' : 'कारीगर / शिल्पकार'}</option>
                  <option value="labor">{lang === 'en' ? 'Daily Wage Labor' : 'दिहाड़ी मजदूर'}</option>
                  <option value="shopkeeper">{lang === 'en' ? 'Shopkeeper' : 'दुकानदार'}</option>
                  <option value="other">{lang === 'en' ? 'Other' : 'अन्य'}</option>
                </select>
              </div>
              
              {formData.occupation === 'farmer' && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                      type="checkbox" 
                      checked={formData.landless}
                      onChange={e => setFormData({...formData, landless: e.target.checked})}
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--bg-input)] accent-[var(--primary)]"
                    />
                    <span className="text-sm font-bold text-[var(--text-main)]">{lang === 'en' ? 'I do not own land (Landless)' : 'मेरे पास जमीन नहीं है (भूमिहीन)'}</span>
                  </label>
                  {!formData.landless && (
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">{lang === 'en' ? 'Land Size (in Hectares)' : 'भूमि का आकार (हेक्टेयर में)'}</label>
                      <input 
                        type="number" 
                        value={formData.landSize}
                        onChange={e => setFormData({...formData, landSize: e.target.value})}
                        className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
                        placeholder="1.5"
                        step="0.1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl font-bold border border-[var(--border)]">
                {lang === 'en' ? 'Back' : 'वापस'}
              </button>
              <button onClick={() => setStep(3)} className="flex-[2] py-4 bg-[var(--primary)] text-white rounded-xl font-bold shadow-lg">
                {lang === 'en' ? 'Next Step' : 'अगला चरण'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Step 3: Income Level' : 'चरण 3: आय का स्तर'}</h3>
            <div>
              <label className="block text-sm font-bold text-[var(--text-muted)] mb-3">{lang === 'en' ? 'What is your annual family income?' : 'आपकी वार्षिक पारिवारिक आय क्या है?'}</label>
              <div className="space-y-3">
                {[
                  { id: 'low', label: lang === 'en' ? 'Below ₹1 Lakh' : '₹1 लाख से कम' },
                  { id: 'mid', label: lang === 'en' ? '₹1 Lakh - ₹3 Lakh' : '₹1 लाख - ₹3 लाख' },
                  { id: 'high', label: lang === 'en' ? 'Above ₹3 Lakh' : '₹3 लाख से ऊपर' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setFormData({...formData, income: item.id})}
                    className={`w-full p-4 rounded-xl text-left font-bold border transition-all flex items-center justify-between ${formData.income === item.id ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--bg-input)] text-[var(--text-main)] border-[var(--border)]'}`}
                  >
                    <span>{item.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.income === item.id ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'}`}>
                      {formData.income === item.id && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 py-4 bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl font-bold border border-[var(--border)]">
                {lang === 'en' ? 'Back' : 'वापस'}
              </button>
              <button 
                onClick={handleCheck} 
                disabled={!formData.income}
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
              >
                {lang === 'en' ? 'Show My Schemes' : 'मेरी योजनाएं देखें'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={40} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">{lang === 'en' ? 'Great News!' : 'शानदार खबर!'}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {lang === 'en' ? `We found ${eligibleSchemes.length} schemes matching your profile.` : `हमें आपकी प्रोफ़ाइल से मेल खाने वाली ${eligibleSchemes.length} योजनाएं मिलीं।`}
              </p>
            </div>

            <div className="space-y-3">
              {eligibleSchemes.length > 0 ? (
                eligibleSchemes.map(scheme => (
                  <div key={scheme.id} className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-between group hover:border-[var(--primary)] transition-all">
                    <div>
                      <h4 className="font-bold text-[var(--text-main)]">{scheme.name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{lang === 'en' ? 'Verified Official Scheme' : 'सत्यापित आधिकारिक योजना'}</p>
                    </div>
                    <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-all" />
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-[var(--bg-input)] rounded-2xl border border-[var(--border)] text-[var(--text-muted)]">
                  {lang === 'en' ? 'No perfect matches found. Try widening your criteria.' : 'कोई सटीक मेल नहीं मिला। अपनी मापदंडों को बदलने का प्रयास करें।'}
                </div>
              )}
            </div>

            <button 
              onClick={() => {setStep(1); setFormData({age:'', gender:'male', landless:false, landSize:'', income:'', occupation:'farmer'});}} 
              className="w-full py-4 text-[var(--primary)] font-bold hover:underline transition-all"
            >
              {lang === 'en' ? 'Check Again with Different Info' : 'अलग जानकारी के साथ फिर से जाँचें'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
