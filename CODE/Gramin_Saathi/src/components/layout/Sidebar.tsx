import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, BookOpen, Gift, GraduationCap, User, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/saathi', icon: MessageCircle, labelKey: 'saathi' },
  { path: '/khata', icon: BookOpen, labelKey: 'khata' },
  { path: '/yojana', icon: Gift, labelKey: 'yojana' },
  { path: '/seekho', icon: GraduationCap, labelKey: 'seekho' },
  { path: '/identity', icon: User, labelKey: 'identity' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">ग्रा</span>
          </div>
          <span className="font-serif font-bold text-xl text-foreground">{t('appName')}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Link 
          to="/?tour=true" 
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">{t('help') || 'Help & Tour'}</span>
        </Link>
        <p className="text-xs text-muted-foreground text-center pt-2">
          Gramin Saathi v2.0
        </p>
      </div>
    </aside>
  );
};
