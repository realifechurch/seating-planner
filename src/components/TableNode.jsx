import React from 'react';
import GuestChair from './GuestChair';

// Minimalist Controls Icons
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function TableNode({ 
  id, config, seated, 
  isSelected, isFull, hasConflict,
  updateTableShape, updateTableCapacity, deleteTable,
  swapGuests
}) {
  
  const handleDelete = () => {
    if (window.confirm("Remove this element?")) deleteTable(id);
  };

  // --- FIX: Strict check ensures legacy data (undefined type) defaults to Table ---
  const isDecor = config.type && config.type !== 'table';

  // --- AESTHETIC LOGIC ---
  let containerClass = "w-full h-full flex flex-col items-center justify-center p-1.5 transition-all duration-300 ease-out select-none relative ";
  
  if (config.shape === 'circle') containerClass += "rounded-full ";
  else containerClass += "rounded-[1.2rem] "; 

  // --- STYLE VARIATIONS ---
  if (isDecor) {
      if (config.type === 'dancefloor') {
          containerClass += "bg-amber-100 border-2 border-amber-200 text-amber-800 ";
      } else if (config.type === 'stage') {
          containerClass += "bg-slate-800 border-2 border-slate-600 text-slate-200 shadow-xl ";
      } else if (config.type === 'plant') {
          containerClass += "bg-emerald-500 border-2 border-emerald-600 shadow-md ";
      } else if (config.type === 'bar') {
          containerClass += "bg-slate-200 border-2 border-slate-300 text-slate-500 ";
      } else if (config.type === 'dj') {
          containerClass += "bg-purple-900 border-2 border-purple-700 text-purple-200 ";
      } else {
          // Fallback for unknown decor
          containerClass += "bg-gray-100 border-2 border-gray-200 ";
      }
      
      // Selection ring for decor
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

  return (
    <>
      <div className={containerClass}>
        {/* IF DECOR: Show Label Only */}
        {isDecor && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-center px-2 pointer-events-none">
                {config.type === 'plant' ? '' : config.type}
            </div>
        )}

        {/* IF TABLE: Show Number + Chairs */}
        {!isDecor && (
            <>
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 tracking-wider transition-colors ${
                    hasConflict ? 'bg-rose-500 text-white' : 
                    isFull ? 'bg-red-400 text-white' : 
                    'bg-white text-slate-400 border border-slate-100'
                }`}>
                    {hasConflict ? '!' : `T-${id}`}
                </div>

                <div className={`grid grid-cols-2 gap-1 w-full pointer-events-none px-2 overflow-hidden ${config.shape === 'circle' ? 'py-3' : 'py-1'}`}>
                  {seated.map((guest, i) => {
                     const guestName = typeof guest === 'string' ? guest : (guest?.name || 'Unknown');
                     return (
                        <div
                            key={i}
                            className="pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-105 transition-transform relative z-20"
                            draggable="true"
                            onPointerDown={(e) => e.stopPropagation()}
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