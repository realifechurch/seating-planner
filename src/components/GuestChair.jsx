import React from 'react';

export default function GuestChair({ guest }) {
  // Safe check: handle string names (old data) or object guests (new data)
  const name = typeof guest === 'string' ? guest : (guest?.name || 'Unknown');
  
  const getDietIcon = () => {
    if (typeof guest !== 'object' || !guest || !guest.diet) return null;
    const diet = guest.diet.toLowerCase();
    if (diet.includes('veg') || diet.includes('plant')) return <span className="opacity-80" role="img" aria-label="Vegetarian">🌿</span>;
    return <span className="opacity-80" role="img" aria-label="Restriction">⚠️</span>;
  };

  return (
    <div 
      title={name} 
      className="flex items-center justify-center bg-white/90 border border-slate-200 shadow-sm rounded-md px-1 py-0.5 w-full cursor-help transition hover:scale-105 hover:z-10 hover:border-indigo-300"
    >
      <span className="text-[8px] font-semibold text-slate-700 truncate tracking-tight max-w-full block text-center">
        {name}
      </span>
      {getDietIcon() && <span className="text-[8px] ml-0.5">{getDietIcon()}</span>}
    </div>
  );
}