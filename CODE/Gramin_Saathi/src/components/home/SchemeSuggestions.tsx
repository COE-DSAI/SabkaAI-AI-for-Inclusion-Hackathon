import { Gift, ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export const SchemeSuggestions = () => {
  const { language, t } = useLanguage();

  const schemes = [
    {
      id: 1,
      name: language === 'hi' ? 'PM किसान सम्मान निधि' : 'PM Kisan Samman Nidhi',
      benefit: language === 'hi' ? '₹6,000/साल' : '₹6,000/year',
      eligibility: language === 'hi' ? 'आपके लिए उपलब्ध' : 'Available for you',
      matchScore: 95,
    },
    {
      id: 2,
      name: language === 'hi' ? 'फसल बीमा योजना' : 'Crop Insurance Scheme',
      benefit: language === 'hi' ? 'फसल सुरक्षा' : 'Crop Protection',
      eligibility: language === 'hi' ? 'रबी सीजन के लिए' : 'For Rabi season',
      matchScore: 88,
    },
  ];

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            {t('schemesForYou')}
          </CardTitle>
          <Link 
            to="/yojana" 
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            {language === 'hi' ? 'सभी देखें' : 'View All'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {schemes.map((scheme) => (
          <Link
            key={scheme.id}
            to={`/yojana/${scheme.id}`}
            className="block p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">{scheme.name}</h3>
                <p className="text-sm text-primary font-semibold">{scheme.benefit}</p>
                <p className="text-xs text-muted-foreground">{scheme.eligibility}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-accent text-accent-foreground">
                <Star className="w-3 h-3 mr-1" />
                {scheme.matchScore}%
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
