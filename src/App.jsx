import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// REPLACE THESE WITH YOUR ACTUAL KEYS FROM SUPABASE SETTINGS
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchPlans();
  }, [session]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('seating_plans').select('*').order('created_at', { ascending: false });
    if (data) setPlans(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const saveToCloud = async () => {
    if (!planName) return alert("Please name your configuration.");
    const payload = { name: planName, data: { unassigned, tables, tablePos } };
    const { data, error } = await supabase
      .from('seating_plans')
      .upsert(currentPlanId ? { id: currentPlanId, ...payload } : payload)
      .select();
    if (!error) {
      alert("Saved!");
      setCurrentPlanId(data[0].id);
      fetchPlans();
    }
  };

  if (!session) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center font-sans">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-96 border border-slate-700">
          <h1 className="text-white text-2xl font-bold mb-6 text-center">Business Login</h1>
          <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-700 p-3 rounded mb-4 text-white" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-700 p-3 rounded mb-6 text-white" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded transition">ENTER SYSTEM</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <div className="w-80 bg-slate-800 p-6 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Business Console</h2>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-red-900 transition">LOGOUT</button>
        </div>
        
        <div className="mb-6 space-y-1 overflow-y-auto max-h-40 border-b border-slate-700 pb-4">
          {plans.map(p => (
            <button key={p.id} onClick={() => {
              setCurrentPlanId(p.id);
              setPlanName(p.name);
              setUnassigned(p.data.unassigned || []);
              setTables(p.data.tables || {});
              setTablePos(p.data.tablePos || {});
            }} className={`w-full text-left p-2 rounded text-xs transition ${currentPlanId === p.id ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}>
              {p.name}
            </button>
          ))}
        </div>

        <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="bg-slate-900 border border-slate-700 p-2 rounded mb-4 text-sm outline-none focus:border-indigo-500 text-white" />
        <button onClick={saveToCloud} className="bg-emerald-600 p-3 rounded font-bold text-sm mb-4 hover:bg-emerald-500 text-white">SYNC TO CLOUD</button>
        
        <button onClick={() => {
            const id = Object.keys(tablePos).length + 1;
            if (id <= 30) {
                setTablePos(prev => ({ ...prev, [id]: { x: 50, y: 50 } }));
                setTables(prev => ({ ...prev, [id]: [] }));
            }
        }} className="w-full bg-indigo-600 p-3 rounded-lg font-bold mb-4 text-white">+ ADD TABLE</button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1" onDragOver={e => e.preventDefault()} onDrop={e => {
            const name = e.dataTransfer.getData("name");
            const src = e.dataTransfer.getData("source");
            if (src === "sidebar" || !name) return;
            setTables(prev => ({ ...prev, [src]: prev[src].filter(n => n !== name) }));
            setUnassigned(prev => [...prev, name]);
        }}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("name", name); e.dataTransfer.setData("source", "sidebar"); }} className="p-3 bg-slate-700 border border-slate-600 rounded text-sm cursor-grab">
              {name}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-slate-900 p-4">
        <div id="canvas-root" className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800" onDragOver={e => e.preventDefault()}>
          <div className="absolute left-0 h-full w-20 bg-slate-800 flex items-center justify-center z-0 pointer-events-none"><h1 className="text-white text-3xl font-serif tracking-widest uppercase -rotate-90 opacity-40">Stage</h1></div>
          
          {Object.entries(tablePos).map(([id, pos]) => (
            <div key={id} draggable onDragEnd={(e) => {
                const rect = document.getElementById('canvas-root').getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setTablePos(prev => ({ ...prev, [id]: { x, y } }));
            }} 
            onDrop={e => {
                e.stopPropagation();
                const name = e.dataTransfer.getData("name");
                const src = e.dataTransfer.getData("source");
                if (src === id || (tables[id]?.length || 0) >= 8) return;
                if (src === "sidebar") setUnassigned(prev => prev.filter(n => n !== name));
                else setTables(prev => ({ ...prev, [src]: prev[src].filter(n => n !== name) }));
                setTables(prev => ({ ...prev, [id]: [...(prev[id] || []), name] }));
            }}
            className={`absolute flex flex-col items-center p-3 rounded-full border-2 shadow-lg cursor-move bg-slate-50 ${tables[id]?.length >= 8 ? 'border-red-500' : 'border-slate-300'}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: '180px', height: '180px', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
              <span className="font-black text-slate-800 text-sm mb-1">T{id}</span>
              <div className="grid grid-cols-2 gap-1 w-full px-1">
                {(tables[id] || []).map((name, i) => (
                  <div key={i} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("name", name); e.dataTransfer.setData("source", id); }} className="text-[8px] font-bold truncate bg-white border rounded p-1 text-center text-slate-700 shadow-sm">{name}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}