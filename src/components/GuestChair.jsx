import React from 'react';

export default function GuestChair({ guest }) {
  // Safe check: handle string names (old data) or object guests (new data)
  const name = typeof guest === 'string' ? guest : (guest?.name || 'Unknown');
  
  // --- CHILD DETECTION ---
  // Check if the meal is set to 'Child' (case insensitive)
  const isChild = typeof guest === 'object' && guest.meal && guest.meal.toLowerCase() === 'child';

  // --- DIET DETECTION ---
  const getDietIcon = () => {
    if (isChild) return <span role="img" aria-label="Child">🧸</span>; // Teddy bear for kids
    if (typeof guest !== 'object' || !guest || !guest.diet) return null;
    const diet = guest.diet.toLowerCase();
    if (diet.includes('veg') || diet.includes('plant')) return <span className="opacity-80" role="img" aria-label="Vegetarian">🌿</span>;
    return <span className="opacity-80" role="img" aria-label="Restriction">⚠️</span>;
  };

  // --- DYNAMIC STYLES ---
  // Base styles
  let containerClasses = "flex items-center justify-center shadow-sm rounded-md px-1 py-0.5 w-full cursor-grab active:cursor-grabbing transition-all duration-200 select-none border ";
  
  // 1. CHILD VS ADULT STYLING
  if (isChild) {
      containerClasses += "bg-blue-50 border-blue-200 text-blue-600 ";
  } else {
      containerClasses += "bg-white/90 border-slate-200 text-slate-700 ";
  }

  // 2. HOVER HIGHLIGHT REQUIREMENT
  // When hovering, add a ring and change background to make it obvious it's clickable
  containerClasses += "hover:scale-110 hover:z-50 hover:shadow-md hover:border-indigo-400 hover:ring-1 hover:ring-indigo-400 hover:bg-white ";

  return (
    <div 
      title={isChild ? `${name} (Child)` : name} 
      className={containerClasses}
    >
      <span className={`text-[8px] font-bold truncate tracking-tight max-w-full block text-center ${isChild ? 'text-blue-700' : ''}`}>
        {name}
      </span>
      {getDietIcon() && <span className="text-[8px] ml-0.5">{getDietIcon()}</span>}
    </div>
  );
}