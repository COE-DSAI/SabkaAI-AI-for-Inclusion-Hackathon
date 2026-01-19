import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  MapPin, 
  AlertTriangle,
  Sun,
  Zap
} from 'lucide-react';
import { Skeleton } from '../custom-ui/Skeletons';

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const BentoCard = ({ children, className = "", onClick }: any) => (
  <div 
    onClick={onClick}
    className={`glass rounded-xl md:rounded-3xl p-3 md:p-6 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-t border-white/10
    ${className}`}
  >
    {children}
  </div>
);

export function WeatherWidget({ lang, setView }: { lang: string, setView: (view: string) => void }) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.cod === 200) {
              setWeather(data);
            } else {
              setError('Failed to fetch weather');
            }
            setLoading(false);
          },
          (err) => {
            console.error('Location error:', err);
            // Fallback to Delhi coordinates
            fetchWeatherByCity('Delhi');
          }
        );
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather');
        setLoading(false);
      }
    };

    const fetchWeatherByCity = async (city: string) => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},IN&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod === 200) {
          setWeather(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <BentoCard className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 h-full">
        <div className="animate-pulse space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
      </BentoCard>
    );
  }

  if (error || !weather) {
    return null;
  }

  const getWeatherIcon = (code: number) => {
    if (code >= 200 && code < 300) return '⛈️';
    if (code >= 300 && code < 400) return '🌦️';
    if (code >= 500 && code < 600) return '🌧️';
    if (code >= 600 && code < 700) return '❄️';
    if (code >= 700 && code < 800) return '🌫️';
    if (code === 800) return '☀️';
    if (code > 800) return '☁️';
    return '🌤️';
  };

  const weatherCode = weather.weather[0]?.id || 800;
  const isRainy = weatherCode >= 500 && weatherCode < 600;

  return (
    <BentoCard onClick={() => setView('mausam')} className={`cursor-pointer group hover:border-blue-500/50 transition-all bg-gradient-to-br ${isRainy ? 'from-blue-500/10 to-indigo-500/10 border-blue-500/20' : 'from-amber-500/10 to-orange-500/10 border-amber-500/20'} border !p-3 md:!p-4 h-full`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] font-medium mb-0.5">{lang === 'en' ? 'Weather' : 'मौसम'}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl md:text-3xl">{getWeatherIcon(weatherCode)}</span>
            <div>
              <p className="text-xl md:text-2xl font-bold text-[var(--text-main)]">{Math.round(weather.main.temp)}°C</p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize">{weather.weather[0]?.description}</p>
            </div>
          </div>
        </div>
        <MapPin size={12} className="text-[var(--primary)]" />
      </div>
      
      <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-[var(--border)]">
        <div className="text-center">
          <p className="text-[9px] text-[var(--text-muted)]">{lang === 'en' ? 'Humidity' : 'नमी'}</p>
          <p className="text-xs font-bold text-[var(--primary)]">{weather.main.humidity}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-[var(--text-muted)]">{lang === 'en' ? 'Wind' : 'हवा'}</p>
          <p className="text-xs font-bold text-[var(--primary)]">{Math.round(weather.wind.speed * 3.6)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-[var(--text-muted)]">{lang === 'en' ? 'Feels' : 'महसूस'}</p>
          <p className="text-xs font-bold text-[var(--primary)]">{Math.round(weather.main.feels_like)}°</p>
        </div>
      </div>
      
      {isRainy && (
        <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
            <AlertTriangle size={12} />
            {lang === 'en' ? 'Rain expected' : 'बारिश की संभावना'}
          </p>
        </div>
      )}
    </BentoCard>
  );
}
