import React from 'react';

export function NavItem({ active, onClick, icon: Icon, label, 'data-tour': dataTour }: 
  { active: boolean, onClick: () => void, icon: any, label: string, 'data-tour'?: string }) {
  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        active 
          ? 'bg-[var(--primary)] text-white shadow-lg shadow-emerald-500/20' 
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]'
      }`}
    >
      <Icon size={20} className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
      <span className="font-medium text-sm md:text-base">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
    </button>
  );
}

export function MobileNavItem({ active, onClick, icon: Icon, label, isMain = false }: 
  { active: boolean, onClick: () => void, icon: any, label: string, isMain?: boolean }) {
  if (isMain) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center -mt-8"
      >
        <div className={`p-4 rounded-full shadow-lg transition-all duration-300 ${
          active ? 'bg-white text-[var(--primary)] scale-110' : 'bg-[var(--primary)] text-white'
        }`}>
          <Icon size={28} />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${
        active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
      }`}
    >
      <Icon size={22} className={active ? 'scale-110 translate-y--1' : ''} />
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-[var(--primary)]" />}
    </button>
  );
}
