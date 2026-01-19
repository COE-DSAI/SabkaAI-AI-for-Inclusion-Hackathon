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
import { CheckCircle2, AlertCircle, Sprout } from 'lucide-react';
import { matchSchemes } from '@/lib/matching_algorithms';

interface SchemeMatch {
  id: string;
  name: string;
  matchScore: number;
  eligible: boolean;
  eligibilityReasons: string[];
  benefit: string | number;
  description: string;
  link: string;
}

export default function SchemeEligibilityAdvisor({ lang = 'en', t = (key: string) => key }: any) {
  const [formData, setFormData] = useState({
    state: 'maharashtra',
    landholding: 2,
    annualIncome: 200000,
    crops: ['rice'],
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

  const cropOptions = [
    'Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Groundnut', 'Maize',
    'Pulses', 'Soybean', 'Sunflower', 'Vegetables', 'Fruits',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const matchedSchemes = matchSchemes({
        state: formData.state.toLowerCase(),
        landholding: formData.landholding,
        annualIncome: formData.annualIncome,
        crops: formData.crops.map((c) => c.toLowerCase()),
      });

      setResults(matchedSchemes);
      setLoading(false);
    }, 500);
  };

  const translations = {
    en: {
      title: '🏛️ Government Schemes Eligibility Checker',
      desc: 'Find out which government schemes you qualify for based on your farm profile',
      state: 'Select State',
      landholding: 'Landholding (hectares)',
      income: 'Annual Income (₹)',
      crops: 'Select Crops',
      check: 'Check Eligibility',
      results: 'Your Scheme Matches',
      match: 'Match Score',
      eligible: 'Eligible',
      notEligible: 'Not Eligible',
      reasons: 'Why You Match',
      benefit: 'Annual Benefit',
      apply: 'Apply Now',
      noMatch: 'No matching schemes found. Try adjusting your profile.',
      estimated: 'Estimated Annual Benefit',
      accuracy: 'Accuracy',
    },
    hi: {
      title: '🏛️ सरकारी योजना पात्रता जांचकर्ता',
      desc: 'अपनी खेत प्रोफाइल के आधार पर जानें कि आप कौन सी सरकारी योजनाओं के लिए पात्र हैं',
      state: 'राज्य चुनें',
      landholding: 'भूमि होल्डिंग (हेक्टेयर)',
      income: 'वार्षिक आय (₹)',
      crops: 'फसलें चुनें',
      check: 'पात्रता जांचें',
      results: 'आपकी योजना मेल',
      match: 'मैच स्कोर',
      eligible: 'पात्र',
      notEligible: 'अपात्र',
      reasons: 'आप क्यों मेल खाते हैं',
      benefit: 'वार्षिक लाभ',
      apply: 'अब आवेदन करें',
      noMatch: 'कोई मेल खाने वाली योजना नहीं। अपनी प्रोफाइल को समायोजित करने का प्रयास करें।',
      estimated: 'अनुमानित वार्षिक लाभ',
      accuracy: 'सटीकता',
    },
  };

  const dict = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-main)]">{dict.title}</h1>
        <p className="text-[var(--text-muted)]">{dict.desc}</p>
      </div>

      {/* Form Card */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)]">
        <CardHeader className="bg-[var(--bg-glass)] border-b border-[var(--border)]">
          <CardTitle className="text-[var(--text-main)]">Farmer Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* State Selection */}
              <div className="space-y-2">
                <Label htmlFor="state" className="text-[var(--text-main)]">
                  {dict.state}
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, state: value })
                  }
                >
                  <SelectTrigger id="state" className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
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
                <Label htmlFor="landholding" className="text-[var(--text-main)]">
                  {dict.landholding}
                </Label>
                <Input
                  id="landholding"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={formData.landholding}
                  onChange={(e) =>
                    setFormData({ ...formData, landholding: parseFloat(e.target.value) })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Annual Income */}
              <div className="space-y-2">
                <Label htmlFor="income" className="text-[var(--text-main)]">
                  {dict.income}
                </Label>
                <Input
                  id="income"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.annualIncome}
                  onChange={(e) =>
                    setFormData({ ...formData, annualIncome: parseInt(e.target.value) })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Crops */}
              <div className="space-y-2">
                <Label htmlFor="crops" className="text-[var(--text-main)]">
                  {dict.crops}
                </Label>
                <Select
                  value={formData.crops[0]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, crops: [value] })
                  }
                >
                  <SelectTrigger id="crops" className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cropOptions.map((crop) => (
                      <SelectItem key={crop} value={crop.toLowerCase()}>
                        {crop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base"
            >
              {loading ? 'Checking...' : dict.check}
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    {results.totalMatches}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.results}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    ₹{results.estimatedAnnualBenefit.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.estimated}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    {results.accuracy}%
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.accuracy}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheme Results */}
          {results.schemes.length > 0 ? (
            <div className="space-y-3">
              {results.schemes.map((scheme: SchemeMatch, idx: number) => (
                <Card key={scheme.id} className="border-l-4 border-l-[var(--primary)] hover:shadow-md transition-shadow bg-[var(--bg-card)]">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-5 h-5 text-[var(--primary)]" />
                            <h3 className="font-bold text-lg text-[var(--text-main)]">{scheme.name}</h3>
                          </div>
                          <p className="text-sm text-[var(--text-muted)] mb-3">
                            {scheme.description}
                          </p>

                          {/* Eligibility Score */}
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-[var(--text-main)]">{dict.match}: {scheme.matchScore}%</span>
                            </div>
                            <div className="w-full bg-[var(--bg-input)] rounded-full h-2">
                              <div
                                className="bg-[var(--primary)] h-2 rounded-full transition-all"
                                style={{ width: `${scheme.matchScore}%` }}
                              />
                            </div>
                          </div>

                          {/* Reasons */}
                          <div className="bg-[var(--bg-glass)] p-3 rounded-md mb-3">
                            <p className="font-semibold text-sm mb-2 text-[var(--text-main)]">{dict.reasons}:</p>
                            <ul className="space-y-1">
                              {scheme.eligibilityReasons.map((reason, i) => (
                                <li key={i} className="text-sm text-[var(--text-main)] flex items-start gap-2">
                                  <span className="text-[var(--primary)] mt-0.5">✓</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Benefit */}
                          <div className="text-base font-semibold text-[var(--primary)] mb-3">
                            {dict.benefit}: ₹{scheme.benefit}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() =>
                          window.open(
                            `https://${scheme.link}`,
                            '_blank'
                          )
                        }
                        className="w-full"
                      >
                        {dict.apply}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-destructive/50">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <p className="text-destructive font-semibold">{dict.noMatch}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
