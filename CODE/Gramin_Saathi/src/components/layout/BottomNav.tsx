import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, BookOpen, Gift, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/saathi', icon: MessageCircle, labelKey: 'saathi' },
  { path: '/khata', icon: BookOpen, labelKey: 'khata' },
  { path: '/yojana', icon: Gift, labelKey: 'yojana' },
  { path: '/seekho', icon: GraduationCap, labelKey: 'seekho' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom lg:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors touch-target",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
