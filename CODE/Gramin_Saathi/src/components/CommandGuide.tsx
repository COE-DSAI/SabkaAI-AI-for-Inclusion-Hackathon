import React from 'react';
import { Mic, Sparkles, Wallet, Store, ShieldCheck, BookOpen, Cloud, Calculator, ArrowLeftRight, Users, TrendingUp, Home } from 'lucide-react';

interface CommandGuideProps {
  lang: string;
  setView: (view: string) => void;
}

const VOICE_COMMANDS = [
  {
    view: 'dashboard',
    icon: Home,
    color: 'from-blue-500 to-cyan-500',
    commands: { en: ['Home', 'Dashboard'], hi: ['होम', 'डैशबोर्ड'] },
    label: { en: 'Home', hi: 'होम' }
  },
  {
    view: 'khata',
    icon: Wallet,
    color: 'from-green-500 to-emerald-500',
    commands: { en: ['Khata', 'Wallet'], hi: ['खाता', 'वॉलेट'] },
    label: { en: 'Khata', hi: 'खाता' }
  },
  {
    view: 'saathi',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    commands: { en: ['Saathi', 'AI', 'Assistant'], hi: ['साथी', 'सहायक'] },
    label: { en: 'Saathi AI', hi: 'साथी AI' }
  },
  {
    view: 'mandi',
    icon: Store,
    color: 'from-orange-500 to-red-500',
    commands: { en: ['Mandi', 'Market'], hi: ['मंडी', 'बाजार'] },
    label: { en: 'Mandi', hi: 'मंडी' }
  },
  {
    view: 'yojana',
    icon: ShieldCheck,
    color: 'from-indigo-500 to-purple-500',
    commands: { en: ['Yojana', 'Schemes'], hi: ['योजना', 'योजनाएं'] },
    label: { en: 'Yojana', hi: 'योजना' }
  },
  {
    view: 'seekho',
    icon: BookOpen,
    color: 'from-amber-500 to-yellow-500',
    commands: { en: ['Seekho', 'Learn'], hi: ['सीखो', 'शिक्षा'] },
    label: { en: 'Seekho', hi: 'सीखो' }
  },
  {
    view: 'mausam',
    icon: Cloud,
    color: 'from-sky-500 to-blue-500',
    commands: { en: ['Mausam', 'Weather'], hi: ['मौसम'] },
    label: { en: 'Weather', hi: 'मौसम' }
  },
  {
    view: 'calculator',
    icon: Calculator,
    color: 'from-violet-500 to-purple-500',
    commands: { en: ['Calculator'], hi: ['कैलकुलेटर'] },
    label: { en: 'Calculator', hi: 'कैलकुलेटर' }
  },
  {
    view: 'translator',
    icon: ArrowLeftRight,
    color: 'from-teal-500 to-cyan-500',
    commands: { en: ['Translator'], hi: ['अनुवादक'] },
    label: { en: 'Translator', hi: 'अनुवादक' }
  },
  {
    view: 'community',
    icon: Users,
    color: 'from-rose-500 to-pink-500',
    commands: { en: ['Community'], hi: ['समुदाय'] },
    label: { en: 'Community', hi: 'समुदाय' }
  },
  {
    view: 'analytics',
    icon: TrendingUp,
    color: 'from-cyan-500 to-blue-500',
    commands: { en: ['Analytics'], hi: ['विश्लेषण'] },
    label: { en: 'Analytics', hi: 'विश्लेषण' }
  },
];

export const CommandGuide: React.FC<CommandGuideProps> = ({ lang, setView }) => {
  return (
    <div className="bg-[#0d2922] rounded-3xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-[#c8e038]/20">
          <Mic size={24} className="text-[#c8e038]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {lang === 'en' ? 'Voice Commands' : 'आवाज आदेश'}
          </h2>
          <p className="text-white/60 text-sm">
            {lang === 'en' ? 'Navigate with your voice' : 'अपनी आवाज से नेविगेट करें'}
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[#c8e038]/10 rounded-2xl border border-[#c8e038]/20">
        <p className="text-white text-sm font-medium mb-2">
          {lang === 'en' ? '🎤 How to use:' : '🎤 कैसे उपयोग करें:'}
        </p>
        <ol className="text-white/70 text-sm space-y-1 list-decimal list-inside">
          <li>{lang === 'en' ? 'Click the microphone button at bottom-right' : 'नीचे-दाएं माइक्रोफोन बटन पर क्लिक करें'}</li>
          <li>{lang === 'en' ? 'Say any command below' : 'नीचे कोई भी आदेश बोलें'}</li>
          <li>{lang === 'en' ? 'Navigate instantly!' : 'तुरंत नेविगेट करें!'}</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VOICE_COMMANDS.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.view}
              onClick={() => setView(cmd.view)}
              className="group p-4 bg-[#0a1f1a] hover:bg-[#0a1f1a]/80 rounded-2xl border border-white/10 hover:border-[#c8e038]/50 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${cmd.color}`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-white font-semibold text-sm">
                  {cmd.label[lang as 'en' | 'hi']}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cmd.commands[lang as 'en' | 'hi'].map((command, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-[#c8e038]/20 text-[#c8e038] rounded text-xs font-medium border border-[#c8e038]/30"
                  >
                    "{command}"
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-[#0a1f1a] rounded-xl border border-white/10">
        <p className="text-white/60 text-xs text-center">
          {lang === 'en' 
            ? '💡 Tip: You can use voice commands from any page!' 
            : '💡 टिप: आप किसी भी पेज से आवाज आदेश का उपयोग कर सकते हैं!'}
        </p>
      </div>
    </div>
  );
};
