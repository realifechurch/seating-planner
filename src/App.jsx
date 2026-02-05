import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SeatingPlanner() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [planName, setPlanName] = useState("");
  const [unassigned, setUnassigned] = useState([]);
  const [tables, setTables] = useState({});
  const [tablePos, setTablePos] = useState({}); 
  const [dragState, setDragState] = useState(null); 
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tableId }

  const canvasRef = useRef(null);

  // --- AUTH & DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

  // Global click listener to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await supabase.from('seating_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setPlans(data);
    } catch (err) { console.error(err); }
  };

  const loadPlan = (p) => {
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    setUnassigned(p.data.unassigned || []);
    setTables(p.data.tables || {});
    setTablePos(p.data.tablePos || {});
    setContextMenu(null);
  };

  // --- ACTIONS ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data.map(row => row.Name || Object.values(row)[0]).filter(Boolean);
          setUnassigned(prev => [...new Set([...prev, ...imported])]);
        }
      });
    }
  };

  // Add Table with Shape Argument
  const addTable = (shapeType) => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    setTablePos(prev => ({ 
      ...prev, 
      [nextId]: { x: 50, y: 50, shape: shapeType, capacity: 8 } 
    }));
  };

  const updateTableShape = (id, newShape) => {
    setTablePos(prev => ({ ...prev, [id]: { ...prev[id], shape: newShape } }));
  };

  const updateTableCapacity = (id, delta) => {
    setTablePos(prev => {
        const current = prev[id].capacity || 8; // Default to 8 if missing
        const newCap = Math.max(2, Math.min(20, current + delta)); // Limit between 2 and 20
        return { ...prev, [id]: { ...prev[id], capacity: newCap } };
    });
  };

  const deleteTable = (id) => {
    if (!window.confirm(`Delete Table ${id}? Guests will be moved to unassigned.`)) return;

    // Rescue guests
    const guestsAtTable = tables[id] || [];
    if (guestsAtTable.length > 0) {
      setUnassigned(prev => [...prev, ...guestsAtTable]);
    }

    // Delete data
    const newTables = { ...tables };
    delete newTables[id];
    setTables(newTables);

    const newTablePos = { ...tablePos };
    delete newTablePos[id];
    setTablePos(newTablePos);
  };

  // --- INTERACTION HANDLERS ---
  const handleContextMenu = (e, id) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // Calculate position relative to viewport
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tableId: id
    });
  };

  const handlePointerDown = (e, id) => {
    // If context menu is open, close it and don't drag
    if (contextMenu) {
        setContextMenu(null);
        return;
    }
    
    e.preventDefault(); 
    e.stopPropagation(); 

    if (!canvasRef.current) return;
    
    e.target.setPointerCapture(e.pointerId);

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const currentTable = tablePos[id];

    setDragState({
      id: id,
      offsetX: mouseXPercent - currentTable.x,
      offsetY: mouseYPercent - currentTable.y
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState || !canvasRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    let newX = mouseXPercent - dragState.offsetX;
    let newY = mouseYPercent - dragState.offsetY;

    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    setTablePos(prev => ({
      ...prev,
      [dragState.id]: { ...prev[dragState.id], x: newX, y: newY }
    }));
  };

  const handlePointerUp = (e) => {
    if (dragState) {
      e.target.releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  const moveGuest = (name, source, target) => {
    const targetCap = tablePos[target]?.capacity || 8;
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetCap) return alert("Table is full!");
    
    if (source === 'sidebar') setUnassigned(prev => prev.filter(n => n !== name));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));

    if (target === 'sidebar') setUnassigned(prev => [...prev, name]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), name] }));
  };

  const saveToDashboard = async () => {
    if (!planName) return alert("Name your plan first.");
    const { data, error } = await supabase.from('seating_plans').upsert({ id: currentPlanId, name: planName, data: { unassigned, tables, tablePos }, user_id: session.user.id }).select();
    if (!error) { setCurrentPlanId(data[0].id); fetchPlans(); alert("Saved!"); }
  };

  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password }); }} className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-serif mb-6 text-center italic">Wedding Dashboard</h1>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900 p-5 flex flex-col border-r border-slate-800 z-20 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Saved Plans</h2>
          <button onClick={fetchPlans} className="text-[10px] text-slate-500 hover:text-white transition">Refresh ↻</button>
        </div>
        <div className="mb-6 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {plans.map(p => (
            <button key={p.id} onClick={() => loadPlan(p)} className={`w-full text-left p-3 rounded-xl border text-[10px] transition-all ${currentPlanId === p.id ? 'bg-indigo-900/40 border-indigo-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
              <p className="font-bold text-slate-100">{p.name}</p>
              <p className="opacity-50 text-[8px] uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 mb-4">
          <label className="flex-1 bg-indigo-600 text-center p-2.5 rounded-xl cursor-pointer font-bold text-[10px] uppercase hover:bg-indigo-500 transition">
            + Import CSV<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }} className="p-3 bg-slate-800 rounded-xl text-[10px] cursor-grab hover:bg-slate-700 transition-colors">{name}</div>
          ))}
        </div>

        {/* Add Table Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800">
           <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Add New Table:</p>
           <div className="flex gap-2 mb-3">
             <button onClick={() => addTable('circle')} className="flex-1 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-[10px] font-bold border border-slate-700">Circle</button>
             <button onClick={() => addTable('square')} className="flex-1 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-[10px] font-bold border border-slate-700">Square</button>
             <button onClick={() => addTable('rect')} className="flex-1 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-[10px] font-bold border border-slate-700">Rect</button>
           </div>
           
           <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs outline-none mb-2" />
           <button onClick={saveToDashboard} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs uppercase hover:bg-emerald-500 transition shadow-lg">Save Layout</button>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 text-slate-700 text-[10px] font-mono pointer-events-none">FIXED RATIO 16:9</div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] font-mono pointer-events-none animate-pulse">Right-click a table to edit</div>

        <div 
          ref={canvasRef} 
          className="aspect-video w-full max-h-full bg-white rounded shadow-2xl relative border border-slate-800 touch-none"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, 'sidebar'); }}
        >
          {Object.entries(tablePos).map(([id, config]) => {
            const isRect = config.shape === 'rect';
            const isSquare = config.shape === 'square';
            const isCircle = !isRect && !isSquare; 
            
            // FIX: Robust Capacity Check
            const capacity = config.capacity || 8; 
            const seated = tables[id] || [];
            const isDragging = dragState?.id === id;
            const isFull = seated.length >= capacity;
            
            return (
              <div 
                key={id} 
                onPointerDown={(e) => handlePointerDown(e, id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => handleContextMenu(e, id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id);
                }}
                style={{ 
                  left: `${config.x}%`, 
                  top: `${config.y}%`, 
                  transform: 'translate(-50%, -50%)', 
                  width: isRect ? `${10 + (capacity)}%` : '14%', 
                  height: isRect ? '12%' : 'auto', 
                  aspectRatio: isRect ? 'auto' : '1 / 1',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: isDragging ? 50 : 10
                }}
                className={`absolute flex flex-col items-center justify-center p-2 border-[3px] transition-all select-none
                  ${isCircle ? 'rounded-full' : 'rounded-lg'} 
                  ${isFull ? 'border-red-600 bg-red-100 shadow-red-500/50 shadow-lg' : 'bg-white border-slate-300 shadow-md hover:border-indigo-400'}`}
              >
                <span className={`text-[0.6rem] md:text-[0.7rem] font-black mb-1 pointer-events-none uppercase tracking-tighter ${isFull ? 'text-red-800' : 'text-slate-700'}`}>Table {id}</span>
                <div className="grid grid-cols-2 gap-1 w-full pointer-events-none px-1">
                  {seated.map(g => (
                    <div key={g} className="text-[0.4rem] md:text-[0.5rem] bg-slate-100 border border-slate-200 p-0.5 rounded truncate text-center font-bold text-slate-600">{g}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CUSTOM CONTEXT MENU */}
        {contextMenu && (
          <div 
            className="fixed bg-slate-800 text-white p-2 rounded-xl shadow-2xl z-[100] border border-slate-700 min-w-[150px] flex flex-col gap-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-700 mb-1">Edit Table {contextMenu.tableId}</p>
            
            <div className="flex gap-1 p-1">
               <button onClick={() => updateTableShape(contextMenu.tableId, 'circle')} className="flex-1 text-[9px] bg-slate-700 hover:bg-indigo-600 py-1 rounded">Circle</button>
               <button onClick={() => updateTableShape(contextMenu.tableId, 'square')} className="flex-1 text-[9px] bg-slate-700 hover:bg-indigo-600 py-1 rounded">Square</button>
               <button onClick={() => updateTableShape(contextMenu.tableId, 'rect')} className="flex-1 text-[9px] bg-slate-700 hover:bg-indigo-600 py-1 rounded">Rect</button>
            </div>

            <div className="flex items-center justify-between bg-slate-900 rounded p-1 mx-1">
                <span className="text-[9px] text-slate-400 ml-1">Seats: {tablePos[contextMenu.tableId]?.capacity || 8}</span>
                <div className="flex gap-1">
                    <button onClick={() => updateTableCapacity(contextMenu.tableId, -1)} className="text-[10px] bg-slate-700 hover:text-white px-2 rounded font-bold">-</button>
                    <button onClick={() => updateTableCapacity(contextMenu.tableId, 1)} className="text-[10px] bg-slate-700 hover:text-white px-2 rounded font-bold">+</button>
                </div>
            </div>

            <button onClick={() => deleteTable(contextMenu.tableId)} className="text-[10px] text-red-300 hover:bg-red-900/50 hover:text-white py-1.5 rounded mt-1 font-bold">Delete Table</button>
          </div>
        )}

      </div>
    </div>
  );
}