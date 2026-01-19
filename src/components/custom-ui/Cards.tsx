import React from 'react';

export function GlassCard({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`glass rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function BentoCard({ children, colSpan = 1, rowSpan = 1, className = "", onClick }: 
  { children: React.ReactNode, colSpan?: number, rowSpan?: number, className?: string, onClick?: () => void }) {
  return (
    <GlassCard 
      onClick={onClick}
      className={`bento-col-${colSpan} bento-row-${rowSpan} flex flex-col justify-between overflow-hidden relative group ${className}`}
    >
      {children}
    </GlassCard>
  );
}
