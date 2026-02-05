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
  const [editingTable, setEditingTable] = useState(null);
  const [dragState, setDragState] = useState(null); 

  const canvasRef = useRef(null);

  // --- AUTH & DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

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
    setEditingTable(null);
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

  const addTable = () => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    setTablePos(prev => ({ ...prev, [nextId]: { x: 50, y: 50, shape: 'circle', capacity: 8 } }));
  };

  // FIX: Update Table Shape
  const updateTableShape = (id, newShape) => {
    setTablePos(prev => ({
      ...prev,
      [id]: { ...prev[id], shape: newShape }
    }));
  };

  // FIX: Delete Table
  const deleteTable = (id) => {
    if (!window.confirm(`Are you sure you want to delete Table ${id}?`)) return;

    // 1. Rescue guests
    const guestsAtTable = tables[id] || [];
    if (guestsAtTable.length > 0) {
      setUnassigned(prev => [...prev, ...guestsAtTable]);
    }

    // 2. Delete from tables state
    const newTables = { ...tables };
    delete newTables[id];
    setTables(newTables);

    // 3. Delete from position state
    const newTablePos = { ...tablePos };
    delete newTablePos[id];
    setTablePos(newTablePos);

    setEditingTable(null);
  };

  // --- POINTER DRAG LOGIC ---
  const handlePointerDown = (e, id) => {
    // Check if we clicked the settings button or menu
    if (e.target.closest('.no-drag')) return;

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
    
    setEditingTable(null);
  };

  const handlePointerMove = (e) => {
    if (!dragState || !canvasRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    let newX = mouseXPercent - dragState.offsetX;
    let newY = mouseYPercent - dragState.offsetY;

    // Clamp
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
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
           <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs outline-none" />
           <button onClick={addTable} className="w-full bg-slate-800 p-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition">+ New Table</button>
           <button onClick={saveToDashboard} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs uppercase hover:bg-emerald-500 transition shadow-lg">Save Layout</button>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 text-slate-700 text-[10px] font-mono pointer-events-none">FIXED RATIO 16:9</div>

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
            
            const seated = tables[id] || [];
            const isDragging = dragState?.id === id;
            
            return (
              <div 
                key={id} 
                onPointerDown={(e) => handlePointerDown(e, id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id);
                }}
                style={{ 
                  left: `${config.x}%`, 
                  top: `${config.y}%`, 
                  transform: 'translate(-50%, -50%)', 
                  width: isRect ? `${10 + (config.capacity)}%` : '14%', 
                  height: isRect ? '12%' : 'auto', 
                  aspectRatio: isRect ? 'auto' : '1 / 1',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: isDragging ? 50 : 10
                }}
                className={`absolute flex flex-col items-center justify-center p-2 border-[3px] transition-shadow select-none
                  ${isCircle ? 'rounded-full' : 'rounded-lg'} 
                  ${seated.length >= config.capacity ? 'border-rose-400 bg-rose-50' : 'bg-white border-slate-300 shadow-md hover:border-indigo-400'}`}
              >
                {/* GEAR BUTTON (Added 'no-drag' class and stopPropagation) */}
                <button 
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === id ? null : id); }} 
                    className="no-drag absolute -top-3 -right-3 bg-slate-800 text-white p-1.5 rounded-full opacity-0 hover:opacity-100 transition-opacity z-50 cursor-pointer"
                >⚙️</button>
                
                {/* SETTINGS MENU (Added 'no-drag' class and full isolation) */}
                {editingTable === id && (
                  <div 
                    className="no-drag absolute -top-24 left-1/2 -translate-x-1/2 bg-slate-800 p-3 rounded-xl flex flex-col gap-2 shadow-2xl z-[100] border border-slate-700 w-max cursor-default"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Shape Selectors */}
                    <div className="flex gap-1 justify-center">
                        <button onClick={() => updateTableShape(id, 'circle')} className={`text-[9px] px-2 py-1 rounded font-bold ${isCircle ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Circle</button>
                        <button onClick={() => updateTableShape(id, 'square')} className={`text-[9px] px-2 py-1 rounded font-bold ${isSquare ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Square</button>
                        <button onClick={() => updateTableShape(id, 'rect')} className={`text-[9px] px-2 py-1 rounded font-bold ${isRect ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Rect</button>
                    </div>

                    {/* Capacity Controls */}
                    <div className="flex items-center justify-center gap-2 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.max(2, config.capacity - 2)}}))} className="text-white font-bold px-2 hover:text-indigo-400">-</button>
                      <span className="text-[10px] text-white font-mono min-w-[16px] text-center">{config.capacity}</span>
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.min(12, config.capacity + 2)}}))} className="text-white font-bold px-2 hover:text-indigo-400">+</button>
                    </div>

                    {/* Delete Button */}
                    <button onClick={() => deleteTable(id)} className="w-full text-[9px] bg-red-900/50 text-red-200 border border-red-900/50 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors font-bold uppercase tracking-wide">Delete Table</button>
                  </div>
                )}

                <span className="text-[0.6rem] md:text-[0.7rem] font-black text-slate-700 mb-1 pointer-events-none uppercase tracking-tighter">Table {id}</span>
                <div className="grid grid-cols-2 gap-1 w-full pointer-events-none px-1">
                  {seated.map(g => (
                    <div key={g} className="text-[0.4rem] md:text-[0.5rem] bg-slate-100 border border-slate-200 p-0.5 rounded truncate text-center font-bold text-slate-600">{g}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}