import { Link } from 'react-router-dom';
import { MessageCircle, PlusCircle, Gift, BookOpen, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export const QuickActions = () => {
  const { language } = useLanguage();

  const actions = [
    { 
      icon: Mic, 
      label: language === 'hi' ? 'बोलो' : 'Speak',
      path: '/saathi',
      color: 'bg-primary text-primary-foreground',
      large: true
    },
    { 
      icon: PlusCircle, 
      label: language === 'hi' ? 'खर्च जोड़ो' : 'Add Expense',
      path: '/khata',
      color: 'bg-card text-foreground border border-border'
    },
    { 
      icon: Gift, 
      label: language === 'hi' ? 'योजना देखो' : 'View Schemes',
      path: '/yojana',
      color: 'bg-card text-foreground border border-border'
    },
    { 
      icon: BookOpen, 
      label: language === 'hi' ? 'सीखो' : 'Learn',
      path: '/seekho',
      color: 'bg-card text-foreground border border-border'
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground px-1">
        {language === 'hi' ? 'क्या करना है?' : 'What to do?'}
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {actions.map(({ icon: Icon, label, path, color, large }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all active:scale-95 touch-target hover:shadow-md",
              color,
              large && "col-span-4 lg:col-span-4 flex-row py-5 shadow-lg"
            )}
          >
            <Icon className={cn("w-6 h-6", large && "w-8 h-8")} />
            <span className={cn("text-sm font-medium text-center", large && "text-lg")}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
