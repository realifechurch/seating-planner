import React, { useState, useEffect, useMemo } from 'react';
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
  const [tablePos, setTablePos] = useState({}); // Now stores { tableId: sectionNumber }

  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return {
      total: unassigned.length + seatedCount,
      unassigned: unassigned.length,
      seated: seatedCount,
    };
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
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const names = results.data.map(row => row.Name || Object.values(row)[0]).filter(Boolean);
          setUnassigned(prev => [...new Set([...prev, ...names])]);
        }
      });
    }
  };

  const saveToCloud = async () => {
    if (!planName) return alert("Please name your configuration.");
    const payload = { 
        name: planName, 
        data: { unassigned, tables, tablePos },
        user_id: session.user.id 
    };
    const { data, error } = await supabase
      .from('seating_plans')
      .upsert(currentPlanId ? { id: currentPlanId, ...payload } : payload)
      .select();
    if (error) alert("Sync Error: Check your Supabase user_id column and RLS Policy.");
    else { alert("Synced Successfully!"); setCurrentPlanId(data[0].id); }
  };

  const addTable = () => {
    const tableIds = Object.keys(tables);
    if (tableIds.length >= 30) return alert("Maximum 30 tables reached.");
    const newId = tableIds.length + 1;
    const sectionId = Math.ceil(newId / 5); // 5 tables per section
    setTables(prev => ({ ...prev, [newId]: [] }));
    setTablePos(prev => ({ ...prev, [newId]: sectionId }));
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-6 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <h2 className="text-sm font-black text-indigo-400 uppercase mb-4">Guest List ({stats.unassigned})</h2>
        <label className="w-full bg-indigo-600 text-center p-2 rounded cursor-pointer font-bold text-xs mb-4 hover:bg-indigo-500 transition">
          + APPEND CSV <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 border-t border-slate-700 pt-4"
             onDragOver={e => e.preventDefault()}
             onDrop={e => {
               const name = e.dataTransfer.getData("name");
               const srcTable = e.dataTransfer.getData("sourceTable");
               if (!srcTable || srcTable === "sidebar") return;
               setTables(prev => ({ ...prev, [srcTable]: prev[srcTable].filter(n => n !== name) }));
               setUnassigned(prev => [...prev, name]);
             }}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("name", name); e.dataTransfer.setData("sourceTable", "sidebar"); }}
                 className="p-2 bg-slate-700 border border-slate-600 rounded text-xs cursor-grab hover:bg-slate-600 transition">
              {name}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white outline-none" />
          <button onClick={saveToCloud} className="w-full bg-emerald-600 p-2 rounded font-bold text-sm hover:bg-emerald-500 transition">SYNC TO CLOUD</button>
          <button onClick={addTable} className="w-full bg-slate-700 p-2 rounded text-[10px] hover:bg-slate-600 transition">+ ADD TABLE</button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* TOP STATS */}
        <div className="flex gap-10 mb-4 px-6 py-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Total</span><span className="text-xl font-black text-white">{stats.total}</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Seated</span><span className="text-xl font-black text-emerald-400">{stats.seated}</span></div>
        </div>

        {/* 6-SECTION GRID CANVAS */}
        <div className="flex-1 bg-white rounded-xl shadow-2xl border-4 border-slate-800 grid grid-cols-3 grid-rows-2 gap-4 p-6 overflow-auto">
          {[1, 2, 3, 4, 5, 6].map((sec) => (
            <div key={sec} 
                 className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-wrap content-start gap-3 bg-slate-50/50 relative"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => {
                   const tableId = e.dataTransfer.getData("movingTableId");
                   if (tableId) setTablePos(prev => ({ ...prev, [tableId]: sec }));
                 }}>
              <span className="absolute top-1 right-2 text-[8px] text-slate-300 font-bold uppercase">Section {sec}</span>
              
              {Object.entries(tablePos).filter(([_, s]) => s === sec).map(([id, _]) => (
                <div key={id} draggable onDragStart={e => e.dataTransfer.setData("movingTableId", id)}
                     onDrop={e => {
                       e.stopPropagation();
                       const name = e.dataTransfer.getData("name");
                       const srcTable = e.dataTransfer.getData("sourceTable");
                       if (srcTable === id || (tables[id]?.length || 0) >= 8) return;
                       if (srcTable === "sidebar") setUnassigned(prev => prev.filter(n => n !== name));
                       else setTables(prev => ({ ...prev, [srcTable]: prev[srcTable].filter(n => n !== name) }));
                       setTables(prev => ({ ...prev, [id]: [...(prev[id] || []), name] }));
                     }}
                     className="w-28 h-28 rounded-full border-2 border-slate-300 bg-white shadow-md flex flex-col items-center justify-center p-2 cursor-move hover:border-indigo-400 transition">
                  <span className="text-[10px] font-black text-slate-800">T{id} ({tables[id]?.length || 0}/8)</span>
                  <div className="grid grid-cols-2 gap-0.5 mt-1">
                    {tables[id]?.map((g, i) => (
                      <div key={i} draggable onDragStart={e => { e.dataTransfer.setData("name", g); e.dataTransfer.setData("sourceTable", id); }}
                           className="text-[5px] bg-slate-100 px-1 rounded truncate w-10 text-slate-600 cursor-grab">
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