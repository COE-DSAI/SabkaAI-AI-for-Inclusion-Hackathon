import React from 'react';
import { User } from 'lucide-react';

export function IdentityMiniCard({ profile, onClick, t }: { profile: any, onClick: () => void, t: any }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-[var(--bg-glass)]/50 rounded-2xl border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
        {profile?.photoURL ? (
          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{t('nav_profile')}</p>
        <p className="text-sm font-bold text-[var(--text-main)] truncate group-hover:text-[var(--primary)] transition-colors">
          {profile?.name || profile?.displayName || t('guest_user')}
        </p>
      </div>
    </div>
  );
}
