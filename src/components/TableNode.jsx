import React from 'react';
import GuestChair from './GuestChair';

// Minimalist Controls Icons
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function TableNode({ 
  id, config, seated, 
  isSelected, isFull, hasConflict,
  updateTableShape, updateTableCapacity, deleteTable 
}) {
  
  const handleDelete = () => {
    if (window.confirm("Remove this table?")) deleteTable(id);
  };

  // --- AESTHETIC LOGIC ---
  let containerClass = "w-full h-full flex flex-col items-center justify-center p-1.5 transition-all duration-300 ease-out select-none relative ";
  
  if (config.shape === 'circle') containerClass += "rounded-full ";
  else containerClass += "rounded-[1.2rem] "; 

  // --- COLOR STATES ---
  if (hasConflict) {
    containerClass += "bg-rose-100 ring-2 ring-rose-500 shadow-lg shadow-rose-200 "; 
  } else if (isSelected) {
    containerClass += "bg-white ring-2 ring-indigo-500 shadow-2xl scale-[1.05] z-50 "; 
  } else if (isFull) {
    containerClass += "bg-red-50 border-2 border-red-100 shadow-sm "; 
  } else {
    containerClass += "bg-white border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-white/90 "; 
  }

  return (
    <>
      <div className={containerClass}>
        {/* Table Number Badge */}
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 tracking-wider transition-colors ${
            hasConflict ? 'bg-rose-500 text-white' : 
            isFull ? 'bg-red-400 text-white' : 
            'bg-white text-slate-400 border border-slate-100'
        }`}>
            {hasConflict ? '!' : `T-${id}`}
        </div>

        {/* Chair Grid */}
        <div className={`grid grid-cols-2 gap-1 w-full pointer-events-none px-1 overflow-hidden ${config.shape === 'circle' ? 'py-2' : ''}`}>
          {seated.map((guest, i) => {
             const guestName = typeof guest === 'string' ? guest : (guest?.name || 'Unknown');
             return (
                <div
                    key={i}
                    className="pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-105 transition-transform relative z-20"
                    draggable="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    
                    // --- DRAG START HANDLER ---
                    onDragStart={(e) => {
                        e.stopPropagation();
                        window.draggedGuest = guestName;
                        window.draggedSource = id;
                        
                        // Set standard data
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", JSON.stringify({ name: guestName, source: id }));

                        // --- VISUAL FIX: Create Custom Ghost ---
                        // We clone the element and append it to the body to escape the Table's scale/zoom context.
                        // This guarantees the drag image is visible and not 0px size or transparent.
                        const ghost = e.currentTarget.cloneNode(true);
                        
                        // Force styles on the ghost so it looks nice while dragging
                        ghost.style.position = "absolute";
                        ghost.style.top = "-9999px"; // Hide offscreen initially
                        ghost.style.left = "-9999px";
                        ghost.style.width = "80px"; // Ensure it has width
                        ghost.style.height = "30px";
                        ghost.style.backgroundColor = "white";
                        ghost.style.border = "1px solid #cbd5e1";
                        ghost.style.borderRadius = "99px";
                        ghost.style.display = "flex";
                        ghost.style.alignItems = "center";
                        ghost.style.justifyContent = "center";
                        ghost.style.fontSize = "10px";
                        ghost.style.fontWeight = "bold";
                        ghost.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                        ghost.style.zIndex = "99999";
                        ghost.style.opacity = "1";
                        
                        // Add to DOM, set as image, then remove
                        document.body.appendChild(ghost);
                        e.dataTransfer.setDragImage(ghost, 40, 15); // Center cursor on the ghost
                        
                        // Cleanup after the drag image is snapshotted by the browser
                        setTimeout(() => {
                            document.body.removeChild(ghost);
                        }, 0);
                    }}
                >
                    <GuestChair guest={guest} />
                </div>
             );
          })}
        </div>
      </div>

      {/* Floating Action Bar */}
      {isSelected && (
        <div 
          className="absolute z-[100] bg-white/90 backdrop-blur-xl text-slate-700 p-1.5 rounded-2xl shadow-2xl flex items-center gap-2 no-drag border border-white/50 ring-1 ring-black/5"
          style={{ top: '0', left: '50%', transform: 'translate(-50%, -130%)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
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
           
           <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition"><IconTrash/></button>
        </div>
      )}
    </>
  );
}