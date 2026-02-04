import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';

// Replace these with your actual Supabase credentials from your dashboard
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
  
  const canvasRef = useRef(null);

  // Stats calculation for the top dashboard
  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    const fullTables = Object.values(tables).filter(t => t.length >= 8).length;
    return {
      total: unassigned.length + seatedCount,
      unassigned: unassigned.length,
      seated: seatedCount,
      fullTables: fullTables
    };
  }, [unassigned, tables]);

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
        user_id: session.user.id // Critical for the RLS policy you are setting up
    };
    const { data, error } = await supabase
      .from('seating_plans')
      .upsert(currentPlanId ? { id: currentPlanId, ...payload } : payload)
      .select();
    if (error) {
        alert("Sync Error: Check your Supabase RLS Policy.");
        console.error(error);
    } else {
        alert("Synced Successfully!");
        setCurrentPlanId(data[0].id);
        fetchPlans();
    }
  };

  const downloadImage = () => {
    if (canvasRef.current === null) return;
    toPng(canvasRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${planName || 'floorplan'}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error(err));
  };

  if (!session) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
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
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-6 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-tighter">Guest List</h2>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-red-900 transition">LOGOUT</button>
        </div>

        <label className="w-full bg-indigo-600 hover:bg-indigo-500 text-center p-2 rounded cursor-pointer font-bold text-xs mb-4 shadow-lg transition">
          + APPEND CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 border-t border-slate-700 pt-4"
             onDragOver={e => e.preventDefault()}
             onDrop={e => {
               const name = e.dataTransfer.getData("name");
               const src = e.dataTransfer.getData("source");
               if (src === "sidebar") return;
               setTables(prev => ({ ...prev, [src]: prev[src].filter(n => n !== name) }));
               setUnassigned(prev => [...prev, name]);
             }}>
          {unassigned.map(name => (
            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("name", name); e.dataTransfer.setData("source", "sidebar"); }}
                 className="p-3 bg-slate-700 border border-slate-600 rounded text-sm cursor-grab hover:bg-slate-600 active:cursor-grabbing transition">
              {name}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Event Name..." className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white focus:border-indigo-500 outline-none" />
          <button onClick={saveToCloud} className="w-full bg-emerald-600 p-2 rounded font-bold text-sm hover:bg-emerald-500 transition">SYNC TO CLOUD</button>
          <button onClick={downloadImage} className="w-full bg-slate-100 text-slate-900 p-2 rounded font-bold text-sm hover:bg-white transition">DOWNLOAD PNG</button>
          <button onClick={() => {
            const id = Object.keys(tablePos).length + 1;
            if (id <= 30) {
              setTablePos(prev => ({ ...prev, [id]: { x: 50, y: 50 } }));
              setTables(prev => ({ ...prev, [id]: [] }));
            }
          }} className="w-full bg-slate-700 p-2 rounded text-[10px] opacity-60 hover:opacity-100 transition">+ ADD TABLE (MAX 30)</button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col bg-slate-900 p-4">
        
        {/* TOP STATS BAR */}
        <div className="flex justify-between items-center mb-4 px-6 py-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex gap-10">
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Total Guests</span><span className="text-2xl font-black text-white">{stats.total}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Unassigned</span><span className="text-2xl font-black text-indigo-400">{stats.unassigned}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Seated</span><span className="text-2xl font-black text-emerald-400">{stats.seated}</span></div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Table Capacity</span>
            <div className="text-xl font-black text-white">{stats.fullTables} <span className="text-xs text-red-500 uppercase">Full</span></div>
          </div>
        </div>

        {/* THE WHITE CANVAS */}
        <div 
          ref={canvasRef} 
          id="canvas-root" 
          className="relative flex-1 bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800" 
          onDragOver={e => e.preventDefault()}
        >
          {/* Visual Stage Indicator */}
          <div className="absolute left-0 h-full w-20 bg-slate-100 border-r border-slate-200 flex items-center justify-center pointer-events-none z-0">
            <h1 className="text-slate-300 text-3xl font-serif tracking-widest uppercase -rotate-90">Stage</h1>
          </div>
          
          {/* Tables Mapping */}
          {Object.entries(tablePos).map(([id, pos]) => {
            const guestCount = tables[id]?.length || 0;
            const isFull = guestCount >= 8;
            return (
              <div key={id} draggable
                onDragEnd={(e) => {
    const canvas = document.getElementById('canvas-root');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Use pageX/pageY and subtract the canvas offset to handle scrolling
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Calculate x and y as percentages of the canvas container
    const x = ((e.pageX - rect.left - scrollLeft) / rect.width) * 100;
    const y = ((e.pageY - rect.top - scrollTop) / rect.height) * 100;
    
    // Boundary checks to prevent tables from getting stuck half-off screen
    const safeX = Math.max(5, Math.min(95, x));
    const safeY = Math.max(5, Math.min(95, y));
    
    setTablePos(prev => ({ ...prev, [id]: { x: safeX, y: safeY } }));
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
                className={`absolute flex flex-col items-center p-3 rounded-full border-2 shadow-lg cursor-move bg-slate-50 transition-shadow ${isFull ? 'border-red-600 ring-4 ring-red-100' : 'border-slate-300'}`}
                style={{ 
                    left: `${pos.x}%`, 
                    top: `${pos.y}%`, 
                    width: '180px', 
                    height: '180px', 
                    transform: 'translate(-50%, -50%)', 
                    zIndex: 10 
                }}>
                <span className={`font-black text-sm mb-1 pointer-events-none ${isFull ? 'text-red-600' : 'text-slate-800'}`}>T{id} ({guestCount}/8)</span>
                <div className="grid grid-cols-2 gap-1 w-full px-1 pointer-events-none">
                  {(tables[id] || []).map((name, i) => (
                    <div key={i} className="text-[8px] font-bold truncate bg-white border rounded p-1 text-center text-slate-700 shadow-sm">
                      {name}
                    </div>
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