import React from 'react';
// IMPORT ATOMS (Flat structure)
import DiningTable from './TableNode'; // Filename is TableNode.jsx
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
    <div className="flex-1 bg-slate-100 flex items-center justify-center p-8 overflow-hidden relative">
      
      {/* Visual Feedback: Selection Hint */}
      {selectedTableId && <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm animate-fade-in-up">Active Item</div>}

      <div 
        ref={canvasRef} 
        data-type="canvas-bg"
        className="aspect-video w-full max-h-full bg-white rounded-3xl shadow-2xl shadow-slate-200 relative border border-slate-200 touch-none overflow-hidden"
        style={{ 
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
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
          const capacity = config.capacity || 0;
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
                className="absolute group transition-shadow duration-200"
              >
                {/* COMPONENT SWITCHER */}
                {isTable ? (
                    <DiningTable 
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
                    className="no-drag absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center z-50 translate-x-1/4 translate-y-1/4"
                    onPointerDown={(e) => handleResizePointerDown(e, id)}
                    aria-label="Resize Handle"
                  >
                      <div className="w-3 h-3 bg-white border-2 border-indigo-500 rounded-full shadow-sm"></div>
                  </div>
                )}

                {/* DELETE DECOR BTN */}
                {isSelected && isDecor && (
                    <div className="absolute -top-2 -right-2 z-50" onPointerDown={(e) => e.stopPropagation()}>
                        <button onClick={() => { if(window.confirm('Remove?')) deleteTable(id); }} className="bg-white text-slate-400 hover:text-red-500 rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-md border border-slate-200 transition">&times;</button>
                    </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* FLOATING DOCK (Apple Style) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl p-2 rounded-2xl flex gap-4 z-40 ring-1 ring-black/5">
         <button onClick={() => addTable('circle')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-xl group transition w-16">
           <div className="w-8 h-8 rounded-full border-2 border-slate-300 group-hover:border-indigo-500 transition"></div>
           <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-indigo-600">Circle</span>
         </button>
         <div className="w-px bg-slate-200 my-1"></div>
         <button onClick={() => addTable('square')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-xl group transition w-16">
           <div className="w-8 h-8 rounded-lg border-2 border-slate-300 group-hover:border-indigo-500 transition"></div>
           <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-indigo-600">Square</span>
         </button>
         <div className="w-px bg-slate-200 my-1"></div>
         <button onClick={() => addTable('rect')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-xl group transition w-16">
           <div className="w-10 h-6 mt-1 rounded-lg border-2 border-slate-300 group-hover:border-indigo-500 transition"></div>
           <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-indigo-600">Rect</span>
         </button>
      </div>
    </div>
  );
}