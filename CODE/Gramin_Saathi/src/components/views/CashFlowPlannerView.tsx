import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Sprout,
  AlertCircle,
  Sparkles,
  Download,
  Plus,
  X,
  Trash2,
  Edit,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface CropSeason {
  id: string;
  crop: string;
  season: string;
  plantingMonth: string;
  harvestMonth: string;
  expectedIncomePerAcre: number;
  estimatedCostPerAcre: number;
  selected?: boolean;
}

interface MonthlyExpense {
  id: string;
  category: string;
  amount: number;
  month: string;
  isRecurring?: boolean;
}

interface CashFlowPlannerProps {
  user: any;
  profile: any;
  db: any;
  appId: string;
  t: (key: string) => string;
  lang: 'en' | 'hi';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_HI = ['जन', 'फर', 'मार', 'अप्र', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्ट', 'नव', 'दिस'];

const EXPENSE_CATEGORIES = [
  'School Fees', 'Insurance', 'Petrol', 'Groceries', 'Medicine', 
  'Electricity', 'Water', 'Seeds', 'Fertilizer', 'Labor', 'Equipment', 'Rent', 'Other'
];

// Crop database with per-acre data
const AVAILABLE_CROPS: CropSeason[] = [
  { id: '1', crop: 'Rice', season: 'Kharif', plantingMonth: 'Jun', harvestMonth: 'Oct', expectedIncomePerAcre: 45000, estimatedCostPerAcre: 25000 },
  { id: '2', crop: 'Wheat', season: 'Rabi', plantingMonth: 'Nov', harvestMonth: 'Apr', expectedIncomePerAcre: 40000, estimatedCostPerAcre: 22000 },
  { id: '3', crop: 'Cotton', season: 'Kharif', plantingMonth: 'May', harvestMonth: 'Oct', expectedIncomePerAcre: 50000, estimatedCostPerAcre: 30000 },
  { id: '4', crop: 'Mustard', season: 'Rabi', plantingMonth: 'Oct', harvestMonth: 'Feb', expectedIncomePerAcre: 25000, estimatedCostPerAcre: 15000 },
  { id: '5', crop: 'Sugarcane', season: 'Year-round', plantingMonth: 'Jan', harvestMonth: 'Dec', expectedIncomePerAcre: 80000, estimatedCostPerAcre: 45000 },
  { id: '6', crop: 'Maize', season: 'Kharif', plantingMonth: 'Jun', harvestMonth: 'Sep', expectedIncomePerAcre: 35000, estimatedCostPerAcre: 20000 },
];

export function CashFlowPlannerView({ user, profile, db, appId, t, lang }: CashFlowPlannerProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<CropSeason[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [fieldArea, setFieldArea] = useState<number>(5); // in acres
  
  // Add expense form state
  const [newExpense, setNewExpense] = useState({
    category: 'School Fees',
    amount: '',
    month: 'Jan',
    isRecurring: false
  });

  // Load saved data from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    loadSavedData();
  }, [user?.uid]);

  const loadSavedData = async () => {
    try {
      // Load selected crops from a single cashflow-data document
      const dataRef = doc(db, 'artifacts', appId, 'users', user.uid, 'cashflow-data', 'main');
      const dataSnap = await getDoc(dataRef);
      if (dataSnap.exists()) {
        const data = dataSnap.data();
        setSelectedCrops(data.selectedCrops || []);
        setFieldArea(data.fieldArea || 5);
      }

      // Load expenses from subcollection
      const expensesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'cashflow-expenses');
      const expensesSnap = await getDocs(expensesRef);
      const loadedExpenses: MonthlyExpense[] = [];
      expensesSnap.forEach(doc => {
        loadedExpenses.push({ id: doc.id, ...doc.data() } as MonthlyExpense);
      });
      setExpenses(loadedExpenses);
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    }
  };

  // Calculate monthly data based on selected crops and expenses
  useEffect(() => {
    calculateMonthlyData();
  }, [selectedCrops, expenses, fieldArea, lang]);

  const calculateMonthlyData = () => {
    const data: MonthlyData[] = MONTHS.map((month, index) => {
      let monthIncome = 0;
      let monthExpenses = 0;

      // Calculate income from selected crops (harvest months)
      selectedCrops.forEach(crop => {
        if (crop.harvestMonth === month) {
          monthIncome += crop.expectedIncomePerAcre * fieldArea;
        }
      });

      // Calculate expenses from selected crops (planting + maintenance)
      selectedCrops.forEach(crop => {
        if (crop.plantingMonth === month) {
          monthExpenses += crop.estimatedCostPerAcre * fieldArea;
        }
      });

      // Add custom monthly expenses
      const monthExpensesList = expenses.filter(e => e.month === month);
      monthExpenses += monthExpensesList.reduce((sum, e) => sum + e.amount, 0);

      return {
        month: lang === 'hi' ? MONTHS_HI[index] : month,
        income: Math.round(monthIncome),
        expenses: Math.round(monthExpenses),
        profit: Math.round(monthIncome - monthExpenses)
      };
    });

    setMonthlyData(data);
  };

  // Toggle crop selection
  const toggleCropSelection = async (crop: CropSeason) => {
    const isSelected = selectedCrops.some(c => c.id === crop.id);
    let newSelection: CropSeason[];
    
    if (isSelected) {
      newSelection = selectedCrops.filter(c => c.id !== crop.id);
    } else {
      newSelection = [...selectedCrops, crop];
    }
    
    setSelectedCrops(newSelection);
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cashflow-data', 'main'), {
        selectedCrops: newSelection,
        fieldArea: fieldArea
      }, { merge: true });
    } catch (error) {
      console.error('Error saving crops:', error);
    }
  };

  // Add expense
  const handleAddExpense = async () => {
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;

    const newExpenses: MonthlyExpense[] = [];
    
    if (newExpense.isRecurring) {
      // Add expense to all 12 months
      MONTHS.forEach((month, index) => {
        const expense: MonthlyExpense = {
          id: `${Date.now()}-${index}`,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount),
          month: month,
          isRecurring: true
        };
        newExpenses.push(expense);
      });
    } else {
      // Add expense to selected month only
      const expense: MonthlyExpense = {
        id: Date.now().toString(),
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        month: newExpense.month,
        isRecurring: false
      };
      newExpenses.push(expense);
    }

    setExpenses([...expenses, ...newExpenses]);
    
    // Save to Firestore
    try {
      for (const expense of newExpenses) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cashflow-expenses', expense.id), expense);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
    }

    // Reset form
    setNewExpense({ category: 'School Fees', amount: '', month: 'Jan', isRecurring: false });
    setShowAddExpense(false);
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    setExpenses(expenses.filter(e => e.id !== expenseId));
    
    // Delete from Firestore
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cashflow-expenses', expenseId));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  // Update field area
  const updateFieldArea = async (area: number) => {
    setFieldArea(area);
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cashflow-data', 'main'), {
        fieldArea: area,
        selectedCrops: selectedCrops
      }, { merge: true });
    } catch (error) {
      console.error('Error saving field area:', error);
    }
  };

  // Get AI recommendations
  const getAIRecommendations = async () => {
    setLoadingAI(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
      const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
      const netProfit = totalIncome - totalExpenses;

      const prompt = `You are a financial advisor for Indian farmers. Based on:
- Total Annual Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Annual Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Profit: ₹${netProfit.toLocaleString('en-IN')}
- Field Area: ${fieldArea} acres
- Crops: ${selectedCrops.map(c => c.crop).join(', ') || 'None selected'}
- State: ${profile?.state || 'Not specified'}

Provide in ${lang === 'hi' ? 'Hinglish (mix of Hindi-English)' : 'English'}:
1. **Financial Analysis** (2 sentences)
2. **Top 3 Government Schemes** (name + brief eligibility)
3. **Loan Options** (if needed, 2 options)
4. **Savings Tips** (3 actionable points)

Keep it concise and practical.`;

      const result = await model.generateContent(prompt);
      setAiRecommendations(result.response.text());
    } catch (error) {
      console.error('AI Error:', error);
      setAiRecommendations(
        lang === 'hi' 
          ? '❌ AI सिफारिशें प्राप्त करने में त्रुटि। कृपया पुनः प्रयास करें।'
          : '❌ Error fetching AI recommendations. Please try again.'
      );
    } finally {
      setLoadingAI(false);
    }
  };

  // Calculate summary stats
  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const netProfit = totalIncome - totalExpenses;
  const avgMonthlyIncome = totalIncome / 12;
  const profitableMonths = monthlyData.filter(m => m.profit > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <TrendingUp className="text-[var(--primary)]" size={32} />
            {lang === 'hi' ? 'बचत योजनाकार' : 'Savings Planner'}
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {lang === 'hi' 
              ? 'मासिक आय-व्यय ट्रैक करें और AI सिफारिशें पाएं'
              : 'Track monthly income-expenses and get AI recommendations'
            }
          </p>
        </div>
        <button
          onClick={getAIRecommendations}
          disabled={loadingAI}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-[var(--text-main)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Sparkles size={18} />
          {loadingAI 
            ? (lang === 'hi' ? 'लोड हो रहा है...' : 'Loading...') 
            : (lang === 'hi' ? 'AI सिफारिशें पाएं' : 'Get AI Recommendations')
          }
        </button>
      </div>

      {/* Field Area Input */}
      <div className="glass p-4 rounded-xl">
        <label className="text-sm font-semibold text-[var(--text-main)] mb-2 block flex items-center gap-2">
          <Sprout size={16} className="text-[var(--primary)]" />
          {lang === 'hi' ? 'खेत का क्षेत्रफल (एकड़)' : 'Field Area (Acres)'}
        </label>
        <input
          type="number"
          value={fieldArea}
          onChange={(e) => updateFieldArea(parseFloat(e.target.value) || 0)}
          className="w-full sm:w-48 px-4 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
          min="0.1"
          step="0.5"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-muted)]">
              {lang === 'hi' ? 'कुल आय' : 'Total Income'}
            </p>
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            ₹{totalIncome.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            ₹{avgMonthlyIncome.toLocaleString('en-IN')}/{lang === 'hi' ? 'माह' : 'month'}
          </p>
        </div>

        <div className="glass p-5 rounded-2xl border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-muted)]">
              {lang === 'hi' ? 'कुल खर्च' : 'Total Expenses'}
            </p>
            <TrendingDown className="text-red-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            ₹{(totalExpenses / 12).toLocaleString('en-IN')}/{lang === 'hi' ? 'माह' : 'month'}
          </p>
        </div>

        <div className={`glass p-5 rounded-2xl border-l-4 ${netProfit >= 0 ? 'border-[var(--primary)]' : 'border-orange-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-muted)]">
              {lang === 'hi' ? 'शुद्ध लाभ' : 'Net Profit'}
            </p>
            <DollarSign className={netProfit >= 0 ? 'text-[var(--primary)]' : 'text-orange-500'} size={20} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            ₹{netProfit.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {netProfit >= 0 ? '🎉 ' : '⚠️ '}{lang === 'hi' ? 'वार्षिक' : 'Yearly'}
          </p>
        </div>

        <div className="glass p-5 rounded-2xl border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-muted)]">
              {lang === 'hi' ? 'लाभदायक महीने' : 'Profitable Months'}
            </p>
            <Calendar className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            {profitableMonths}/12
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {Math.round((profitableMonths / 12) * 100)}% {lang === 'hi' ? 'सफलता दर' : 'success rate'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--primary)]" />
            {lang === 'hi' ? 'आय बनाम खर्च' : 'Income vs Expenses'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--text-muted)" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#22c55e" 
                strokeWidth={2}
                name={lang === 'hi' ? 'आय' : 'Income'}
                dot={{ fill: '#22c55e' }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                name={lang === 'hi' ? 'खर्च' : 'Expenses'}
                dot={{ fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Net Profit/Loss Chart */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-[var(--primary)]" />
            {lang === 'hi' ? 'शुद्ध लाभ/हानि' : 'Net Profit/Loss'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--text-muted)" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
              <Bar 
                dataKey="profit" 
                fill="var(--primary)" 
                name={lang === 'hi' ? 'लाभ/हानि' : 'Profit/Loss'}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal Crop Selection */}
      <div className="glass p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Sprout size={20} className="text-[var(--primary)]" />
            {lang === 'hi' ? 'फसल चुनें (मल्टी-सेलेक्ट)' : 'Select Crops (Multi-Select)'}
          </h3>
          <span className="text-sm text-[var(--text-muted)]">
            {selectedCrops.length} {lang === 'hi' ? 'चयनित' : 'selected'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_CROPS.map((crop) => {
            const isSelected = selectedCrops.some(c => c.id === crop.id);
            const income = crop.expectedIncomePerAcre * fieldArea;
            const cost = crop.estimatedCostPerAcre * fieldArea;
            const roi = ((income - cost) / cost * 100).toFixed(1);
            
            return (
              <div 
                key={crop.id} 
                onClick={() => toggleCropSelection(crop)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                    : 'border-[var(--border)] bg-[var(--bg-input)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">{crop.crop}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full">
                      {crop.season}
                    </span>
                    {isSelected && <Check size={16} className="text-[var(--primary)]" />}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {crop.plantingMonth} → {crop.harvestMonth}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {lang === 'hi' ? 'लागत' : 'Cost'}:
                    </span>
                    <span className="text-red-500">₹{cost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {lang === 'hi' ? 'आय' : 'Income'}:
                    </span>
                    <span className="text-green-500">₹{income.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-[var(--border)]">
                    <span className="text-[var(--text-main)]">ROI:</span>
                    <span className="text-[var(--primary)]">{roi}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Expenses */}
      <div className="glass p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
            <DollarSign size={20} className="text-[var(--primary)]" />
            {lang === 'hi' ? 'मासिक खर्च' : 'Monthly Expenses'}
          </h3>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--text-main)] rounded-xl text-sm font-semibold hover:opacity-90"
          >
            {showAddExpense ? <X size={16} /> : <Plus size={16} />}
            {lang === 'hi' ? 'खर्च जोड़ें' : 'Add Expense'}
          </button>
        </div>

        {/* Add Expense Form */}
        {showAddExpense && (
          <div className="mb-4 p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  {lang === 'hi' ? 'श्रेणी' : 'Category'}
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-main)]"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  {lang === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-main)]"
                  placeholder="5000"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  {lang === 'hi' ? 'महीना' : 'Month'}
                </label>
                <select
                  value={newExpense.month}
                  onChange={(e) => setNewExpense({...newExpense, month: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-main)]"
                  disabled={newExpense.isRecurring}
                >
                  {MONTHS.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Recurring Checkbox */}
            <div className="flex items-center gap-2 mt-3 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
              <input
                type="checkbox"
                id="recurring"
                checked={newExpense.isRecurring}
                onChange={(e) => setNewExpense({...newExpense, isRecurring: e.target.checked})}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <label htmlFor="recurring" className="text-sm text-[var(--text-main)] cursor-pointer flex-1">
                {lang === 'hi' ? '🔄 आवर्ती (सभी 12 महीनों में जोड़ें)' : '🔄 Recurring (Add to all 12 months)'}
              </label>
            </div>
            
            <button
              onClick={handleAddExpense}
              className="mt-3 w-full py-2 bg-[var(--primary)] text-[var(--text-main)] rounded-lg font-semibold hover:opacity-90"
            >
              {newExpense.isRecurring 
                ? (lang === 'hi' ? '12 महीनों में जोड़ें' : 'Add to 12 Months')
                : (lang === 'hi' ? 'जोड़ें' : 'Add')
              }
            </button>
          </div>
        )}

        {/* Expenses List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {expenses.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-4">
              {lang === 'hi' ? 'कोई खर्च नहीं जोड़ा गया' : 'No expenses added'}
            </p>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-main)]">{expense.category}</p>
                    {expense.isRecurring && <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full">🔄</span>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{expense.month}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-[var(--text-main)]">₹{expense.amount.toLocaleString('en-IN')}</p>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      {aiRecommendations && (
        <div className="glass p-6 rounded-2xl border border-[var(--primary)]/30">
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--primary)]" />
            {lang === 'hi' ? 'AI वित्तीय सिफारिशें' : 'AI Financial Recommendations'}
          </h3>
          <div className="prose prose-sm max-w-none prose-invert">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold text-[var(--primary)] mt-4 mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-[var(--primary)] mt-3 mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-semibold text-[var(--text-main)] mt-2 mb-1" {...props} />,
                p: ({node, ...props}) => <p className="text-[var(--text-main)] mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 ml-4 text-[var(--text-main)]" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 ml-4 text-[var(--text-main)]" {...props} />,
                li: ({node, ...props}) => <li className="text-[var(--text-main)]" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-[var(--primary)]" {...props} />,
                em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
              }}
            >
              {aiRecommendations}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashFlowPlannerView;
