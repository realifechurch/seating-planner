import React from 'react';
import GuestChair from './GuestChair';

// --- ICONS & ASSETS ---
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

// 1. PLANT (Top-down Tree/Bush)
const DecorPlant = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-600 opacity-90 drop-shadow-sm">
    <path fill="currentColor" d="M50 0C60 20 70 10 85 15C100 25 90 40 95 55C100 75 80 80 70 95C50 100 40 85 20 90C5 80 15 60 5 45C-5 25 20 20 25 5C35 0 45 10 50 0Z" />
    <circle cx="50" cy="50" r="10" fill="#064e3b" opacity="0.3" />
  </svg>
);

// 2. DANCE FLOOR (Checkered Pattern)
const DecorDanceFloor = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full bg-white border-2 border-amber-200">
    <pattern id="checkers" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="10" height="10" className="text-amber-50" fill="currentColor" />
      <rect x="10" y="10" width="10" height="10" className="text-amber-50" fill="currentColor" />
    </pattern>
    <rect width="100" height="100" fill="url(#checkers)" />
    <rect width="100" height="100" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-300"/>
    <text x="50" y="50" dominantBaseline="middle" textAnchor="middle" className="text-[10px] font-bold fill-amber-800 uppercase tracking-widest opacity-50" style={{ fontSize: '10px' }}>Dance</text>
  </svg>
);

// 3. STAGE (Wood Texture + Curved Front)
const DecorStage = () => (
  <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full drop-shadow-md">
    <path d="M0 0 H100 V45 Q50 60 0 45 Z" className="fill-slate-800" />
    <path d="M2 2 H98 V44 Q50 58 2 44 Z" className="fill-slate-700" stroke="#475569" strokeWidth="0.5"/>
    {/* Planks */}
    <line x1="20" y1="2" x2="20" y2="48" stroke="#334155" strokeWidth="0.5" />
    <line x1="40" y1="2" x2="40" y2="52" stroke="#334155" strokeWidth="0.5" />
    <line x1="60" y1="2" x2="60" y2="52" stroke="#334155" strokeWidth="0.5" />
    <line x1="80" y1="2" x2="80" y2="48" stroke="#334155" strokeWidth="0.5" />
    <text x="50" y="25" dominantBaseline="middle" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 uppercase tracking-widest">STAGE</text>
  </svg>
);

// 4. DJ (Turntables)
const DecorDJ = () => (
  <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full bg-zinc-900 rounded-md shadow-lg border border-zinc-700">
    <circle cx="25" cy="25" r="18" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
    <circle cx="25" cy="25" r="6" fill="#27272a" />
    <circle cx="75" cy="25" r="18" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
    <circle cx="75" cy="25" r="6" fill="#27272a" />
    <rect x="45" y="10" width="10" height="30" fill="#27272a" rx="2" />
    <text x="50" y="5" textAnchor="middle" className="text-[6px] fill-zinc-500 font-bold">DJ</text>
  </svg>
);

// 5. BAR (Countertop)
const DecorBar = () => (
  <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full drop-shadow-sm">
    <rect x="0" y="0" width="100" height="50" fill="#e2e8f0" rx="4" />
    <rect x="0" y="35" width="100" height="15" fill="#cbd5e1" rx="4" />
    <text x="50" y="20" dominantBaseline="middle" textAnchor="middle" className="text-[12px] font-bold fill-slate-400 uppercase tracking-[0.2em]">BAR</text>
    <circle cx="10" cy="18" r="3" fill="#94a3b8" />
    <circle cx="20" cy="12" r="3" fill="#94a3b8" />
    <circle cx="90" cy="18" r="3" fill="#94a3b8" />
  </svg>
);

// --- MAIN COMPONENT ---
export default function TableNode({ 
  id, config, seated, 
  isSelected, isFull, hasConflict,
  updateTableShape, updateTableCapacity, deleteTable,
  swapGuests, onEditGuest
}) {
  
  const handleDelete = () => {
    if (window.confirm("Remove this element?")) deleteTable(id);
  };

  const isDecor = config.type && config.type !== 'table';

  // --- AESTHETIC LOGIC ---
  // Default is transparent for decor because the SVG handles the shape
  let containerClass = "w-full h-full flex flex-col items-center justify-center transition-all duration-300 ease-out select-none relative ";
  
  if (!isDecor) {
      if (config.shape === 'circle') containerClass += "rounded-full p-1.5 ";
      else containerClass += "rounded-[1.2rem] p-1.5 "; 
  }

  // --- STYLE VARIATIONS ---
  if (isDecor) {
      // We remove background colors for decor because the SVG icons provide the visual
      if (isSelected) containerClass += "ring-2 ring-indigo-500 z-50 ";
  } else {
      // Standard Table Styling
      if (hasConflict) {
        containerClass += "bg-rose-100 ring-2 ring-rose-500 shadow-lg shadow-rose-200 "; 
      } else if (isSelected) {
        containerClass += "bg-white ring-2 ring-indigo-500 shadow-2xl scale-[1.05] z-50 "; 
      } else if (isFull) {
        containerClass += "bg-red-50 border-2 border-red-100 shadow-sm "; 
      } else {
        containerClass += "bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/90 "; 
      }
  }

  // --- RENDER DECOR CONTENT ---
  const renderDecorContent = () => {
      switch(config.type) {
          case 'plant': return <DecorPlant />;
          case 'dancefloor': return <DecorDanceFloor />;
          case 'stage': return <DecorStage />;
          case 'dj': return <DecorDJ />;
          case 'bar': return <DecorBar />;
          default: return (
              <div className="w-full h-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-gray-500">{config.type}</span>
              </div>
          );
      }
  };

  return (
    <>
      <div className={containerClass}>
        
        {/* --- CASE 1: DECOR ELEMENT --- */}
        {isDecor && renderDecorContent()}

        {/* --- CASE 2: SEATING TABLE --- */}
        {!isDecor && (
            <>
                {/* Table Number */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 tracking-wider transition-colors ${
                    hasConflict ? 'bg-rose-500 text-white' : 
                    isFull ? 'bg-red-400 text-white' : 
                    'bg-white text-slate-400 border border-slate-100'
                }`}>
                    {hasConflict ? '!' : `T-${id}`}
                </div>

                {/* Chair Grid */}
                <div className={`grid grid-cols-2 gap-1 w-full pointer-events-none px-2 overflow-hidden ${config.shape === 'circle' ? 'py-3' : 'py-1'}`}>
                  {seated.map((guest, i) => {
                     const guestName = typeof guest === 'string' ? guest : (guest?.name || 'Unknown');
                     return (
                        <div
                            key={i}
                            className="pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-105 transition-transform relative z-20"
                            draggable="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            
                            // Double Click to Edit
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (onEditGuest && typeof guest === 'object') {
                                    onEditGuest(guest);
                                }
                            }}
                            
                            onDragStart={(e) => {
                                e.stopPropagation();
                                window.draggedGuest = guestName;
                                window.draggedSource = id;
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", JSON.stringify({ name: guestName, source: id, index: i }));
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.stopPropagation();
                                try {
                                    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                                    if (data.source === id && swapGuests) {
                                        swapGuests(id, data.index, i);
                                    }
                                } catch (err) {}
                            }}
                        >
                            <GuestChair guest={guest} />
                        </div>
                     );
                  })}
                </div>
            </>
        )}
      </div>

      {/* Floating Action Bar (Simplified for Decor) */}
      {isSelected && (
        <div 
          className="absolute z-[100] bg-white/90 backdrop-blur-xl text-slate-700 p-1.5 rounded-2xl shadow-2xl flex items-center gap-2 no-drag border border-white/50 ring-1 ring-black/5"
          style={{ top: '0', left: '50%', transform: 'translate(-50%, -130%)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
           {!isDecor && (
               <>
                   <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => updateTableShape(id, 'circle')} className={`w-6 h-6 rounded-full border border-slate-200 hover:border-indigo-400 transition ${config.shape === 'circle' ? 'bg-white shadow-sm' : ''}`} title="Circle"></button>
                      <button onClick={() => updateTableShape(id, 'square')} className={`w-6 h-6 rounded-md border border-slate-200 hover:border-indigo-400 transition ${config.shape === 'square' ? 'bg-white shadow-sm' : ''}`} title="Square"></button>
                      <button onClick={() => updateTableShape(id, 'rect')} className={`w-8 h-6 rounded-md border border-slate-200 hover:border-indigo-400 transition ${config.shape === 'rect' ? 'bg-white shadow-sm' : ''}`} title="Rectangle"></button>
                   </div>
                   
                   <div className="h-4 w-px bg-slate-200"></div>
                   
                   <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-1.5 py-0.5">
                      <button onClick={() => updateTableCapacity(id, -1)} className="w-5 h-6 flex items-center justify-center hover:text-indigo-600 font-bold text-lg leading-none pb-0.5">-</button>
                      <span className="text-[10px] font-mono w-4 text-center font-bold text-slate-600">{config.capacity || 8}</span>
                      <button onClick={() => updateTableCapacity(id, 1)} className="w-5 h-6 flex items-center justify-center hover:text-indigo-600 font-bold text-lg leading-none pb-0.5">+</button>
                   </div>
                   
                   <div className="h-4 w-px bg-slate-200"></div>
               </>
           )}
           
           <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition"><IconTrash/></button>
        </div>
      )}
    </>
  );
}