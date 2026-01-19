import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Gauge, 
  Sunrise, 
  Sunset, 
  MapPin, 
  AlertTriangle, 
  CalendarDays, 
  Share2, 
  Eye, 
  Sprout 
} from 'lucide-react';
import { Skeleton } from '../custom-ui/Skeletons';

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export function WeatherView({ t, lang, setView, profile }: any) {
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeatherData = async (retry = 0) => {
      try {
        // Check cache first (5 min expiry)
        const cached = localStorage.getItem('weather_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setWeather(data.weather);
            setForecast(data.forecast);
            setLocation(data.location);
            setLoading(false);
            checkWeatherAlerts(data.weather);
            loadWeatherHistory();
            return;
          }
        }

        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lon: longitude });
            
            try {
              // Fetch current weather
              const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
              const weatherRes = await fetch(weatherUrl);
              const weatherData = await weatherRes.json();
              
              // Fetch 5-day forecast
              const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
              const forecastRes = await fetch(forecastUrl);
              const forecastData = await forecastRes.json();
              
              if (weatherData.cod === 200) {
                setWeather(weatherData);
                checkWeatherAlerts(weatherData);
                saveWeatherHistory(weatherData);
                
                // Cache the data
                localStorage.setItem('weather_cache', JSON.stringify({
                  data: {
                    weather: weatherData,
                    forecast: forecastData.cod === '200' ? forecastData.list.filter((_: any, idx: number) => idx % 8 === 0).slice(0, 5) : [],
                    location: { lat: latitude, lon: longitude }
                  },
                  timestamp: Date.now()
                }));
              } else if (retry < 2) {
                // Retry on failure
                setTimeout(() => {
                  setRetryCount(retry + 1);
                  fetchWeatherData(retry + 1);
                }, 2000);
                return;
              } else {
                setError('Failed to fetch weather. Invalid API key or service unavailable.');
              }
              
              if (forecastData.cod === '200') {
                const dailyForecast = forecastData.list.filter((_: any, idx: number) => idx % 8 === 0).slice(0, 5);
                setForecast(dailyForecast);
              }
              
              loadWeatherHistory();
              setLoading(false);
            } catch (fetchErr) {
              if (retry < 2) {
                setTimeout(() => {
                  setRetryCount(retry + 1);
                  fetchWeatherData(retry + 1);
                }, 2000);
              } else {
                throw fetchErr;
              }
            }
          },
          (err) => {
            console.error('Location error:', err);
            setError('Please enable location access for weather data');
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather data. Please check your API key.');
        setLoading(false);
      }
    };

    const checkWeatherAlerts = (weatherData: any) => {
      const newAlerts = [];
      const temp = weatherData.main.temp;
      const weatherCode = weatherData.weather[0]?.id || 800;
      const windSpeed = weatherData.wind.speed * 3.6;
      
      // Severe weather alerts
      if (weatherCode >= 200 && weatherCode < 300) {
        newAlerts.push({ type: 'danger', message: lang === 'en' ? 'Thunderstorm Warning - Stay Indoors!' : 'गरज चेतावनी - घर के अंदर रहें!' });
      }
      if (temp > 40) {
        newAlerts.push({ type: 'warning', message: lang === 'en' ? 'Extreme Heat - Avoid outdoor work 11am-4pm' : 'अत्यधिक गर्मी - 11am-4pm बाहर काम न करें' });
      }
      if (temp < 5) {
        newAlerts.push({ type: 'warning', message: lang === 'en' ? 'Frost Warning - Protect sensitive crops' : 'पाला चेतावनी - संवेदनशील फसलों की रक्षा करें' });
      }
      if (windSpeed > 40) {
        newAlerts.push({ type: 'warning', message: lang === 'en' ? 'High Wind Alert - Secure equipment' : 'तेज हवा चेतावनी - उपकरण सुरक्षित करें' });
      }
      if (weatherCode >= 500 && weatherCode < 600) {
        newAlerts.push({ type: 'info', message: lang === 'en' ? 'Good day to skip irrigation' : 'सिंचाई छोड़ने के लिए अच्छा दिन' });
      } else if (weatherCode === 800 && temp < 35) {
        newAlerts.push({ type: 'success', message: lang === 'en' ? 'Perfect weather for spraying pesticides' : 'कीटनाशक छिड़काव के लिए बेहतरीन मौसम' });
      }
      
      setAlerts(newAlerts);
    };

    const saveWeatherHistory = (weatherData: any) => {
      const history = JSON.parse(localStorage.getItem('weather_history') || '[]');
      const today = new Date().toDateString();
      
      // Don't save duplicate for same day
      if (history.length > 0 && new Date(history[history.length - 1].date).toDateString() === today) {
        return;
      }
      
      history.push({
        date: new Date().toISOString(),
        temp: weatherData.main.temp,
        condition: weatherData.weather[0]?.main,
        humidity: weatherData.main.humidity,
        rainfall: weatherData.rain?.['1h'] || 0
      });
      
      // Keep only last 7 days
      if (history.length > 7) history.shift();
      localStorage.setItem('weather_history', JSON.stringify(history));
    };

    const loadWeatherHistory = () => {
      const history = JSON.parse(localStorage.getItem('weather_history') || '[]');
      setWeatherHistory(history);
    };

    fetchWeatherData();
  }, [lang]);

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

  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-700 p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-700 p-6">
        <div className="text-center py-20">
          <AlertTriangle size={64} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{lang === 'en' ? 'Weather Data Unavailable' : 'मौसम डेटा उपलब्ध नहीं'}</h2>
          <p className="text-[var(--text-muted)] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {lang === 'en' ? 'Retry' : 'पुनः प्रयास करें'}
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const weatherCode = weather.weather[0]?.id || 800;
  const isRainy = weatherCode >= 500 && weatherCode < 600;
  const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full md:max-w-7xl md:mx-auto animate-in fade-in duration-700 space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-[var(--text-main)] mb-1">
            {lang === 'en' ? 'Weather' : 'मौसम'}
          </h1>
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-[var(--text-muted)]">
            <MapPin size={14} />
            <span>{weather.name}, {weather.sys.country}</span>
          </div>
        </div>
        <button
          onClick={() => {
            const text = `Weather in ${weather.name}: ${Math.round(weather.main.temp)}°C, ${weather.weather[0]?.description}. Humidity: ${weather.main.humidity}%, Wind: ${weather.wind.speed} m/s`;
            if ((window as any).shareContent) {
              (window as any).shareContent('Weather Update', text, window.location.href);
            }
          }}
          className="p-2 md:p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors"
          title={lang === 'en' ? 'Share Weather' : 'मौसम शेयर करें'}
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className={`relative overflow-hidden rounded-2xl md:rounded-3xl p-4 md:p-8 bg-gradient-to-br ${isRainy ? 'from-blue-500 via-blue-600 to-indigo-600' : 'from-orange-400 via-amber-500 to-yellow-500'} text-white shadow-xl md:shadow-2xl`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div className="flex items-center gap-3 md:gap-6">
              <span className="text-5xl md:text-8xl">{getWeatherIcon(weatherCode)}</span>
              <div>
                <p className="text-4xl md:text-7xl font-bold tracking-tight">{Math.round(weather.main.temp)}°</p>
                <p className="text-sm md:text-xl mt-1 md:mt-2 capitalize opacity-90">{weather.weather[0]?.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75 mb-0.5">{lang === 'en' ? 'Feels like' : 'महसूस'}</p>
              <p className="text-xl md:text-3xl font-bold">{Math.round(weather.main.feels_like)}°</p>
            </div>
          </div>

          {isRainy && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/30">
              <div className="flex items-center gap-2 md:gap-3">
                <AlertTriangle size={20} />
                <div>
                  <p className="font-bold text-sm md:text-base">{lang === 'en' ? 'Rain Expected' : 'बारिश की संभावना'}</p>
                  <p className="text-xs md:text-sm opacity-90">{lang === 'en' ? 'Plan accordingly' : 'योजना बनाएं'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1 md:mb-2 text-[var(--text-muted)]">
            <Droplets size={14} />
            <span className="text-xs font-medium">{lang === 'en' ? 'Humidity' : 'नमी'}</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-[var(--text-main)]">{weather.main.humidity}%</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1 md:mb-2 text-[var(--text-muted)]">
            <Wind size={14} />
            <span className="text-xs font-medium">{lang === 'en' ? 'Wind' : 'हवा'}</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-[var(--text-main)]">{Math.round(weather.wind.speed * 3.6)}</p>
          <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5">km/h {getWindDirection(weather.wind.deg)}</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1 md:mb-2 text-[var(--text-muted)]">
            <Gauge size={14} />
            <span className="text-xs font-medium">{lang === 'en' ? 'Pressure' : 'दबाव'}</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-[var(--text-main)]">{weather.main.pressure}</p>
          <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5">hPa</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-1 md:mb-2 text-[var(--text-muted)]">
            <Eye size={14} />
            <span className="text-xs font-medium">{lang === 'en' ? 'Visibility' : 'दृश्यता'}</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-[var(--text-main)]">{(weather.visibility / 1000).toFixed(1)}</p>
          <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5">km</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-3 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-orange-500/20">
              <Sunrise size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] font-medium">{lang === 'en' ? 'Sunrise' : 'सूर्योदय'}</p>
              <p className="text-lg md:text-2xl font-bold text-[var(--text-main)]">{sunrise}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-indigo-500/20">
              <Sunset size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] font-medium">{lang === 'en' ? 'Sunset' : 'सूर्यास्त'}</p>
              <p className="text-lg md:text-2xl font-bold text-[var(--text-main)]">{sunset}</p>
            </div>
          </div>
        </div>
      </div>

      {forecast.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl md:rounded-2xl p-3 md:p-6">
          <h2 className="text-base md:text-xl font-bold text-[var(--text-main)] mb-3">
            {lang === 'en' ? '5-Day Forecast' : '5-दिन का पूर्वानुमान'}
          </h2>
          <div className="grid grid-cols-5 gap-1.5 md:gap-4">
            {forecast.map((day, idx) => {
              const date = new Date(day.dt * 1000);
              const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
              const dayCode = day.weather[0]?.id || 800;
              
              return (
                <div key={idx} className="text-center p-1.5 md:p-4 rounded-lg md:rounded-xl bg-[var(--bg-glass)] border border-[var(--border)]">
                  <p className="text-[10px] md:text-sm font-bold text-[var(--text-main)] mb-1">{dayName}</p>
                  <span className="text-xl md:text-4xl mb-1 block">{getWeatherIcon(dayCode)}</span>
                  <p className="text-sm md:text-xl font-bold text-[var(--text-main)]">{Math.round(day.main.temp)}°</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`rounded-xl p-4 border ${
              alert.type === 'danger' ? 'bg-red-500/10 border-red-500/30' :
              alert.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
              alert.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
              'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className={`${
                  alert.type === 'danger' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-orange-500' :
                  alert.type === 'success' ? 'text-green-500' :
                  'text-blue-500'
                }`} />
                <p className="text-sm font-bold text-[var(--text-main)]">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {profile?.crop && (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl md:rounded-2xl p-3 md:p-6">
          <div className="flex items-start gap-2 md:gap-4">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-purple-500/20">
              <Sprout size={18} className="text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-lg font-bold text-[var(--text-main)] mb-1.5">
                {lang === 'en' ? `Tips for ${profile.crop}` : `${profile.crop} टिप्स`}
              </h3>
              <ul className="space-y-1 text-xs text-[var(--text-muted)]">
                {(() => {
                  const crop = profile.crop?.toLowerCase();
                  const temp = weather.main.temp;
                  const tips = [];
                  
                  if (crop?.includes('wheat') || crop?.includes('गेहूं')) {
                    if (temp > 30) tips.push(lang === 'en' ? '• High temp may reduce grain filling - ensure adequate irrigation' : '• उच्च तापमान दाने भरने को कम कर सकता है - पर्याप्त सिंचाई सुनिश्चित करें');
                    else if (isRainy) tips.push(lang === 'en' ? '• Rain during harvest can damage grain - plan accordingly' : '• कटाई के दौरान बारिश अनाज को नुकसान पहुंचा सकती है');
                    else tips.push(lang === 'en' ? '• Good conditions for wheat growth' : '• गेहूं की वृद्धि के लिए अच्छी परिस्थितियां');
                  } else if (crop?.includes('rice') || crop?.includes('धान')) {
                    if (isRainy) tips.push(lang === 'en' ? '• Excellent for rice - maintain water level in fields' : '• धान के लिए उत्तम - खेतों में जल स्तर बनाए रखें');
                    else if (temp > 35) tips.push(lang === 'en' ? '• High temp - increase water depth to 10-15cm' : '• उच्च तापमान - पानी की गहराई 10-15 सेमी बढ़ाएं');
                    else tips.push(lang === 'en' ? '• Monitor water levels regularly' : '• नियमित रूप से जल स्तर की निगरानी करें');
                  } else if (crop?.includes('cotton') || crop?.includes('कपास')) {
                    if (temp > 35) tips.push(lang === 'en' ? '• Hot weather accelerates boll development' : '• गर्म मौसम कपास के विकास को तेज करता है');
                    if (isRainy) tips.push(lang === 'en' ? '• Excess rain may cause boll rot - ensure drainage' : '• अधिक बारिश से कपास सड़ सकती है');
                  } else if (crop?.includes('sugarcane') || crop?.includes('गन्ना')) {
                    if (temp > 32) tips.push(lang === 'en' ? '• Ideal temperature for cane growth' : '• गन्ने की वृद्धि के लिए आदर्श तापमान');
                    if (weather.main.humidity > 70) tips.push(lang === 'en' ? '• High humidity - watch for red rot disease' : '• उच्च आर्द्रता - लाल सड़ांध रोग से सावधान');
                  }
                  
                  if (isRainy) {
                    tips.push(lang === 'en' ? '• Postpone irrigation activities' : '• सिंचाई गतिविधियों को स्थगित करें');
                    tips.push(lang === 'en' ? '• Check drainage systems' : '• जल निकासी प्रणाली की जांच करें');
                  } else if (temp > 35) {
                    tips.push(lang === 'en' ? '• Increase irrigation frequency' : '• सिंचाई की आवृत्ति बढ़ाएं');
                    tips.push(lang === 'en' ? '• Avoid midday field work' : '• दोपहर में खेत का काम न करें');
                  } else {
                    tips.push(lang === 'en' ? '• Ideal for spraying pesticides' : '• कीटनाशक छिड़काव के लिए आदर्श');
                    tips.push(lang === 'en' ? '• Good for fertilization' : '• उर्वरक के लिए अच्छा');
                  }
                  
                  return tips.map((tip, i) => <li key={i}>{tip}</li>);
                })()}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl md:rounded-2xl p-3 md:p-6">
        <div className="flex items-start gap-2 md:gap-4">
          <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-green-500/20">
            <Sprout size={18} className="text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-lg font-bold text-[var(--text-main)] mb-1.5">
              {lang === 'en' ? 'Recommendations' : 'सिफारिशें'}
            </h3>
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {isRainy ? (
                <>
                  <li>• {lang === 'en' ? 'Postpone irrigation' : 'सिंचाई स्थगित करें'}</li>
                  <li>• {lang === 'en' ? 'Check drainage' : 'जल निकासी जांचें'}</li>
                  <li>• {lang === 'en' ? 'Protect crops from moisture' : 'फसलों को नमी से बचाएं'}</li>
                </>
              ) : weather.main.temp > 35 ? (
                <>
                  <li>• {lang === 'en' ? 'Increase irrigation' : 'सिंचाई बढ़ाएं'}</li>
                  <li>• {lang === 'en' ? 'Provide shade' : 'छाया प्रदान करें'}</li>
                  <li>• {lang === 'en' ? 'Monitor heat stress' : 'गर्मी तनाव निगरानी'}</li>
                </>
              ) : (
                <>
                  <li>• {lang === 'en' ? 'Good for outdoor work' : 'बाहरी काम के लिए अच्छा'}</li>
                  <li>• {lang === 'en' ? 'Ideal for spraying' : 'छिड़काव के लिए आदर्श'}</li>
                  <li>• {lang === 'en' ? 'Perfect for harvesting' : 'कटाई के लिए उत्तम'}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {weatherHistory.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl md:rounded-2xl p-3 md:p-6">
          <h2 className="text-sm md:text-xl font-bold text-[var(--text-main)] mb-2 md:mb-4">
            {lang === 'en' ? 'Weather History' : 'मौसम इतिहास'}
          </h2>
          <div className="space-y-1.5">
            {weatherHistory.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)]">
                    {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{day.condition}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text-main)]">{Math.round(day.temp)}°</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{day.humidity}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
