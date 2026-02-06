import React from 'react';

// --- ICONS ---
const IconCircle = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>;
const IconSquare = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;
const IconRect = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/></svg>;
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function Stage({
  canvasRef,
  tablePos, tables, 
  selectedTableId, dragState, resizeState,
  handlePointerDown, handlePointerMove, handlePointerUp,
  handleResizePointerDown,
  moveGuest,
  addTable, updateTableShape, updateTableCapacity, deleteTable
}) {
  
  // Helper to determine dietary icon
  const getDietIcon = (guest) => {
    // If guest is just a string (legacy), no icon
    if (typeof guest !== 'object' || !guest.diet) return null;
    const diet = guest.diet.toLowerCase();
    if (diet.includes('veg') || diet.includes('plant')) return <span className="text-[8px] ml-0.5">🍃</span>;
    return <span className="text-[8px] ml-0.5">⚠️</span>;
  };

  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-hidden relative">
      {selectedTableId && <div className="absolute top-6 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] animate-pulse">Element Selected</div>}

      <div 
        ref={canvasRef} 
        data-type="canvas-bg"
        className="aspect-video w-full max-h-full bg-white rounded shadow-2xl relative border border-slate-800 touch-none"
        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, 'sidebar'); }}
      >
        {Object.entries(tablePos).map(([id, config]) => {
          const type = config.type || 'table';
          const isTable = type === 'table';
          const isDecor = !isTable;
          const isRect = config.shape === 'rect';
          const isCircle = config.shape === 'circle';
          const capacity = config.capacity || 0; 
          const seated = tables[id] || [];
          const isDragging = dragState?.id === id;
          const isResizing = resizeState?.id === id;
          const isSelected = selectedTableId === id;
          const isFull = isTable && seated.length >= capacity;

          const renderWidth = config.width ? `${config.width}%` : '14%';
          const renderHeight = isRect ? (config.height ? `${config.height}%` : '12%') : 'auto';
          const renderAspect = isRect ? 'auto' : '1 / 1';
          
          let bgClass = 'bg-white';
          let borderClass = 'border-slate-300';
          let textClass = 'text-slate-700';
          let shadowClass = 'shadow-md';

          if (type === 'dancefloor') { bgClass = 'bg-slate-800'; borderClass = 'border-slate-600 border-dashed'; textClass = 'text-slate-400'; } 
          else if (type === 'bar') { bgClass = 'bg-amber-900'; borderClass = 'border-amber-800'; textClass = 'text-amber-100'; } 
          else if (type === 'plant') { bgClass = 'bg-emerald-600'; borderClass = 'border-emerald-700'; textClass = 'text-transparent'; } 
          else if (type === 'dj') { bgClass = 'bg-fuchsia-900'; borderClass = 'border-fuchsia-700'; textClass = 'text-fuchsia-100'; } 
          else if (isTable) {
             if (isSelected) borderClass = 'border-indigo-500 ring-4 ring-indigo-500/20';
             else if (isFull) { borderClass = 'border-red-500'; bgClass = 'bg-red-50'; textClass = 'text-red-800'; }
             else { bgClass = 'bg-white'; borderClass = 'border-slate-300'; }
          }

          return (
            <React.Fragment key={id}>
              <div 
                onPointerDown={(e) => handlePointerDown(e, id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDragOver={(e) => { e.preventDefault(); if (isDecor) e.dataTransfer.dropEffect = 'none'; }}
                onDrop={(e) => { e.stopPropagation(); if (isDecor) return; if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id); }}
                style={{ 
                  left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)', 
                  width: renderWidth, height: renderHeight, aspectRatio: renderAspect,
                  cursor: isDragging ? 'grabbing' : 'grab', zIndex: isDragging || isResizing || isSelected ? 50 : 10,
                }}
                className={`absolute flex flex-col items-center justify-center p-2 border-[3px] transition-all select-none group
                  ${isCircle ? 'rounded-full' : 'rounded-lg'} ${bgClass} ${borderClass} ${shadowClass}`}
              >
                {isSelected && <div className="no-drag absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center z-50" onPointerDown={(e) => handleResizePointerDown(e, id)}><div className="w-3 h-3 bg-indigo-500 rounded-sm border border-white shadow-sm"></div></div>}
                <span className={`text-[0.6rem] font-black mb-1 pointer-events-none uppercase tracking-tighter ${textClass}`}>{type === 'table' ? `Table ${id}` : type.toUpperCase()}</span>
                {isTable && (
                    <div className="grid grid-cols-2 gap-0.5 w-full pointer-events-none px-1 overflow-hidden">
                    {seated.map((g, i) => {
                        const name = typeof g === 'string' ? g : g.name;
                        const icon = getDietIcon(g);
                        return (
                            <div key={i} className="text-[0.35rem] bg-slate-100 border border-slate-200 p-0.5 rounded truncate text-center font-bold text-slate-600 flex items-center justify-center gap-0.5">
                                <span className="truncate">{name}</span>
                                {icon}
                            </div>
                        )
                    })}
                    </div>
                )}
              </div>

              {isSelected && isTable && (
                <div className="absolute z-[100] bg-slate-800 text-white p-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-600 no-drag"
                  style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -160%)' }} onPointerDown={(e) => e.stopPropagation()}>
                   <div className="flex bg-slate-900 rounded-full p-1 border border-slate-700">
                      <button onClick={() => updateTableShape(id, 'circle')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'circle' ? 'text-indigo-400' : 'text-slate-400'}`}><IconCircle/></button>
                      <button onClick={() => updateTableShape(id, 'square')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'square' ? 'text-indigo-400' : 'text-slate-400'}`}><IconSquare/></button>
                      <button onClick={() => updateTableShape(id, 'rect')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'rect' ? 'text-indigo-400' : 'text-slate-400'}`}><IconRect/></button>
                   </div>
                   <div className="h-4 w-px bg-slate-600 mx-1"></div>
                   <div className="flex items-center gap-1">
                      <button onClick={() => updateTableCapacity(id, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded-full hover:bg-white hover:text-black font-bold text-xs">-</button>
                      <span className="text-[10px] font-mono min-w-[12px] text-center">{capacity}</span>
                      <button onClick={() => updateTableCapacity(id, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded-full hover:bg-white hover:text-black font-bold text-xs">+</button>
                   </div>
                   <div className="h-4 w-px bg-slate-600 mx-1"></div>
                   <button onClick={() => deleteTable(id)} className="p-1.5 hover:bg-red-500 rounded-full text-red-400 hover:text-white transition"><IconTrash/></button>
                </div>
              )}
              
              {isSelected && isDecor && (
                  <div className="absolute z-[100] bg-slate-800 text-white p-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-600 no-drag"
                    style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -160%)' }} onPointerDown={(e) => e.stopPropagation()}>
                      <button onClick={() => deleteTable(id)} className="p-1.5 hover:bg-red-500 rounded-full text-red-400 hover:text-white transition"><IconTrash/></button>
                  </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-2xl flex gap-3 shadow-2xl z-40">
         <button onClick={() => addTable('circle')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
           <div className="w-8 h-8 rounded-full border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
           <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Circle</span>
         </button>
         <button onClick={() => addTable('square')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
           <div className="w-8 h-8 rounded-lg border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
           <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Square</span>
         </button>
         <button onClick={() => addTable('rect')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
           <div className="w-10 h-6 mt-1 rounded-lg border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
           <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Rectangle</span>
         </button>
      </div>
    </div>
  );
}