import { AppLayout } from '@/components/layout/AppLayout';
import { CashHealthMeter } from '@/components/home/CashHealthMeter';
import { QuickActions } from '@/components/home/QuickActions';
import { FestivalPredictor } from '@/components/home/FestivalPredictor';
import { SchemeSuggestions } from '@/components/home/SchemeSuggestions';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="container px-4 py-6 space-y-6 lg:max-w-6xl">
        {/* Greeting */}
        <div className="space-y-1">
          <p className="text-muted-foreground">{t('namaste')}</p>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
            {t('goodMorning')}
          </h1>
        </div>

        {/* Desktop: 2-column layout, Mobile: single column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Cash Health Meter */}
            <CashHealthMeter />

            {/* Quick Actions */}
            <QuickActions />
          </div>

          <div className="space-y-6">
            {/* Festival Expense Predictor */}
            <FestivalPredictor />

            {/* Scheme Suggestions */}
            <SchemeSuggestions />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
