import { Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export const FestivalPredictor = () => {
  const { language, t } = useLanguage();

  const upcomingFestivals = [
    { 
      name: language === 'hi' ? 'दीवाली' : 'Diwali', 
      daysAway: 45, 
      predictedExpense: 8000 
    },
    { 
      name: language === 'hi' ? 'होली' : 'Holi', 
      daysAway: 120, 
      predictedExpense: 3500 
    },
  ];

  const totalPredicted = upcomingFestivals.reduce((sum, f) => sum + f.predictedExpense, 0);
  const monthlyRequired = Math.ceil(totalPredicted / 4);

  return (
    <Card className="border-none shadow-md bg-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-accent-foreground" />
          {t('festivalExpenses')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingFestivals.map((festival) => (
          <div 
            key={festival.name}
            className="flex items-center justify-between p-3 rounded-lg bg-card"
          >
            <div>
              <p className="font-medium text-foreground">{festival.name}</p>
              <p className="text-xs text-muted-foreground">
                {festival.daysAway} {language === 'hi' ? 'दिन बाकी' : 'days left'}
              </p>
            </div>
            <p className="font-semibold text-foreground">₹{festival.predictedExpense.toLocaleString()}</p>
          </div>
        ))}
        
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{t('savingTip')}:</span>{' '}
            {language === 'hi' 
              ? `हर महीने ₹${monthlyRequired.toLocaleString()} बचाओ त्यौहारों के लिए`
              : `Save ₹${monthlyRequired.toLocaleString()} monthly for festivals`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
