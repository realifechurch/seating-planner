import React from 'react';
// IMPORT ATOMS (Flat structure)
import TableNode from './TableNode';
import DecorItem from './DecorItem';

export default function Stage({
  canvasRef,
  tablePos, tables, 
  selectedTableId, dragState, resizeState,
  handlePointerDown, handlePointerMove, handlePointerUp,
  handleResizePointerDown,
  moveGuest,
  addTable, updateTableShape, updateTableCapacity, deleteTable,
  conflictTableIds = []
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative z-10">
      
      {/* Visual Feedback: Selection Hint */}
      {selectedTableId && <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl backdrop-blur-md animate-fade-in-up tracking-widest uppercase">Active Selection</div>}

      <div 
        ref={canvasRef} 
        data-type="canvas-bg"
        className="aspect-video w-full max-h-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 relative border border-white/60 touch-none overflow-hidden"
        style={{ 
            backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', 
            backgroundSize: '32px 32px' 
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, 'sidebar'); }}
      >
        {Object.entries(tablePos).map(([id, config]) => {
          const type = config.type || 'table';
          const isTable = type === 'table';
          const isDecor = !isTable;
          
          const isSelected = selectedTableId === id;
          const isDragging = dragState?.id === id;
          const isResizing = resizeState?.id === id;
          
          const seated = tables[id] || [];
          
          // --- FIX IS HERE ---
          // Formerly: config.capacity || 0; 
          // New: config.capacity || 8; 
          // preventing "0 >= 0" which caused empty tables to turn green.
          const capacity = config.capacity || 8; 
          const isFull = isTable && seated.length >= capacity;
          const hasConflict = conflictTableIds.includes(id);

          const isRect = config.shape === 'rect';
          const renderWidth = config.width ? `${config.width}%` : '14%';
          const renderHeight = isRect ? (config.height ? `${config.height}%` : '12%') : 'auto';
          const renderAspect = isRect ? 'auto' : '1 / 1';

          return (
            <React.Fragment key={id}>
              <div 
                onPointerDown={(e) => handlePointerDown(e, id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDragOver={(e) => { 
                    e.preventDefault(); 
                    if (isDecor) e.dataTransfer.dropEffect = 'none'; 
                }}
                onDrop={(e) => { 
                    e.stopPropagation(); 
                    if (isDecor) return; 
                    if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id); 
                }}
                style={{ 
                  left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)', 
                  width: renderWidth, height: renderHeight, aspectRatio: renderAspect,
                  cursor: isDragging ? 'grabbing' : 'grab', 
                  zIndex: isDragging || isResizing || isSelected ? 50 : 10,
                }}
                className="absolute group transition-shadow duration-300"
              >
                {/* COMPONENT SWITCHER */}
                {isTable ? (
                    <TableNode 
                        id={id} config={config} seated={seated}
                        isSelected={isSelected} isFull={isFull} hasConflict={hasConflict}
                        updateTableShape={updateTableShape} updateTableCapacity={updateTableCapacity} deleteTable={deleteTable}
                    />
                ) : (
                    <DecorItem type={type} />
                )}

                {/* RESIZE HANDLE */}
                {isSelected && (
                  <div 
                    className="no-drag absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-center justify-center z-50 translate-x-1/4 translate-y-1/4"
                    onPointerDown={(e) => handleResizePointerDown(e, id)}
                    aria-label="Resize Handle"
                  >
                      <div className="w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-lg"></div>
                  </div>
                )}

                {/* DELETE DECOR BTN */}
                {isSelected && isDecor && (
                    <div className="absolute -top-3 -right-3 z-50" onPointerDown={(e) => e.stopPropagation()}>
                        <button onClick={() => { if(window.confirm('Remove?')) deleteTable(id); }} className="bg-white text-slate-400 hover:text-red-500 rounded-full p-1 w-7 h-7 flex items-center justify-center shadow-lg border border-slate-100 transition hover:scale-110">&times;</button>
                    </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* FLOATING DOCK (Apple Style Pill) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] p-2.5 rounded-[2rem] flex gap-6 z-40 ring-1 ring-black/5 hover:scale-105 transition-transform duration-300">
         <button onClick={() => addTable('circle')} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white rounded-2xl group transition w-16">
           <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition shadow-sm"></div>
           <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-indigo-600 tracking-wider">Circle</span>
         </button>
         <div className="w-px bg-slate-200 my-2"></div>
         <button onClick={() => addTable('square')} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white rounded-2xl group transition w-16">
           <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition shadow-sm"></div>
           <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-indigo-600 tracking-wider">Square</span>
         </button>
         <div className="w-px bg-slate-200 my-2"></div>
         <button onClick={() => addTable('rect')} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white rounded-2xl group transition w-16">
           <div className="w-12 h-8 mt-2 rounded-xl bg-slate-100 border border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition shadow-sm"></div>
           <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-indigo-600 tracking-wider">Rect</span>
         </button>
      </div>
    </div>
  );
}