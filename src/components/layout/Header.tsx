import { Sun, Moon, Bell, User, Languages } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">ग्रा</span>
          </div>
          <span className="font-serif font-bold text-lg text-foreground">{t('appName')}</span>
        </Link>

        {/* Desktop breadcrumb area */}
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold text-foreground">{t('home')}</h2>
        </div>

        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleLanguage}
            className="text-foreground hover:bg-accent gap-1 px-2"
          >
            <Languages className="w-4 h-4" />
            <span className="text-xs font-medium">{language === 'hi' ? 'EN' : 'हि'}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-foreground hover:bg-accent"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent">
            <Bell className="w-5 h-5" />
          </Button>
          <Link to="/identity" className="hidden lg:block">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent">
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
