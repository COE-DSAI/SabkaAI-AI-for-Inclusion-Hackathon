import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, Star, ChevronRight, Filter, 
  CheckCircle2, Clock, AlertCircle, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Scheme {
  id: number;
  name: string;
  benefit: string;
  description: string;
  status: 'eligible' | 'applied' | 'active';
  matchScore: number;
  deadline?: string;
  category: string;
}

const schemes: Scheme[] = [
  {
    id: 1,
    name: 'PM किसान सम्मान निधि',
    benefit: '₹6,000/साल',
    description: 'किसानों को सीधे खाते में ₹2,000 की 3 किस्तें',
    status: 'active',
    matchScore: 95,
    category: 'किसान',
  },
  {
    id: 2,
    name: 'फसल बीमा योजना',
    benefit: 'फसल सुरक्षा',
    description: 'प्राकृतिक आपदा से फसल नुकसान पर मुआवजा',
    status: 'eligible',
    matchScore: 92,
    deadline: '15 जनवरी 2025',
    category: 'बीमा',
  },
  {
    id: 3,
    name: 'किसान क्रेडिट कार्ड',
    benefit: '4% ब्याज पर लोन',
    description: '₹3 लाख तक का आसान लोन कम ब्याज पर',
    status: 'eligible',
    matchScore: 88,
    category: 'लोन',
  },
  {
    id: 4,
    name: 'मनरेगा',
    benefit: '100 दिन रोजगार',
    description: 'गारंटी रोजगार योजना ₹300/दिन',
    status: 'applied',
    matchScore: 85,
    category: 'रोजगार',
  },
  {
    id: 5,
    name: 'आयुष्मान भारत',
    benefit: '₹5 लाख बीमा',
    description: 'परिवार के लिए मुफ्त स्वास्थ्य बीमा',
    status: 'active',
    matchScore: 90,
    category: 'स्वास्थ्य',
  },
];

const statusConfig = {
  eligible: { label: 'पात्र', icon: Star, color: 'bg-accent text-accent-foreground' },
  applied: { label: 'आवेदन किया', icon: Clock, color: 'bg-secondary text-secondary-foreground' },
  active: { label: 'सक्रिय', icon: CheckCircle2, color: 'bg-primary text-primary-foreground' },
};

const Yojana = () => {
  return (
    <AppLayout>
      <div className="container px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">सरकारी योजनाएं</h1>
          <p className="text-sm text-muted-foreground">आपके लिए {schemes.length} योजनाएं उपलब्ध</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="योजना खोजें..." className="pl-10" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Active Schemes */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            आपकी सक्रिय योजनाएं
          </h2>
          {schemes.filter(s => s.status === 'active').map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>

        {/* New Schemes */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-accent-foreground" />
            नई पात्र योजनाएं
          </h2>
          {schemes.filter(s => s.status === 'eligible').map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>

        {/* Applied Schemes */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            आवेदन की स्थिति
          </h2>
          {schemes.filter(s => s.status === 'applied').map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

const SchemeCard = ({ scheme }: { scheme: Scheme }) => {
  const status = statusConfig[scheme.status];
  const StatusIcon = status.icon;

  return (
    <Link to={`/yojana/${scheme.id}`}>
      <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground">{scheme.name}</h3>
                <Badge className={cn("text-xs", status.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-lg font-semibold text-primary">{scheme.benefit}</p>
              <p className="text-sm text-muted-foreground">{scheme.description}</p>
              {scheme.deadline && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  अंतिम तिथि: {scheme.deadline}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-xs">
                {scheme.matchScore}% मैच
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Yojana;
