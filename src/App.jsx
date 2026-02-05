import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const GROUP_COLORS = ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee'];

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
  const [groups, setGroups] = useState([]); 
  const [selectedInSidebar, setSelectedInSidebar] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  
  const canvasRef = useRef(null);

  // Stats Logic
  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return { unassigned: unassigned.length, seated: seatedCount };
  }, [unassigned, tables]);

  const filteredGuests = useMemo(() => {
    return unassigned.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [unassigned, searchTerm]);

  // Auth Listeners
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) fetchPlans(); }, [session]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('seating_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setPlans(data);
  };

  // RESTORED: CSV Upload Logic
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data.map(row => row.Name || Object.values(row)[0]).filter(Boolean);
          const current = [...unassigned, ...Object.values(tables).flat()];
          const unique = imported.filter(n => !current.includes(n));
          setUnassigned(prev => [...prev, ...unique]);
          e.target.value = null;
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

  const moveGuest = (name, source, target) => {
    const targetConfig = tablePos[target];
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetConfig.capacity) {
      alert("Table is full!"); return;
    }
    if (source === 'sidebar') setUnassigned(prev => prev.filter(n => n !== name));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));
    if (target === 'sidebar') setUnassigned(prev => [...prev, name]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), name] }));
  };

  // RESTORED: Full Sidebar UI with Import Options
  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white">
      <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert(error.message); }} 
            className="bg-white/5 p-12 rounded-3xl border border-white/10 w-full max-w-md">
        <h1 className="text-3xl font-serif mb-6 text-center">Wedding Planner Login</h1>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* RESTORED SIDEBAR */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700">
        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Guest Manager</h2>
        
        <div className="flex gap-2 mb-4">
          <label className="flex-1 bg-indigo-600 text-center p-2.5 rounded-xl cursor-pointer font-bold text-[10px] hover:bg-indigo-500 transition shadow-md">
            + IMPORT CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={() => setUnassigned([])} className="bg-slate-700 text-slate-400 p-2.5 rounded-xl text-[10px] font-bold">CLEAR</button>
        </div>

        <input type="text" placeholder="Search guests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-[10px] mb-4 outline-none focus:border-indigo-500" />
        
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar" onDragOver={e => e.preventDefault()} onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, 'sidebar')}>
          {filteredGuests.map(name => (
            <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }}
                 className="p-3 bg-slate-700 rounded-xl text-[10px] cursor-grab hover:bg-slate-600 transition-colors">
              {name}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
           <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs" />
           <button onClick={addTable} className="w-full bg-slate-700 p-2.5 rounded-xl text-[10px] font-black">+ ADD TABLE</button>
           <button onClick={async () => {
             const { data, error } = await supabase.from('seating_plans').upsert({ id: currentPlanId, name: planName, data: { unassigned, tables, tablePos, groups }, user_id: session.user.id }).select();
             if (!error) { setCurrentPlanId(data[0].id); fetchPlans(); alert("Saved!"); }
           }} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs">SAVE PLAN</button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 p-10 bg-slate-900">
        <div ref={canvasRef} className="h-full w-full bg-white rounded-[3rem] shadow-2xl relative overflow-hidden border-[12px] border-slate-800">
           {/* Table Rendering Logic (Sprint 3 Geometry) */}
           {Object.entries(tablePos).map(([id, config]) => {
             const isRound = config.shape === 'round';
             const seated = tables[id] || [];
             return (
               <div key={id} draggable onDragStart={() => { window.draggedTable = id; }}
                    onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, id)}
                    onDragOver={e => e.preventDefault()}
                    style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)',
                             width: isRound ? '160px' : `${100 + (config.capacity * 10)}px`, height: isRound ? '160px' : '100px' }}
                    className={`absolute flex flex-col items-center justify-center p-4 border-2 transition-all group
                                ${isRound ? 'rounded-full' : 'rounded-2xl'} ${seated.length >= config.capacity ? 'bg-red-50 border-red-500' : 'bg-white border-slate-200 shadow-lg'}`}>
                 <button onClick={() => setEditingTable(editingTable === id ? null : id)} className="absolute -top-2 -right-2 bg-slate-800 text-[8px] p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">⚙️</button>
                 {editingTable === id && (
                   <div className="absolute -top-12 bg-slate-800 p-2 rounded shadow-xl flex gap-1 z-50">
                     <button onClick={() => { setTablePos(prev => ({...prev, [id]: {...prev[id], shape: isRound ? 'rect' : 'round'}})) }} className="text-[8px] bg-indigo-600 p-1 rounded">Shape</button>
                     <button onClick={() => { setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.max(2, config.capacity - 1)}})) }} className="text-[8px] bg-slate-600 p-1 px-2 rounded">-</button>
                     <button onClick={() => { setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.min(12, config.capacity + 1)}})) }} className="text-[8px] bg-slate-600 p-1 px-2 rounded">+</button>
                   </div>
                 )}
                 <span className="text-[10px] font-black text-slate-900 uppercase">Table {id}</span>
                 <span className="text-[8px] text-slate-400 mb-1">{seated.length}/{config.capacity}</span>
                 <div className="grid grid-cols-2 gap-1 w-full">
                   {seated.map(g => <div key={g} className="text-[7px] bg-slate-100 p-1 rounded truncate text-center font-bold">{g}</div>)}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
}