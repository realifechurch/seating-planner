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
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const canvasRef = useRef(null);

  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return { total: unassigned.length + seatedCount, unassigned: unassigned.length, seated: seatedCount };
  }, [unassigned, tables]);

  const filteredGuests = useMemo(() => {
    return unassigned.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [unassigned, searchTerm]);

  // AUTH: Session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Clear state on logout to prevent data leaking between logins on same browser
        setPlans([]);
        setCurrentPlanId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // DATA ISOLATION: Only fetch plans owned by current user
  useEffect(() => {
    if (session?.user?.id) fetchPlans();
  }, [session]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('seating_plans')
      .select('*')
      .eq('user_id', session.user.id) // Filter at DB level
      .order('created_at', { ascending: false });
    
    if (!error && data) setPlans(data);
  };

  // AUTO-SAVE: 5-minute interval with Session Guard
  useEffect(() => {
    if (!session || !planName || !currentPlanId) return;
    const autoSaveInterval = setInterval(() => performAutoSave(), 300000);
    return () => clearInterval(autoSaveInterval);
  }, [session, planName, currentPlanId, unassigned, tables, tablePos]);

  const performAutoSave = async () => {
    // Security Polish: Check session before attempting save
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    if (!activeSession) return setSession(null); 

    setIsAutoSaving(true);
    const payload = { 
      name: planName, 
      data: { unassigned, tables, tablePos }, 
      user_id: activeSession.user.id 
    };
    
    await supabase.from('seating_plans').upsert({ id: currentPlanId, ...payload });
    setTimeout(() => setIsAutoSaving(false), 2000);
    fetchPlans();
  };

  const exportHighResPng = async () => {
    if (!canvasRef.current) return;
    setIsAutoSaving(true);
    try {
      const dataUrl = await toPng(canvasRef.current, { quality: 1.0, pixelRatio: 3, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `${planName || 'Wedding-Layout'}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const saveToCloud = async () => {
    if (!session) return alert("Session expired. Please log in.");
    if (!planName) return alert("Please name your wedding plan.");
    
    const payload = { 
      name: planName, 
      data: { unassigned, tables, tablePos }, 
      user_id: session.user.id 
    };

    const { data, error } = await supabase
      .from('seating_plans')
      .upsert(currentPlanId ? { id: currentPlanId, ...payload } : payload)
      .select();

    if (!error) {
      setCurrentPlanId(data[0].id);
      fetchPlans();
      alert("Plan secured to your dashboard!");
    }
  };

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

  // CX: Wedding Themed Login
  if (!session) {
    return (
      <div className="h-screen w-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-lg p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 text-center">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-serif mb-2">Your Wedding Dashboard</h1>
            <p className="text-slate-400 text-sm italic">Arranging your perfect day, one seat at a time.</p>
          </div>
          <input type="email" placeholder="Email Address" className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-6 text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Seating Planner</h2>
            <span className="text-[9px] text-slate-500 truncate max-w-[140px]">Welcome, {session.user.email}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-[9px] text-slate-400 hover:text-white underline">LOGOUT</button>
        </div>

        {/* VERSION HISTORY / EMPTY STATE */}
        <div className="mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
          <span className="text-[9px] text-slate-500 uppercase font-black mb-2 block tracking-tighter">Your Event Plans</span>
          <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
            {plans.length === 0 ? (
              <div className="py-4 text-center border border-dashed border-slate-700 rounded-lg">
                <p className="text-[10px] text-slate-500 italic px-2">Create your first layout to begin.</p>
              </div>
            ) : (
              plans.map(p => (
                <button key={p.id} onClick={() => { setPlanName(p.name); setCurrentPlanId(p.id); setUnassigned(p.data.unassigned); setTables(p.data.tables); setTablePos(p.data.tablePos); }}
                  className={`w-full text-left p-2 rounded-lg text-[10px] border transition-all flex flex-col ${currentPlanId === p.id ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  <span className="font-bold">{p.name}</span>
                  <span className="text-[8px] opacity-60">{new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex gap-2 mb-4">
          <label className="flex-1 bg-indigo-600 text-center p-2 rounded-lg cursor-pointer font-bold text-[10px] hover:bg-indigo-500 transition shadow-md">+ IMPORT GUESTS<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} /></label>
          <button onClick={() => setUnassigned([])} className="bg-slate-700 text-slate-300 px-3 rounded-lg font-bold text-[10px] hover:bg-red-900/40 hover:text-red-200 transition">CLEAR</button>
        </div>

        <input type="text" placeholder="Find a guest..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] mb-2 focus:border-indigo-500 outline-none" />
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 border-t border-slate-700 pt-4 custom-scrollbar" onDragOver={e => e.preventDefault()}
             onDrop={e => {
               const name = e.dataTransfer.getData("name");
               const srcTable = e.dataTransfer.getData("sourceTable");
               if (!srcTable || srcTable === "sidebar") return;
               setTables(prev => ({ ...prev, [srcTable]: (prev[srcTable] || []).filter(n => n !== name) }));
               setUnassigned(prev => [...new Set([...prev, name])]);
             }}>
          {filteredGuests.map(name => (
            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("name", name); e.dataTransfer.setData("sourceTable", "sidebar"); }} className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-[10px] cursor-grab hover:bg-indigo-600 transition-all select-none">{name}</div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Wedding Event Name..." className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-xs text-white" />
          <button onClick={saveToCloud} className="w-full bg-emerald-600 p-2.5 rounded-lg font-bold text-xs hover:bg-emerald-500 transition shadow-lg uppercase tracking-tight">Save Progress</button>
          <button onClick={() => {
            const nextId = Object.keys(tables).length + 1;
            setTables(prev => ({ ...prev, [nextId]: [] }));
            setTablePos(prev => ({ ...prev, [nextId]: { section: Math.ceil(nextId/5), x: 50, y: 50 } }));
          }} className="w-full bg-slate-700 p-2 rounded-lg text-[10px] hover:bg-slate-600 transition tracking-tighter text-slate-400 uppercase font-black">+ Add Round Table</button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 px-6 py-4 bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex gap-12">
            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Guest List</span><span className="text-xl font-black text-indigo-400">{stats.unassigned}</span></div>
            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Successfully Seated</span><span className="text-xl font-black text-emerald-400">{stats.seated}</span></div>
          </div>
          <div className="flex items-center gap-4">
             {isAutoSaving && <span className="text-[9px] text-emerald-400 font-bold animate-pulse">CLOUD SYNC ACTIVE</span>}
             <button onClick={exportHighResPng} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition-all active:scale-95">Download Floorplan</button>
          </div>
        </div>

        <div ref={canvasRef} className="flex-1 bg-white rounded-[2rem] border-[10px] border-slate-800 grid grid-cols-3 grid-rows-2 gap-6 p-8 overflow-hidden relative shadow-2xl">
          {[1, 2, 3, 4, 5, 6].map((sec) => (
            <div key={sec} id={`section-${sec}`} className="border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 relative overflow-hidden" onDragOver={e => e.preventDefault()}
                 onDrop={e => {
                   const tableId = e.dataTransfer.getData("movingTableId");
                   if (!tableId) return;
                   const target = document.getElementById(`section-${sec}`);
                   const rect = target.getBoundingClientRect();
                   const x = ((e.clientX - rect.left) / rect.width) * 100;
                   const y = ((e.clientY - rect.top) / rect.height) * 100;
                   setTablePos(prev => ({ ...prev, [tableId]: { section: sec, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } }));
                 }}>
              <span className="absolute bottom-3 right-4 text-[10px] text-slate-200 font-black uppercase pointer-events-none tracking-[0.2em]">ZONE {sec}</span>
              {Object.entries(tablePos).filter(([_, p]) => p.section === sec).map(([id, p]) => {
                const count = (tables[id] || []).length;
                const isFull = count >= 8;
                return (
                  <div key={id} draggable onDragStart={e => e.dataTransfer.setData("movingTableId", id)}
                       onDrop={e => {
                         e.stopPropagation();
                         const name = e.dataTransfer.getData("name");
                         const srcTable = e.dataTransfer.getData("sourceTable");
                         if (!name || srcTable === id || (tables[id]?.length || 0) >= 8) return;
                         if (srcTable === "sidebar") setUnassigned(prev => prev.filter(n => n !== name));
                         else setTables(prev => ({ ...prev, [srcTable]: (prev[srcTable] || []).filter(n => n !== name) }));
                         setTables(prev => ({ ...prev, [id]: [...(prev[id] || []), name] }));
                       }}
                       className={`absolute w-44 h-44 md:w-56 md:h-56 rounded-full border-[5px] flex flex-col items-center justify-center p-4 cursor-move active:scale-95 transition-all z-10 
                         ${isFull ? 'bg-red-50 border-red-500 shadow-2xl shadow-red-200' : 'bg-white border-slate-100 shadow-xl hover:border-indigo-200 shadow-slate-200'}`}
                       style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <span className={`text-[12px] font-black mb-3 border-b-2 pb-0.5 tracking-tight ${isFull ? 'text-red-700 border-red-100' : 'text-slate-900 border-indigo-50'}`}>TABLE {id} ({count}/8)</span>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {(tables[id] || []).map((g, i) => (
                        <div key={i} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("name", g); e.dataTransfer.setData("sourceTable", id); }}
                             className={`text-[8px] leading-tight border-2 rounded-lg p-2 truncate font-bold text-center transition-all cursor-grab shadow-sm ${isFull ? 'bg-red-100 border-red-200 text-red-800' : 'bg-white border-slate-50 text-slate-700 hover:bg-indigo-600 hover:text-white'}`}>{g}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}