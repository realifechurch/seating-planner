import React from 'react';
import TableNode from './TableNode'; 

export default function Stage({ 
  canvasRef, 
  tablePos = {}, 
  tables = {},   
  selectedTableId, 
  handlePointerDown, 
  handlePointerMove, 
  handlePointerUp, 
  handleResizePointerDown,
  moveGuest, 
  deleteTable,
  addTable, 
  updateTableShape, 
  updateTableCapacity, 
  conflictTableIds = [], 
  viewScale = 1, 
  setViewScale
}) {
  
  const safeTablePos = tablePos || {};
  const safeTables = tables || {};
  const tableIds = Object.keys(safeTablePos); 

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-[#F5F5F7]" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-6 flex gap-2 z-50">
        <button onClick={() => setViewScale(s => Math.max(0.5, s - 0.1))} className="bg-white p-2 rounded-lg shadow text-slate-600 hover:bg-slate-50 font-bold">-</button>
        <span className="bg-white px-3 py-2 rounded-lg shadow text-xs font-medium text-slate-500 min-w-[60px] text-center">{(viewScale * 100).toFixed(0)}%</span>
        <button onClick={() => setViewScale(s => Math.min(2, s + 0.1))} className="bg-white p-2 rounded-lg shadow text-slate-600 hover:bg-slate-50 font-bold">+</button>
      </div>

      {/* The Canvas */}
      <div 
        ref={canvasRef}
        className="w-full h-full origin-top-left transition-transform duration-75 ease-out"
        style={{ transform: `scale(${viewScale})` }}
        data-type="canvas-bg"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        {tableIds.map(id => {
            const config = safeTablePos[id];
            const guests = safeTables[id] || [];
            
            if (!config) return null;

            const isSelected = selectedTableId === id;
            const hasConflict = conflictTableIds.includes(id);
            const isRect = config.shape === 'rect';
            
            // --- FIX: DIMENSION LOGIC ---
            // 1. Calculate Base Width
            let w = config.width ? config.width * 10 : (isRect ? 180 : 120);
            
            // 2. Calculate Height
            // If it is a Rectangle, use its own height or default.
            // If it is a Circle/Square, FORCE height to equal width to keep it perfect.
            let h = isRect 
                ? (config.height ? config.height * 10 : 120)
                : w; 
            
            return (
                <div
                    key={id}
                    className={`absolute group cursor-move select-none flex items-center justify-center transition-shadow ${isSelected ? 'z-50' : 'z-10'}`}
                    style={{ 
                        left: `${config.x}%`, 
                        top: `${config.y}%`, 
                        width: `${w}px`, 
                        height: `${h}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.stopPropagation();
                        const guestName = window.draggedGuest;
                        const source = window.draggedSource;
                        if (guestName) moveGuest(guestName, source, id);
                    }}
                >
                    <TableNode 
                        id={id}
                        config={config}
                        seated={guests}
                        isSelected={isSelected}
                        isFull={guests.length >= (config.capacity || 8)}
                        hasConflict={hasConflict}
                        updateTableShape={updateTableShape}
                        updateTableCapacity={updateTableCapacity}
                        deleteTable={deleteTable}
                    />

                    {/* Resize Handle (Only when selected) */}
                    {isSelected && (
                        <div 
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-md z-50 hover:scale-125 transition"
                            onPointerDown={(e) => handleResizePointerDown(e, id)}
                        />
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}