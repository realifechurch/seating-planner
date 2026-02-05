import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTable, setEditingTable] = useState(null);

  const canvasRef = useRef(null);

  // --- AUTH & DATA SYNC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) fetchPlans();
  }, [session]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('seating_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
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
    // Initialize in center of the fixed canvas
    setTablePos(prev => ({ ...prev, [nextId]: { x: 50, y: 50, shape: 'round', capacity: 8 } }));
  };

  const toggleTableShape = (id) => {
    setTablePos(prev => ({
      ...prev,
      [id]: { ...prev[id], shape: prev[id].shape === 'round' ? 'rect' : 'round' }
    }));
  };

  // --- CORE LOGIC: Aspect Ratio Coordinate Calculation ---
  const handleTableDragEnd = (e, id) => {
    if (!canvasRef.current) return;
    
    // Get the bounding box of the FIXED RATIO canvas (The "Paper")
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate raw position relative to the paper
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    
    // Convert to percentage
    const x = (rawX / rect.width) * 100;
    const y = (rawY / rect.height) * 100;

    // Allow full 0-100 range (The "Entire Floor")
    // We only clamp slightly to ensure it doesn't disappear completely
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    setTablePos(prev => ({
      ...prev,
      [id]: { ...prev[id], x: boundedX, y: boundedY }
    }));
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
    if (!planName) return alert("Please name your plan.");
    const { data, error } = await supabase
      .from('seating_plans')
      .upsert({ 
        id: currentPlanId, 
        name: planName, 
        data: { unassigned, tables, tablePos }, 
        user_id: session.user.id 
      })
      .select();

    if (!error) { setCurrentPlanId(data[0].id); fetchPlans(); alert("Layout Saved!"); }
  };

  // --- LOGIN UI ---
  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <form onSubmit={async (e) => { 
          e.preventDefault(); 
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) alert(error.message);
        }} 
        className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-serif mb-6 text-center italic">Wedding Dashboard</h1>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 outline-none focus:border-indigo-500" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 outline-none focus:border-indigo-500" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition-colors">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* --- LEFT SIDEBAR --- */}
      <div className="w-80 bg-slate-900 p-5 flex flex-col border-r border-slate-800 z-20 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Saved Plans</h2>
          <button onClick={fetchPlans} className="text-[10px] text-slate-500 hover:text-white transition">Refresh ↻</button>
        </div>
        
        <div className="mb-6 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {plans.map(p => (
            <button key={p.id} onClick={() => loadPlan(p)} 
              className={`w-full text-left p-3 rounded-xl border text-[10px] transition-all 
              ${currentPlanId === p.id ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
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

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar" onDragOver={e => e.preventDefault()} onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, 'sidebar')}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }}
                 className="p-3 bg-slate-800 rounded-xl text-[10px] cursor-grab hover:bg-slate-700 transition-colors">{name}</div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
           <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs outline-none" />
           <button onClick={addTable} className="w-full bg-slate-800 p-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition">+ New Table</button>
           <button onClick={saveToDashboard} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs uppercase hover:bg-emerald-500 transition shadow-lg">Save Layout</button>
        </div>
      </div>

      {/* --- MAIN STAGE AREA --- */}
      <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-hidden relative">
        
        {/* Background Hint */}
        <div className="absolute top-4 right-4 text-slate-700 text-[10px] font-mono pointer-events-none">
          CANVAS: 16:9 FIXED RATIO
        </div>

        {/* --- FIXED ASPECT RATIO CANVAS (The "Paper") --- */}
        {/* 'aspect-video' forces 16:9. 'w-full' tries to fill width. 'max-h-full' ensures it doesn't overflow height. */}
        <div 
          ref={canvasRef} 
          className="aspect-video w-full max-h-full bg-white rounded shadow-2xl relative border border-slate-800"
          style={{ 
             backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (window.draggedGuest && window.draggedSource !== 'sidebar') {
                moveGuest(window.draggedGuest, window.draggedSource, 'sidebar');
            }
          }}
        >
          {Object.entries(tablePos).map(([id, config]) => {
            const isRound = config.shape === 'round';
            const seated = tables[id] || [];
            
            return (
              <div 
                key={id} 
                draggable 
                onDragStart={() => { window.draggedTable = id; window.draggedGuest = null; }}
                onDragEnd={(e) => handleTableDragEnd(e, id)}
                onDrop={(e) => {
                  e.stopPropagation();
                  if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id);
                }}
                style={{ 
                  left: `${config.x}%`, 
                  top: `${config.y}%`, 
                  transform: 'translate(-50%, -50%)', // Centers the table on its X/Y coordinate
                  width: isRound ? '14%' : `${10 + (config.capacity)}%`, // Responsive Width %
                  height: isRound ? 'auto' : '12%', // Responsive Height %
                  aspectRatio: isRound ? '1 / 1' : 'auto'
                }}
                className={`absolute flex flex-col items-center justify-center p-2 border-[3px] transition-shadow group cursor-move select-none z-10
                  ${isRound ? 'rounded-full' : 'rounded-lg'} 
                  ${seated.length >= config.capacity ? 'border-rose-400 bg-rose-50' : 'bg-white border-slate-300 shadow-md hover:shadow-xl hover:border-indigo-400'}`}
              >
                {/* SETTINGS GEAR */}
                <button 
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === id ? null : id); }} 
                  className="absolute -top-3 -right-3 bg-slate-800 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md hover:scale-110"
                >⚙️</button>
                
                {editingTable === id && (
                  <div 
                    draggable={false}
                    className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 p-2 rounded-xl flex gap-2 shadow-2xl z-[60] border border-slate-700 w-max"
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => toggleTableShape(id)} className="text-[10px] bg-indigo-600 px-3 py-1 rounded-md font-bold text-white hover:bg-indigo-500">Shape</button>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 rounded-md border border-slate-700">
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.max(2, config.capacity - 2)}}))} className="text-white hover:text-indigo-400 font-bold">-</button>
                      <span className="text-[10px] text-white font-mono min-w-[12px] text-center">{config.capacity}</span>
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.min(12, config.capacity + 2)}}))} className="text-white hover:text-indigo-400 font-bold">+</button>
                    </div>
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