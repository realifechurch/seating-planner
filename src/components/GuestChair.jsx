import React from 'react';

export default function GuestChair({ guest }) {
  const name = typeof guest === 'string' ? guest : guest.name;
  
  const getDietIcon = () => {
    if (typeof guest !== 'object' || !guest.diet) return null;
    const diet = guest.diet.toLowerCase();
    // Apple-style: Minimalist emoji usage
    if (diet.includes('veg') || diet.includes('plant')) return <span className="opacity-80" role="img" aria-label="Vegetarian">🌿</span>;
    return <span className="opacity-80" role="img" aria-label="Restriction">⚠️</span>;
  };

  return (
    <div className="flex items-center justify-center bg-white/90 border border-slate-100 shadow-sm rounded-full px-1 py-0.5 max-w-full">
      <span className="text-[0.35rem] font-medium text-slate-700 truncate tracking-tight">{name}</span>
      {getDietIcon() && <span className="text-[0.35rem] ml-0.5">{getDietIcon()}</span>}
    </div>
  );
}