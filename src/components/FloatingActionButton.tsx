import React from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  lang: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick, lang }) => {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 ease-out"
      style={{
        boxShadow: 'var(--shadow-neon), 0 10px 40px rgba(0, 0, 0, 0.3)'
      }}
      aria-label={lang === 'en' ? 'Open Saathi AI' : 'साथी AI खोलें'}
      title={lang === 'en' ? 'Ask Saathi AI' : 'साथी AI से पूछें'}
    >
      <Sparkles 
        size={28} 
        className="group-hover:rotate-12 transition-transform duration-300" 
      />
      
      {/* Ripple effect */}
      <span className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"></span>
      
      {/* Pulsing animation ring */}
      <span className="absolute inset-0 rounded-full border-2 border-[var(--primary)] opacity-75 animate-ping"></span>
    </button>
  );
};
