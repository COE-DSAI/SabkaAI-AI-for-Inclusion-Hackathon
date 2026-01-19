'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react';
import { recommendLoans } from '@/lib/matching_algorithms';

interface LoanRecommendation {
  id: string;
  name: string;
  lender: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenure: number;
  matchScore: number;
  monthlyEMI: number;
  totalInterest: number;
  eligible: boolean;
  positiveReasons: string[];
  disqualifyReasons: string[];
  estimatedApprovalTime: number;
  debtToIncomeRatio: string;
}

export default function LoanRecommender({ lang = 'en', t = (key: string) => key }: any) {
  const [formData, setFormData] = useState({
    state: 'maharashtra',
    landholding: 2,
    annualIncome: 200000,
    loanAmountNeeded: 100000,
    purpose: 'seeds' as const,
    hasCollateral: false,
    collateralValue: 0,
    creditHistory: 'none' as const,
  });

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  ];

  const purposes = [
    { id: 'seeds', label: 'Seeds & Inputs' },
    { id: 'equipment', label: 'Equipment & Machinery' },
    { id: 'infrastructure', label: 'Infrastructure Development' },
    { id: 'working_capital', label: 'Working Capital' },
    { id: 'emergency', label: 'Emergency/Calamity Relief' },
  ] as const;

  const creditOptions = [
    { id: 'excellent', label: 'Excellent (Always paid on time)' },
    { id: 'good', label: 'Good (Rarely missed payment)' },
    { id: 'fair', label: 'Fair (Some late payments)' },
    { id: 'poor', label: 'Poor (Frequent late payments)' },
    { id: 'none', label: 'No prior credit history' },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const recommendations = recommendLoans({
        state: formData.state.toLowerCase(),
        landholding: formData.landholding,
        annualIncome: formData.annualIncome,
        loanAmountNeeded: formData.loanAmountNeeded,
        purpose: formData.purpose,
        hasCollateral: formData.hasCollateral,
        collateralValue: formData.collateralValue,
        creditHistory: formData.creditHistory,
      });

      setResults(recommendations);
      setLoading(false);
    }, 500);
  };

  const translations = {
    en: {
      title: '💰 Loan Recommendation Engine',
      desc: 'Find the best agricultural loan products matched to your needs',
      state: 'Select State',
      landholding: 'Landholding (hectares)',
      income: 'Annual Income (₹)',
      amount: 'Loan Amount Needed (₹)',
      purpose: 'Purpose of Loan',
      collateral: 'Do you have collateral?',
      collateralValue: 'Collateral Value (₹)',
      credit: 'Credit History',
      find: 'Find Best Loans',
      results: 'Loan Recommendations',
      recommendations: 'Best Options for You',
      lender: 'Lender',
      rate: 'Interest Rate',
      emi: 'Monthly EMI',
      total: 'Total Interest',
      tenure: 'Tenure (months)',
      approval: 'Approval Time',
      match: 'Match Score',
      reasons: 'Why This Loan',
      apply: 'Apply Now',
      accuracy: 'Accuracy',
      avgRate: 'Average Interest Rate',
      no: 'No loans match your profile. Try adjusting your parameters.',
      dti: 'Debt-to-Income Ratio',
    },
    hi: {
      title: '💰 ऋण सिफारिश इंजन',
      desc: 'आपकी आवश्यकताओं के अनुरूप सर्वश्रेष्ठ कृषि ऋण उत्पाद खोजें',
      state: 'राज्य चुनें',
      landholding: 'भूमि होल्डिंग (हेक्टेयर)',
      income: 'वार्षिक आय (₹)',
      amount: 'आवश्यक ऋण राशि (₹)',
      purpose: 'ऋण का उद्देश्य',
      collateral: 'क्या आपके पास जमानत है?',
      collateralValue: 'जमानत मूल्य (₹)',
      credit: 'क्रेडिट इतिहास',
      find: 'सर्वश्रेष्ठ ऋण खोजें',
      results: 'ऋण सिफारिशें',
      recommendations: 'आपके लिए सर्वश्रेष्ठ विकल्प',
      lender: 'ऋणदाता',
      rate: 'ब्याज दर',
      emi: 'मासिक EMI',
      total: 'कुल ब्याज',
      tenure: 'अवधि (महीने)',
      approval: 'अनुमोदन समय',
      match: 'मैच स्कोर',
      reasons: 'यह ऋण क्यों',
      apply: 'अभी आवेदन करें',
      accuracy: 'सटीकता',
      avgRate: 'औसत ब्याज दर',
      no: 'कोई ऋण आपकी प्रोफाइल से मेल नहीं खाते। अपने पैरामीटर समायोजित करने का प्रयास करें।',
      dti: 'ऋण-से-आय अनुपात',
    },
  };

  const dict = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-main)]">{dict.title}</h1>
        <p className="text-[var(--text-muted)]">{dict.desc}</p>
      </div>

      {/* Form Card */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)]">
        <CardHeader className="bg-[var(--bg-glass)] border-b border-[var(--border)]">
          <CardTitle className="text-[var(--text-main)]">{dict.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* State */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.state}</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, state: value })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state.toLowerCase()}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Landholding */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.landholding}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={formData.landholding}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      landholding: parseFloat(e.target.value),
                    })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Annual Income */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.income}</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.annualIncome}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      annualIncome: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Loan Amount */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.amount}</Label>
                <Input
                  type="number"
                  step="1"
                  min="5000"
                  value={formData.loanAmountNeeded}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      loanAmountNeeded: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.purpose}</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, purpose: value })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Credit History */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.credit}</Label>
                <Select
                  value={formData.creditHistory}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, creditHistory: value })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creditOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Collateral Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="collateral"
                  checked={formData.hasCollateral}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasCollateral: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <Label
                  htmlFor="collateral"
                  className="text-[var(--text-main)] cursor-pointer"
                >
                  {dict.collateral}
                </Label>
              </div>

              {formData.hasCollateral && (
                <div className="pl-6">
                  <Label className="text-[var(--text-main)]">{dict.collateralValue}</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.collateralValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        collateralValue: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-10 mt-2"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base"
            >
              {loading ? 'Finding...' : dict.find}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-[var(--bg-card)] border border-[var(--border)]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    {results.totalRecommendations}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{dict.recommendations}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {results.averageInterestRate}%
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{dict.avgRate}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    {results.accuracy}%
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{dict.accuracy}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {results.bestOptions[0]?.monthlyEMI.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Min {dict.emi}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Recommendations */}
          {results.bestOptions.length > 0 ? (
            <div className="space-y-3">
              {results.bestOptions.map((loan: LoanRecommendation, idx: number) => (
                <Card
                  key={loan.id}
                  className="border-l-4 border-l-[var(--primary)] hover:shadow-lg transition-shadow bg-[var(--bg-card)]"
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Loan Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <DollarSign className="w-5 h-5 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                            <div>
                              <h3 className="font-bold text-lg text-[var(--text-main)]">{loan.name}</h3>
                              <p className="text-sm text-[var(--text-muted)]">{loan.lender}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--primary)]">
                            {loan.matchScore.toFixed(0)}% Match
                          </div>
                        </div>
                      </div>

                      {/* Key Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--bg-glass)] p-3 rounded-md">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{dict.rate}</p>
                          <p className="font-bold text-lg text-[var(--primary)]">
                            {loan.interestRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{dict.emi}</p>
                          <p className="font-bold text-lg text-[var(--primary)]">
                            ₹{loan.monthlyEMI.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{dict.tenure}</p>
                          <p className="font-bold text-lg text-[var(--primary)]">
                            {loan.tenure} mo
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{dict.approval}</p>
                          <p className="font-bold text-lg text-[var(--primary)]">
                            {loan.estimatedApprovalTime}d
                          </p>
                        </div>
                      </div>

                      {/* Positive Reasons */}
                      {loan.positiveReasons.length > 0 && (
                        <div className="bg-[var(--bg-glass)] p-3 rounded-md border border-[var(--border)]">
                          <p className="font-semibold text-sm mb-2 text-[var(--primary)]">
                            ✓ Advantages:
                          </p>
                          <ul className="space-y-1">
                            {loan.positiveReasons.map((reason, i) => (
                              <li
                                key={i}
                                className="text-sm text-[var(--text-main)] flex items-start gap-2"
                              >
                                <span className="text-[var(--primary)] mt-0.5">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Financial Summary */}
                      <div className="grid grid-cols-3 gap-2 text-center bg-[var(--bg-glass)] p-2 rounded-md">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Total Interest</p>
                          <p className="font-bold text-[var(--primary)]">
                            ₹{loan.totalInterest.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{dict.dti}</p>
                          <p className="font-bold text-[var(--primary)]">{loan.debtToIncomeRatio}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Total Repay</p>
                          <p className="font-bold text-[var(--primary)]">
                            ₹
                            {(
                              formData.loanAmountNeeded + loan.totalInterest
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Button className="w-full">
                        {dict.apply} → {loan.lender}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-destructive/50 bg-[var(--bg-card)]">
              <CardContent className="pt-6 text-center">
                <p className="text-destructive font-semibold">{dict.no}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
