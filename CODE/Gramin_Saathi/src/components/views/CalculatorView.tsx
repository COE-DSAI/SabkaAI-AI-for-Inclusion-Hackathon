import React, { useState } from 'react';
import { 
  Calculator, 
  ChevronDown 
} from 'lucide-react';

export function CalculatorView({ user, db, appId, t, lang }: any) {
  const [calculatorType, setCalculatorType] = useState('kcc'); // 'kcc', 'emi', 'subsidy'
  
  // KCC Calculator State
  const [landArea, setLandArea] = useState('');
  const [cropType, setCropType] = useState('cereal');
  const [kccLimit, setKccLimit] = useState(0);
  
  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('7');
  const [tenure, setTenure] = useState('12');
  const [emi, setEmi] = useState(0);
  const [emiSchedule, setEmiSchedule] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [totalInterest, setTotalInterest] = useState(0);

  // Subsidy Calculator State
  const [equipmentCost, setEquipmentCost] = useState('');
  const [category, setCategory] = useState('general');
  const [subsidyAmount, setSubsidyAmount] = useState(0);

  const calculateKCC = () => {
    const area = parseFloat(landArea) || 0;
    const ratePerHectare = cropType === 'cereal' ? 160000 : cropType === 'cash' ? 200000 : 180000;
    setKccLimit(Math.round(area * ratePerHectare));
  };

  const calculateEMI = () => {
    const P_initial = parseFloat(loanAmount) || 0;
    const r = (parseFloat(interestRate) || 0) / 12 / 100;
    const n = parseInt(tenure) || 1;
    
    if (P_initial > 0 && r > 0 && n > 0) {
      const emiValue = (P_initial * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const totalPayment = emiValue * n;
      setEmi(Math.round(emiValue));
      setTotalInterest(Math.round(totalPayment - P_initial));

      // Generate Schedule
      let balance = P_initial;
      const schedule = [];
      for (let i = 1; i <= n; i++) {
        const interest = balance * r;
        const principal = emiValue - interest;
        balance -= principal;
        schedule.push({
          month: i,
          emi: Math.round(emiValue),
          interest: Math.round(interest),
          principal: Math.round(principal),
          balance: Math.max(0, Math.round(balance))
        });
      }
      setEmiSchedule(schedule);
    }
  };
  
  const calculateSubsidy = () => {
    const cost = parseFloat(equipmentCost) || 0;
    const rate = category === 'sc_st' ? 0.50 : category === 'obc' ? 0.40 : 0.30;
    setSubsidyAmount(Math.round(cost * rate));
  };
  
  return (
    <div className="w-full md:max-w-4xl md:mx-auto space-y-4 md:space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 md:p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Calculator size={28} />
          {lang === 'en' ? 'Loan & Subsidy Calculator' : 'ऋण और सब्सिडी कैलकुलेटर'}
        </h2>
        <p className="opacity-90 text-sm">
          {lang === 'en' ? 'Calculate KCC limits, EMI, and subsidies' : 'केसीसी सीमा, ईएमआई और सब्सिडी की गणना करें'}
        </p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => setCalculatorType('kcc')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${calculatorType === 'kcc' ? 'bg-blue-500 text-white shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'}`}
        >
          {lang === 'en' ? 'KCC Limit' : 'केसीसी सीमा'}
        </button>
        <button
          onClick={() => setCalculatorType('emi')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${calculatorType === 'emi' ? 'bg-purple-500 text-white shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'}`}
        >
          {lang === 'en' ? 'EMI' : 'ईएमआई'}
        </button>
        <button
          onClick={() => setCalculatorType('subsidy')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${calculatorType === 'subsidy' ? 'bg-green-500 text-white shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'}`}
        >
          {lang === 'en' ? 'Subsidy' : 'सब्सिडी'}
        </button>
      </div>
      
      {calculatorType === 'kcc' && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Land Area (Hectares)' : 'भूमि क्षेत्र (हेक्टेयर)'}
            </label>
            <input
              type="number"
              value={landArea}
              onChange={(e) => setLandArea(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
              placeholder="0.0"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Crop Type' : 'फसल प्रकार'}
            </label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
            >
              <option value="cereal">{lang === 'en' ? 'Cereals (Wheat, Rice)' : 'अनाज (गेहूं, धान)'}</option>
              <option value="cash">{lang === 'en' ? 'Cash Crops (Cotton, Sugarcane)' : 'नकदी फसल (कपास, गन्ना)'}</option>
              <option value="horticulture">{lang === 'en' ? 'Horticulture' : 'बागवानी'}</option>
            </select>
          </div>
          
          <button
            onClick={calculateKCC}
            className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            {lang === 'en' ? 'Calculate KCC Limit' : 'केसीसी सीमा की गणना करें'}
          </button>
          
          {kccLimit > 0 && (
            <div className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-500">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{lang === 'en' ? 'Your KCC Limit' : 'आपकी केसीसी सीमा'}</p>
              <p className="text-3xl md:text-4xl font-bold text-blue-600">₹{kccLimit.toLocaleString('en-IN')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {lang === 'en' ? 'Based on' : 'आधारित'} {cropType === 'cereal' ? '₹1.6L' : cropType === 'cash' ? '₹2L' : '₹1.8L'} {lang === 'en' ? 'per hectare' : 'प्रति हेक्टेयर'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {calculatorType === 'emi' && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Loan Amount (₹)' : 'ऋण राशि (₹)'}
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
              placeholder="100000"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Interest Rate (% per year)' : 'ब्याज दर (% प्रति वर्ष)'}
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
              placeholder="7"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Tenure (Months)' : 'अवधि (महीने)'}
            </label>
            <input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
              placeholder="12"
            />
          </div>
          
          <button
            onClick={calculateEMI}
            className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors"
          >
            {lang === 'en' ? 'Calculate EMI' : 'ईएमआई की गणना करें'}
          </button>
          
          {emi > 0 && (
            <div className="space-y-3">
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-500">
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">{lang === 'en' ? 'Monthly EMI' : 'मासिक ईएमआई'}</p>
                <p className="text-4xl font-bold text-purple-600">₹{emi.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{lang === 'en' ? 'Total Payment' : 'कुल भुगतान'}</p>
                  <p className="text-xl font-bold text-[var(--text-main)]">₹{(emi * parseInt(tenure)).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{lang === 'en' ? 'Total Interest' : 'कुल ब्याज'}</p>
                  <p className="text-xl font-bold text-red-600">₹{totalInterest.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {emiSchedule.length > 0 && (
                <div className="pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full py-2 flex items-center justify-between text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    <span>{lang === 'en' ? 'View Payment Breakdown' : 'भुगतान विवरण देखें'}</span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${showSchedule ? 'rotate-180' : ''}`} />
                  </button>

                  {showSchedule && (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--bg-input)] text-[var(--text-muted)] uppercase">
                          <tr>
                            <th className="px-3 py-2">{lang === 'en' ? 'Month' : 'महीना'}</th>
                            <th className="px-3 py-2">{lang === 'en' ? 'Principal' : 'मूलधन'}</th>
                            <th className="px-3 py-2">{lang === 'en' ? 'Interest' : 'ब्याज'}</th>
                            <th className="px-3 py-2">{lang === 'en' ? 'Balance' : 'शेष'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {emiSchedule.map((row) => (
                            <tr key={row.month} className="text-[var(--text-main)]">
                              <td className="px-3 py-2 font-medium">{row.month}</td>
                              <td className="px-3 py-2">₹{row.principal.toLocaleString('en-IN')}</td>
                              <td className="px-3 py-2">₹{row.interest.toLocaleString('en-IN')}</td>
                              <td className="px-3 py-2">₹{row.balance.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {calculatorType === 'subsidy' && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Equipment/Machine Cost (₹)' : 'उपकरण/मशीन लागत (₹)'}
            </label>
            <input
              type="number"
              value={equipmentCost}
              onChange={(e) => setEquipmentCost(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
              placeholder="50000"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-[var(--text-muted)] mb-2 block">
              {lang === 'en' ? 'Category' : 'श्रेणी'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)]"
            >
              <option value="general">{lang === 'en' ? 'General (30%)' : 'सामान्य (30%)'}</option>
              <option value="obc">{lang === 'en' ? 'OBC (40%)' : 'ओबीसी (40%)'}</option>
              <option value="sc_st">{lang === 'en' ? 'SC/ST (50%)' : 'अनुसूचित जाति/जनजाति (50%)'}</option>
            </select>
          </div>
          
          <button
            onClick={calculateSubsidy}
            className="w-full py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
          >
            {lang === 'en' ? 'Calculate Subsidy' : 'सब्सिडी की गणना करें'}
          </button>
          
          {subsidyAmount > 0 && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500">
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">{lang === 'en' ? 'Subsidy Amount' : 'सब्सिडी राशि'}</p>
              <p className="text-4xl font-bold text-green-600">₹{subsidyAmount.toLocaleString('en-IN')}</p>
              <p className="text-sm text-[var(--text-main)] mt-3">
                {lang === 'en' ? 'Your contribution:' : 'आपका योगदान:'} <span className="font-bold">₹{(parseFloat(equipmentCost) - subsidyAmount).toLocaleString('en-IN')}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
