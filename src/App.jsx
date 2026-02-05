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

  const loadPlan = (p) => {
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    setUnassigned(p.data.unassigned || []);
    setTables(p.data.tables || {});
    setTablePos(p.data.tablePos || {});
    setEditingTable(null);
  };

  const addTable = () => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    setTablePos(prev => ({ ...prev, [nextId]: { x: 50, y: 50, shape: 'round', capacity: 8 } }));
  };

  // NEW: Table Dragging Logic
  const handleTableDragEnd = (e, id) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate position as percentage of canvas width/height
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain within 0-100%
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));

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
    const { data, error } = await supabase.from('seating_plans').upsert({
      id: currentPlanId,
      name: planName || "My Wedding Layout",
      data: { unassigned, tables, tablePos },
      user_id: session.user.id
    }).select();
    if (!error) { setCurrentPlanId(data[0].id); fetchPlans(); alert("Layout Saved!"); }
  };

  if (!session) return ( /* ... Keep existing login UI ... */ );

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR (Keep existing sidebar code here) */}

      {/* CANVAS */}
      <div className="flex-1 p-10 bg-slate-950">
        <div 
          ref={canvasRef} 
          className="h-full w-full bg-white rounded-[3rem] relative shadow-inner overflow-hidden border-[12px] border-slate-900"
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
                  transform: 'translate(-50%, -50%)',
                  width: isRound ? '160px' : `${110 + (config.capacity * 12)}px`,
                  height: isRound ? '160px' : '100px'
                }}
                className={`absolute flex flex-col items-center justify-center p-4 border-2 transition-shadow group cursor-move
                  ${isRound ? 'rounded-full' : 'rounded-2xl'} 
                  ${seated.length >= config.capacity ? 'border-rose-400 bg-rose-50' : 'bg-white border-slate-200 shadow-lg hover:shadow-indigo-200/50'}`}
              >
                {/* SETTINGS GEAR - stopPropagation prevents drag triggers */}
                <button 
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === id ? null : id); }} 
                  className="absolute -top-2 -right-2 bg-slate-800 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md"
                >⚙️</button>
                
                {editingTable === id && (
                  <div 
                    draggable={false}
                    className="absolute -top-14 bg-slate-800 p-2 rounded-xl flex gap-2 shadow-2xl z-[60] border border-slate-700"
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], shape: isRound ? 'rect' : 'round'}}))} className="text-[10px] bg-indigo-600 px-3 py-1 rounded-md font-bold">Shape</button>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 rounded-md">
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.max(2, config.capacity - 2)}}))} className="text-white">-</button>
                      <span className="text-[10px] text-white font-mono">{config.capacity}</span>
                      <button onClick={() => setTablePos(prev => ({...prev, [id]: {...prev[id], capacity: Math.min(12, config.capacity + 2)}}))} className="text-white">+</button>
                    </div>
                  </div>
                )}

                <span className="text-[11px] font-black text-slate-800 mb-1 pointer-events-none">Table {id}</span>
                <div className="grid grid-cols-2 gap-1 w-full pointer-events-none">
                  {seated.map(g => (
                    <div key={g} className="text-[7px] bg-slate-100 border p-1 rounded-md truncate text-center font-bold text-slate-600">{g}</div>
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