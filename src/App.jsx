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
  const [editingTable, setEditingTable] = useState(null); // ID of table being customized
  
  const canvasRef = useRef(null);

  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return { unassigned: unassigned.length, seated: seatedCount };
  }, [unassigned, tables]);

  const filteredGuests = useMemo(() => {
    return unassigned.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [unassigned, searchTerm]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const performSave = async (isAuto = false) => {
    if (!session || !planName || !currentPlanId) return;
    if (!isAuto) setIsAutoSaving(true);
    const payload = { 
      name: planName, 
      data: { unassigned, tables, tablePos, groups }, 
      user_id: session.user.id 
    };
    await supabase.from('seating_plans').upsert({ id: currentPlanId, ...payload });
    if (!isAuto) { setIsAutoSaving(false); fetchPlans(); alert("Synced!"); }
  };

  const addTable = () => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    setTablePos(prev => ({ ...prev, [nextId]: { 
      section: 1, x: 50, y: 50, 
      shape: 'round', capacity: 8 // New for Sprint 3
    }}));
  };

  const updateTableConfig = (id, key, value) => {
    setTablePos(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }));
  };

  const getGuestGroup = (name) => groups.find(g => g.members.includes(name));

  const moveGuest = (name, source, target) => {
    const targetConfig = tablePos[target];
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetConfig.capacity) {
      alert(`Table ${target} is at its ${targetConfig.capacity} person capacity!`);
      return;
    }

    if (source === 'sidebar') setUnassigned(prev => prev.filter(n => n !== name));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));

    if (target === 'sidebar') setUnassigned(prev => [...prev, name]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), name] }));
  };

  // RESTORED LOGIN VIEW
  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center font-sans text-white">
      <form onSubmit={handleLogin} className="bg-white/5 p-12 rounded-3xl border border-white/10 text-center shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-serif mb-2">The Wedding Planner</h1>
        <p className="text-slate-400 mb-8 italic">Organize your perfect celebration.</p>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 text-white outline-none focus:border-indigo-500" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 text-white outline-none focus:border-indigo-500" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR (Same as Sprint 2) */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700 z-20">
         <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Guest Manager</h2>
         {/* ... (Search, Guest List, Grouping buttons from Sprint 2 go here) */}
         <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredGuests.map(name => {
              const group = getGuestGroup(name);
              return (
                <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }}
                     className="p-3 bg-slate-700 rounded-xl text-[10px] cursor-grab border-l-4"
                     style={{ borderLeftColor: group?.color || 'transparent' }}>
                  {name}
                </div>
              );
            })}
         </div>
         <div className="mt-4 pt-4 border-t border-slate-700">
            <button onClick={addTable} className="w-full bg-slate-700 p-3 rounded-xl text-[10px] uppercase font-black tracking-widest">+ Add Table</button>
            <button onClick={() => performSave(false)} className="w-full bg-emerald-600 p-3 rounded-xl font-bold text-xs mt-2">SAVE PLAN</button>
         </div>
      </div>

      {/* CANVAS WITH GEOMETRY */}
      <div className="flex-1 p-10 bg-slate-900 relative">
        <div ref={canvasRef} className="h-full w-full bg-white rounded-[3rem] shadow-2xl relative overflow-hidden border-[12px] border-slate-800">
          {Object.entries(tablePos).map(([id, config]) => {
            const seated = tables[id] || [];
            const isRound = config.shape === 'round';
            
            return (
              <div key={id} draggable onDragStart={() => { window.draggedTable = id; }}
                   onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, id)}
                   onDragOver={e => e.preventDefault()}
                   style={{ 
                     left: `${config.x}%`, 
                     top: `${config.y}%`, 
                     transform: 'translate(-50%, -50%)',
                     width: isRound ? '180px' : `${120 + (config.capacity * 15)}px`,
                     height: isRound ? '180px' : '120px'
                   }}
                   className={`absolute transition-all border-4 flex flex-col items-center justify-center p-4 group
                     ${isRound ? 'rounded-full' : 'rounded-2xl'} 
                     ${seated.length >= config.capacity ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white shadow-lg'}`}>
                
                {/* Table Settings Overlay */}
                <button onClick={() => setEditingTable(editingTable === id ? null : id)} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30">⚙️</button>
                
                {editingTable === id && (
                  <div className="absolute -top-16 bg-slate-800 p-2 rounded-lg flex gap-2 shadow-2xl z-40">
                    <button onClick={() => updateTableConfig(id, 'shape', isRound ? 'rect' : 'round')} className="text-[10px] bg-indigo-600 px-2 py-1 rounded">Shape</button>
                    <button onClick={() => updateTableConfig(id, 'capacity', Math.max(2, config.capacity - 2))} className="text-[10px] bg-slate-600 px-2 py-1 rounded">-</button>
                    <span className="text-[10px] font-bold text-white self-center">{config.capacity}</span>
                    <button onClick={() => updateTableConfig(id, 'capacity', Math.min(20, config.capacity + 2))} className="text-[10px] bg-slate-600 px-2 py-1 rounded">+</button>
                  </div>
                )}

                <h4 className="text-[10px] font-black text-slate-900 mb-2">T{id} ({seated.length}/{config.capacity})</h4>
                <div className="grid grid-cols-2 gap-1 w-full overflow-hidden">
                  {seated.map(g => (
                    <div key={g} className="text-[8px] bg-slate-50 border p-1 rounded truncate text-center font-bold">{g}</div>
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