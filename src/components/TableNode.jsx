import React from 'react';
import GuestChair from './GuestChair'; // <--- Corrected Import

// Minimalist Controls Icons
const IconTrash = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;

export default function TableNode({ 
  id, config, seated, 
  isSelected, isFull, hasConflict,
  updateTableShape, updateTableCapacity, deleteTable 
}) {
  
  const handleDelete = () => {
    if (window.confirm("Remove this table?")) deleteTable(id);
  };

  // Aesthetic Logic
  let containerClass = "w-full h-full flex flex-col items-center justify-center p-1.5 transition-all duration-300 ease-out select-none relative ";
  
  if (config.shape === 'circle') containerClass += "rounded-full ";
  else containerClass += "rounded-xl "; 

  // State Visuals
  if (hasConflict) {
    containerClass += "bg-red-50 ring-2 ring-red-400 shadow-lg shadow-red-100 "; 
  } else if (isSelected) {
    containerClass += "bg-white ring-2 ring-indigo-500 shadow-xl scale-[1.02] z-50 "; 
  } else if (isFull) {
    containerClass += "bg-slate-50 border border-slate-200 shadow-inner "; 
  } else {
    containerClass += "bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-px "; 
  }

  return (
    <>
      <div className={containerClass}>
        {/* Table Number Badge */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 tracking-wider">
            {hasConflict ? '⚠️' : `T-${id}`}
        </div>

        {/* Chair Grid */}
        <div className={`grid grid-cols-2 gap-1 w-full pointer-events-none px-1 overflow-hidden ${config.shape === 'circle' ? 'py-2' : ''}`}>
          {seated.map((guest, i) => (
            <GuestChair key={i} guest={guest} />
          ))}
        </div>
      </div>

      {/* Floating Action Bar (iOS Style) */}
      {isSelected && (
        <div 
          className="absolute z-[100] bg-slate-900/90 backdrop-blur-md text-white p-1 rounded-full shadow-2xl flex items-center gap-2 no-drag border border-white/10"
          style={{ top: '0', left: '50%', transform: 'translate(-50%, -140%)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
           {/* Shape Toggles */}
           <div className="flex gap-1">
              <button onClick={() => updateTableShape(id, 'circle')} className={`w-6 h-6 rounded-full border border-white/20 hover:bg-white/20 transition ${config.shape === 'circle' ? 'bg-white/20' : ''}`} title="Circle"></button>
              <button onClick={() => updateTableShape(id, 'square')} className={`w-6 h-6 rounded-md border border-white/20 hover:bg-white/20 transition ${config.shape === 'square' ? 'bg-white/20' : ''}`} title="Square"></button>
              <button onClick={() => updateTableShape(id, 'rect')} className={`w-8 h-6 rounded-md border border-white/20 hover:bg-white/20 transition ${config.shape === 'rect' ? 'bg-white/20' : ''}`} title="Rectangle"></button>
           </div>
           
           <div className="h-4 w-px bg-white/20"></div>
           
           {/* Capacity Stepper */}
           <div className="flex items-center gap-1 bg-black/20 rounded-full px-1">
              <button onClick={() => updateTableCapacity(id, -1)} className="w-5 h-5 flex items-center justify-center hover:text-indigo-300 font-bold">-</button>
              <span className="text-[10px] font-mono w-4 text-center">{config.capacity || 8}</span>
              <button onClick={() => updateTableCapacity(id, 1)} className="w-5 h-5 flex items-center justify-center hover:text-indigo-300 font-bold">+</button>
           </div>
           
           <div className="h-4 w-px bg-white/20"></div>
           
           {/* Delete */}
           <button onClick={handleDelete} className="w-6 h-6 flex items-center justify-center hover:bg-red-500/50 rounded-full text-red-200 transition"><IconTrash/></button>
        </div>
      )}
    </>
  );
}