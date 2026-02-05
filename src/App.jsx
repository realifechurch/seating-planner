import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';

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

  // 1. Auth & Session Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Plans - Robust Trigger
  useEffect(() => {
    if (session?.user?.id) {
      fetchPlans();
    }
  }, [session]); // This ensures it fires every time the session is validated

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('seating_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setPlans(data);
    } catch (err) {
      console.error("Error fetching plans:", err.message);
    }
  };

  const loadPlan = (p) => {
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    setUnassigned(p.data.unassigned || []);
    setTables(p.data.tables || {});
    setTablePos(p.data.tablePos || {});
    setEditingTable(null); // Close any open gear menus
  };

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
    setTablePos(prev => ({ ...prev, [nextId]: { 
      section: 1, x: 50, y: 50, shape: 'round', capacity: 8 
    }}));
  };

  const toggleTableShape = (id) => {
    setTablePos(prev => ({
      ...prev,
      [id]: { ...prev[id], shape: prev[id].shape === 'round' ? 'rect' : 'round' }
    }));
  };

  const moveGuest = (name, source, target) => {
    const targetConfig = tablePos[target];
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= (targetConfig?.capacity || 8)) {
      alert("Table is full!"); return;
    }
    if (source === 'sidebar') setUnassigned(prev => prev.filter(n => n !== name));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));

    if (target === 'sidebar') setUnassigned(prev => [...prev, name]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), name] }));
  };

  const saveToDashboard = async () => {
    if (!planName) return alert("Please enter a name for your wedding plan.");
    const { data, error } = await supabase
      .from('seating_plans')
      .upsert({ 
        id: currentPlanId, 
        name: planName, 
        data: { unassigned, tables, tablePos }, 
        user_id: session.user.id 
      })
      .select();

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setCurrentPlanId(data[0].id);
      fetchPlans(); // Refresh the list
      alert("Wedding plan synced!");
    }
  };

  // LOGIN SCREEN
  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white">
      <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email, password }); }} 
            className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-serif mb-6 text-center italic">Wedding Dashboard</h1>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Saved Plans</h2>
          <button onClick={fetchPlans} className="text-[10px] text-slate-500 hover:text-white transition">Refresh ↻</button>
        </div>
        
        <div className="mb-6 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {plans.length === 0 ? (
             <div className="p-4 border border-dashed border-slate-700 rounded-xl text-center">
               <p className="text-[10px] text-slate-500 italic">No plans found. Start by adding a table and saving!</p>
             </div>
          ) : plans.map(p => (
              <button key={p.id} onClick={() => loadPlan(p)} 
                className={`w-full text-left p-3 rounded-xl border text-[10px] transition-all 
                ${currentPlanId === p.id ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                <p className="font-bold text-slate-100">{p.name}</p>
                <p className="opacity-50 text-[8px] uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
              </button>
            ))
          }
        </div>

        <div className="flex gap-2 mb-4">
          <label className="flex-1 bg-indigo-600 text-center p-2.5 rounded-xl cursor-pointer font-bold text-[10px] uppercase hover:bg-indigo-500 transition">
            + Import CSV<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={() => { setUnassigned([]); setTables({}); setTablePos({}); setCurrentPlanId(null); setPlanName(""); }} 
                  className="bg-slate-700 text-slate-400 px-3 rounded-xl text-[8px] font-bold">RESET</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar" onDragOver={e => e.preventDefault()} onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, 'sidebar')}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }}
                 className="p-3 bg-slate-700 rounded-xl text-[10px] cursor-grab hover:bg-slate-600 transition-colors active:scale-95">{name}</div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
           <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Wedding Event Name..." className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" />
           <button onClick={addTable} className="w-full bg-slate-700 p-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-600 transition">+ New Table</button>
           <button onClick={saveToDashboard} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs uppercase hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20">Save to Dashboard</button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 p-10 bg-slate-900 overflow-hidden">
        <div ref={canvasRef} className="h-full w-full bg-white rounded-[3rem] shadow-2xl relative overflow-hidden border-[12px] border-slate-800">
          {Object.entries(tablePos).map(([id, config]) => {
            const isRound = config.shape === 'round';
            const seated = tables[id] || [];
            
            return (
              <div key={id} draggable onDragStart={() => { window.draggedTable = id; }}
                   onDrop={(e) => { e.stopPropagation(); moveGuest(window.draggedGuest, window.draggedSource, id); }}
                   onDragOver={e => e.preventDefault()}
                   style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)',
                            width: isRound ? '170px' : `${120 + (config.capacity * 10)}px`, 
                            height: isRound ? '170px' : '110px' }}
                   className={`absolute flex flex-col items-center justify-center p-4 border-4 transition-all group
                              ${isRound ? 'rounded-full' : 'rounded-2xl'} ${seated.length >= config.capacity ? 'border-red-500 bg-red-50' : 'bg-white border-slate-100 shadow-xl hover:border-indigo-300 cursor-move'}`}>
                
                {/* GEAR ICON */}
                <button onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === id ? null : id); }} 
                        className="absolute -top-2 -right-2 bg-slate-800 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50">⚙️</button>
                
                {editingTable === id && (
                  <div className="absolute -top-14 bg-slate-800 p-2 rounded-lg flex gap-2 shadow-2xl z-50 border border-slate-600" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleTableShape(id)} className="text-[9px] bg-indigo-600 px-3 py-1.5 rounded-md font-bold uppercase">{isRound ? 'Rect' : 'Round'}</button>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 rounded-md">
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.max(2, config.capacity - 1)}}))} className="text-white px-1">-</button>
                      <span className="text-[9px] text-white">{config.capacity}</span>
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.min(12, config.capacity + 1)}}))} className="text-white px-1">+</button>
                    </div>
                  </div>
                )}

                <span className="text-[11px] font-black text-slate-900 border-b border-slate-50 w-full text-center pb-1 mb-2">Table {id}</span>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {seated.map(g => <div key={g} className="text-[7px] bg-slate-50 border p-1 rounded-lg truncate text-center font-bold text-slate-700 shadow-sm">{g}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}