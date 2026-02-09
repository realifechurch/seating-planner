import React from 'react';

export default function Stage({ 
  canvasRef, 
  tablePos = {}, // Default to empty object
  tables = {},   // Default to empty object
  selectedTableId, 
  dragState, 
  resizeState,
  handlePointerDown, 
  handlePointerMove, 
  handlePointerUp, 
  handleResizePointerDown,
  moveGuest, 
  deleteTable,
  conflictTableIds = [], // Default to empty array
  viewScale = 1, 
  setViewScale
}) {
  
  // --- CRITICAL SAFETY CHECKS ---
  // Ensure we never crash even if props are null
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
        onDrop={(e) => {
            e.preventDefault();
            // Handle drop on empty canvas (optional logic)
        }}
      >
        {tableIds.map(id => {
            const config = safeTablePos[id];
            const guests = safeTables[id] || [];
            
            // Skip invalid entries
            if (!config) return null;

            const isSelected = selectedTableId === id;
            const hasConflict = conflictTableIds.includes(id);
            const isRect = config.shape === 'rect';
            
            // Calculate Dimensions
            const w = config.width ? config.width * 10 : (isRect ? 180 : 120);
            const h = config.height ? config.height * 10 : (isRect ? 120 : 120);
            
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
                    {/* Visual Shape */}
                    <div className={`w-full h-full relative ${config.shape === 'circle' ? 'rounded-full' : 'rounded-xl'} ${hasConflict ? 'bg-red-100 ring-2 ring-red-400' : 'bg-white'} shadow-sm border border-slate-200 flex flex-col items-center justify-center overflow-hidden`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Table {id}</span>
                        
                        {/* Guest Bubbles */}
                        <div className="flex flex-wrap justify-center gap-1 px-2 max-h-[70%] overflow-hidden">
                            {guests.map((g, i) => (
                                <div key={i} draggable onDragStart={() => { window.draggedGuest = g.name; window.draggedSource = id; }} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[8px] flex items-center justify-center font-bold border border-indigo-200" title={g.name}>
                                    {g.name.charAt(0)}
                                </div>
                            ))}
                        </div>
                        <span className="absolute bottom-1 text-[8px] text-slate-300">{guests.length}/{config.capacity || 8}</span>
                    </div>

                    {/* Resize Handle (Only when selected) */}
                    {isSelected && (
                        <div 
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-md z-50 hover:scale-125 transition"
                            onPointerDown={(e) => handleResizePointerDown(e, id)}
                        />
                    )}
                    
                    {/* Delete Button (Only when selected) */}
                    {isSelected && (
                        <button 
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-600 no-drag z-50"
                            onClick={(e) => { e.stopPropagation(); deleteTable(id); }}
                        >
                            ×
                        </button>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}