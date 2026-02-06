// Fix export
import React from 'react';
// ... rest of file

import React from 'react';

// Sleek Icons
const IconMusic = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;
const IconCoffee = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>;

export default function DecorItem({ type }) {
  let styles = "flex items-center justify-center w-full h-full text-[0.55rem] font-bold tracking-widest uppercase shadow-sm ";
  let label = type;
  let icon = null;

  switch (type) {
    case 'dancefloor':
      // Parquet Floor Aesthetic
      styles += "bg-amber-50 border border-amber-200 text-amber-900/50";
      return (
        <div className={styles} style={{ 
            backgroundImage: 'linear-gradient(45deg, #fef3c7 25%, transparent 25%, transparent 75%, #fef3c7 75%, #fef3c7), linear-gradient(45deg, #fef3c7 25%, transparent 25%, transparent 75%, #fef3c7 75%, #fef3c7)',
            backgroundPosition: '0 0, 10px 10px',
            backgroundSize: '20px 20px'
        }}>
          <span className="bg-white/90 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">DANCE FLOOR</span>
        </div>
      );
    case 'bar':
      styles += "bg-slate-800 text-slate-400 rounded-md";
      icon = <IconCoffee />;
      break;
    case 'plant':
      styles += "bg-emerald-500/80 border-2 border-white/50 text-white rounded-full shadow-lg backdrop-blur-sm";
      label = ""; 
      break;
    case 'dj':
      styles += "bg-fuchsia-900 text-fuchsia-200 rounded-md";
      icon = <IconMusic />;
      label = "DJ";
      break;
    default:
      styles += "bg-gray-200";
  }

  return (
    <div className={styles}>
      {icon}
      {label && <span className="ml-1">{label}</span>}
    </div>
  );
}