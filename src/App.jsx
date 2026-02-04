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
  const [planName, setPlanName] = useState("");
  const [unassigned, setUnassigned] = useState([]);
  const [tables, setTables] = useState({});
  const [tablePos, setTablePos] = useState({}); 
  
  const canvasRef = useRef(null);

  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return { total: unassigned.length + seatedCount, unassigned: unassigned.length, seated: seatedCount };
  }, [unassigned, tables]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const names = results.data.map(row => row.Name || Object.values(row)[0]).filter(Boolean);
          setUnassigned(prev => [...new Set([...prev, ...names])]);
        }
      });
    }
  };

  const saveToCloud = async () => {
    if (!planName) return alert("Please name your configuration.");
    const payload = { name: planName, data: { unassigned, tables, tablePos }, user_id: session?.user?.id };
    const { error } = await supabase.from('seating_plans').upsert(payload);
    if (error) alert("Sync Error: " + error.message);
    else alert("Synced Successfully!");
  };

  const addTable = () => {
    const nextId = Object.keys(tables).length + 1;
    if (nextId > 30) return alert("Max 30 tables.");
    const sectionId = Math.ceil(nextId / 5);
    setTables(prev => ({ ...prev, [nextId]: [] }));
    setTablePos(prev => ({ ...prev, [nextId]: { section: sectionId, x: 50, y: 50 } }));
  };

  if (!session) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <h1 className="text-white text-2xl font-bold mb-6 text-center italic tracking-tight">Business Login</h1>
          <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-700 p-3 rounded mb-4 text-white" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-700 p-3 rounded mb-6 text-white" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded transition shadow-lg">ENTER SYSTEM</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Guest List ({stats.unassigned})</h2>
          <button onClick={() => supabase.auth.signOut()} className="text-[9px] text-slate-400 hover:text-white underline">LOGOUT</button>
        </div>
        
        <label className="w-full bg-indigo-600 text-center p-2.5 rounded cursor-pointer font-bold text-[10px] mb-4 hover:bg-indigo-500 transition shadow-md">
          + APPEND CSV <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 border-t border-slate-700 pt-4 custom-scrollbar"
             onDragOver={e => e.preventDefault()}
             onDrop={e => {
               const name = e.dataTransfer.getData("name");
               const srcTable = e.dataTransfer.getData("sourceTable");
               if (!srcTable || srcTable === "sidebar") return;
               setTables(prev => ({ ...prev, [srcTable]: (prev[srcTable] || []).filter(n => n !== name) }));
               setUnassigned(prev => [...new Set([...prev, name])]);
             }}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("name", name); e.dataTransfer.setData("sourceTable", "sidebar"); }}
                 className="p-2.5 bg-slate-700 border border-slate-600 rounded text-[11px] cursor-grab hover:bg-slate-600 hover:border-slate-500 transition-all select-none">
              {name}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded text-xs text-white focus:border-indigo-500 outline-none" />
          <button onClick={saveToCloud} className="w-full bg-emerald-600 p-2.5 rounded font-bold text-xs hover:bg-emerald-500 transition shadow-md uppercase tracking-wider">SYNC CLOUD</button>
          <button onClick={addTable} className="w-full bg-slate-700 p-2 rounded text-[10px] hover:bg-slate-600 transition opacity-80">+ ADD TABLE</button>
        </div>
      </div>

      {/* VIEWPORT */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 px-6 py-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex gap-10">
            <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Unassigned</span><span className="text-xl font-black text-indigo-400">{stats.unassigned}</span></div>
            <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Seated</span><span className="text-xl font-black text-emerald-400">{stats.seated}</span></div>
          </div>
          <button onClick={() => toPng(canvasRef.current).then(data => { const a = document.createElement('a'); a.download = `${planName || 'Floorplan'}.png`; a.href = data; a.click(); })}
                  className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight hover:bg-indigo-50 transition shadow-sm">EXPORT PNG</button>
        </div>

        {/* 6-SECTION GRID */}
        <div ref={canvasRef} className="flex-1 bg-white rounded-2xl border-[6px] border-slate-800 grid grid-cols-3 grid-rows-2 gap-4 p-5 overflow-hidden relative shadow-inner">
          {[1, 2, 3, 4, 5, 6].map((sec) => (
            <div key={sec} id={`section-${sec}`}
                 className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40 relative overflow-hidden transition-colors hover:bg-slate-100/50"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => {
                   const tableId = e.dataTransfer.getData("movingTableId");
                   if (!tableId) return;
                   const target = document.getElementById(`section-${sec}`);
                   if (!target) return;
                   
                   const rect = target.getBoundingClientRect();
                   const x = ((e.clientX - rect.left) / rect.width) * 100;
                   const y = ((e.clientY - rect.top) / rect.height) * 100;
                   
                   setTablePos(prev => ({ ...prev, [tableId]: { section: sec, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } }));
                 }}>
              <span className="absolute bottom-2 right-3 text-[9px] text-slate-300 font-black uppercase pointer-events-none">ZONE {sec}</span>
              
              {Object.entries(tablePos).filter(([_, p]) => p.section === sec).map(([id, p]) => (
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
                     className="absolute w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-slate-300 bg-white shadow-xl flex flex-col items-center justify-center p-4 cursor-move transition-all active:scale-95 hover:border-indigo-400 z-10"
                     style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                  
                  <span className="text-[11px] font-black text-slate-900 mb-2 border-b-2 border-indigo-100 pb-0.5">T{id} ({tables[id]?.length || 0}/8)</span>
                  
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    {tables[id]?.map((g, i) => (
                      <div key={i} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("name", g); e.dataTransfer.setData("sourceTable", id); }}
                           className="text-[8px] leading-tight bg-slate-50 border border-slate-200 rounded p-1.5 truncate text-slate-700 font-bold text-center hover:bg-indigo-500 hover:text-white hover:border-indigo-600 transition-colors cursor-grab active:cursor-grabbing">
                        {g}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}