import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, MapPin, Briefcase, Phone, Calendar, 
  Wheat, Wallet, Award, ChevronRight, Trophy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/mockFirebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

const Identity = () => {
  const [badges, setBadges] = useState<any[]>([]);
  
  // Load badges from Firebase
  useEffect(() => {
    const loadBadges = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const badgesRef = collection(db, `users/${user.uid}/badges`);
        const unsubscribe = onSnapshot(badgesRef, (snapshot) => {
          const badgesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setBadges(badgesData);
          // Also save to localStorage as backup
          localStorage.setItem(`badges_${user.uid}`, JSON.stringify(badgesData));
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading badges:', error);
        // Try loading from localStorage
        const stored = localStorage.getItem(`badges_${user.uid}`);
        if (stored) {
          setBadges(JSON.parse(stored));
        }
      }
    };

    loadBadges();
  }, []);
  
  const user = {
    name: 'राम प्रसाद शर्मा',
    village: 'बड़ागांव, जिला वाराणसी',
    age: 45,
    phone: '+91 98765 43210',
    occupation: 'किसान',
    crops: ['गेहूं', 'धान', 'आलू'],
    monthlyIncome: 15000,
    healthScore: 72,
    schemesActive: 3,
    language: 'हिंदी',
  };

  return (
    <AppLayout>
      <div className="container px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary">
            <User className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{user.name}</h1>
            <p className="text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {user.village}
            </p>
          </div>
        </div>

        {/* Financial Identity Card */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-primary" />
              आर्थिक पहचान पत्र
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold text-primary">{user.healthScore}%</p>
                <p className="text-xs text-muted-foreground">स्वास्थ्य स्कोर</p>
              </div>
              <div className="p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold text-primary">{user.schemesActive}</p>
                <p className="text-xs text-muted-foreground">सक्रिय योजनाएं</p>
              </div>
              <div className="p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold text-primary">₹{(user.monthlyIncome/1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">मासिक आय</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        {badges.length > 0 && (
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-amber-600" />
                आपके बैज ({badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center p-3 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
                    <span className="text-4xl mb-2">{badge.icon}</span>
                    <span className="font-bold text-xs text-center text-foreground">{badge.name}</span>
                    <span className="text-[10px] text-center text-muted-foreground mt-1">{badge.description}</span>
                    {badge.earnedAt && (
                      <span className="text-[9px] text-muted-foreground mt-1">
                        {new Date(badge.earnedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4 space-y-4">
            <InfoRow icon={Briefcase} label="पेशा" value={user.occupation} />
            <InfoRow icon={Phone} label="फोन" value={user.phone} />
            <InfoRow icon={Calendar} label="उम्र" value={`${user.age} वर्ष`} />
            <div className="flex items-start gap-3 py-2">
              <Wheat className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">फसलें</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.crops.map((crop) => (
                    <Badge key={crop} variant="secondary">{crop}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-between" size="lg">
            प्रोफाइल बदलें
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between" size="lg">
            भाषा बदलें ({user.language})
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

const InfoRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
}) => (
  <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
    <Icon className="w-5 h-5 text-muted-foreground" />
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default Identity;
