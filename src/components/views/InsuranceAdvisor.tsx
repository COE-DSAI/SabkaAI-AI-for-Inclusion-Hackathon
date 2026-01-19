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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { predictInsuranceNeeds } from '@/lib/matching_algorithms';

export default function InsuranceAdvisor({ lang = 'en', t = (key: string) => key }: any) {
  const [formData, setFormData] = useState({
    state: 'maharashtra',
    district: 'pune',
    crops: ['rice'],
    landholding: 2,
    hasLivestock: false,
    livestockCount: 0,
    lastYearLosses: 0,
    irrigationType: 'canal',
  });

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const states: { [key: string]: string[] } = {
    maharashtra: ['Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
    rajasthan: ['Jodhpur', 'Bikaner', 'Jaisalmer', 'Barmer', 'Nagaur'],
    tamil_nadu: ['Coimbatore', 'Salem', 'Tiruppur', 'Erode', 'Dindigul'],
    punjab: ['Sangrur', 'Ludhiana', 'Patiala', 'Jalandhar', 'Moga'],
    karnataka: ['Bangalore', 'Mysore', 'Belgaum', 'Bijapur', 'Gulbarga'],
    odisha: ['Cuttack', 'Balangir', 'Sambalpur', 'Puri', 'Berhampur'],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const prediction = predictInsuranceNeeds({
        state: formData.state,
        district: formData.district,
        crops: formData.crops.map((c) => c.toLowerCase()),
        landholding: formData.landholding,
        hasLivestock: formData.hasLivestock,
        livestockCount: formData.hasLivestock ? formData.livestockCount : 0,
        lastYearLosses: formData.lastYearLosses,
        irrigationType: formData.irrigationType,
      });

      setResults(prediction);
      setLoading(false);
    }, 500);
  };

  const translations = {
    en: {
      title: '🛡️ Crop Insurance Needs Advisor',
      desc: 'Get personalized insurance recommendations based on your farm risk profile',
      state: 'Select State',
      district: 'Select District',
      crops: 'Select Primary Crop',
      landholding: 'Landholding (hectares)',
      livestock: 'Do you have livestock?',
      livestockCount: 'Number of livestock',
      losses: 'Last year crop loss (%)',
      irrigation: 'Irrigation Type',
      analyze: 'Analyze Risk & Recommend',
      riskScore: 'Overall Risk Score',
      riskLevel: 'Risk Level',
      premium: 'Estimated Annual Premium',
      recommendations: 'Insurance Recommendations',
      accuracy: 'Prediction Accuracy',
      high: 'HIGH RISK',
      medium: 'MEDIUM RISK',
      low: 'LOW RISK',
      products: 'Recommended Products',
      coverage: 'Coverage',
      learn: 'Learn More',
    },
    hi: {
      title: '🛡️ फसल बीमा सलाह सलाहकार',
      desc: 'अपनी खेत जोखिम प्रोफाइल के आधार पर व्यक्तिगत बीमा सिफारिशें प्राप्त करें',
      state: 'राज्य चुनें',
      district: 'जिला चुनें',
      crops: 'प्राथमिक फसल चुनें',
      landholding: 'भूमि होल्डिंग (हेक्टेयर)',
      livestock: 'क्या आपके पास पशुधन है?',
      livestockCount: 'पशुधन की संख्या',
      losses: 'पिछले साल की फसल हानि (%)',
      irrigation: 'सिंचाई का प्रकार',
      analyze: 'जोखिम का विश्लेषण करें और सुझाव दें',
      riskScore: 'समग्र जोखिम स्कोर',
      riskLevel: 'जोखिम स्तर',
      premium: 'अनुमानित वार्षिक प्रीमियम',
      recommendations: 'बीमा सिफारिशें',
      accuracy: 'भविष्यवाणी सटीकता',
      high: 'उच्च जोखिम',
      medium: 'मध्यम जोखिम',
      low: 'कम जोखिम',
      products: 'अनुशंसित उत्पाद',
      coverage: 'कवरेज',
      learn: 'और जानें',
    },
  };

  const dict = translations[lang as keyof typeof translations] || translations.en;

  const districts =
    states[formData.state.toLowerCase()] || states['maharashtra'];

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
                    setFormData({
                      ...formData,
                      state: value,
                      district: states[value]?.[0]?.toLowerCase() || '',
                    })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(states).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state.charAt(0).toUpperCase() + state.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.district}</Label>
                <Select
                  value={formData.district}
                  onValueChange={(value) =>
                    setFormData({ ...formData, district: value })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem
                        key={district}
                        value={district.toLowerCase()}
                      >
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Crops */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.crops}</Label>
                <Select
                  value={formData.crops[0]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, crops: [value] })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Groundnut', 'Maize'].map((crop) => (
                      <SelectItem key={crop} value={crop.toLowerCase()}>
                        {crop}
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

              {/* Last Year Losses */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.losses}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.lastYearLosses}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastYearLosses: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>

              {/* Irrigation */}
              <div className="space-y-2">
                <Label className="text-[var(--text-main)]">{dict.irrigation}</Label>
                <Select
                  value={formData.irrigationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, irrigationType: value })
                  }
                >
                  <SelectTrigger className="h-10 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Canal', 'Tubewell', 'Drip', 'Sprinkler', 'Rainfed'].map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Livestock */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="livestock"
                  checked={formData.hasLivestock}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hasLivestock: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="livestock" className="text-[var(--text-main)] cursor-pointer">
                  {dict.livestock}
                </Label>
              </div>

              {formData.hasLivestock && (
                <div className="pl-6">
                  <Label className="text-[var(--text-main)]">{dict.livestockCount}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.livestockCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        livestockCount: parseInt(e.target.value) || 0,
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
              {loading ? 'Analyzing...' : dict.analyze}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* Risk Summary Card */}
          <Card className="bg-[var(--bg-card)] border border-[var(--border)]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    {results.overallRiskScore.toFixed(1)}%
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.riskScore}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {results.riskLevel}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.riskLevel}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--primary)]">
                    ₹{results.estimatedPremiumCost.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{dict.premium}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <div className="space-y-3">
            {results.recommendations.map(
              (
                rec: { type: string; reason: string; products: any[] },
                idx: number
              ) => (
                <Card key={idx} className="border-l-4 border-l-[var(--primary)] bg-[var(--bg-card)]">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-[var(--primary)] mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-bold text-lg capitalize text-[var(--text-main)]">
                            {rec.type.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)]">{rec.reason}</p>
                        </div>
                      </div>

                      {/* Products */}
                      {rec.products.length > 0 && (
                        <div className="bg-[var(--bg-glass)] p-3 rounded-md space-y-2">
                          {rec.products.slice(0, 2).map((product, pidx) => (
                            <div key={pidx} className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-sm text-[var(--text-main)]">{product.name}</p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {dict.coverage}: {product.coverage}%
                                </p>
                              </div>
                              <p className="text-sm font-bold text-[var(--primary)]">
                                ₹{Math.round(
                                  (product.premiumPercent * formData.landholding * 50000) / 100
                                )}
                                /year
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Accuracy */}
          <Card className="bg-[var(--bg-glass)] border border-[var(--border)]">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[var(--primary)]" />
              <p className="text-[var(--text-main)] font-semibold">
                {dict.accuracy}: {results.accuracy}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
