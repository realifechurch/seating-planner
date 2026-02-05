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
  const [groups, setGroups] = useState([]); // Array of { id, name, members: [], color }
  const [selectedInSidebar, setSelectedInSidebar] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const canvasRef = useRef(null);

  const stats = useMemo(() => {
    const seatedCount = Object.values(tables).reduce((acc, t) => acc + (t?.length || 0), 0);
    return { unassigned: unassigned.length, seated: seatedCount };
  }, [unassigned, tables]);

  const filteredGuests = useMemo(() => {
    return unassigned.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [unassigned, searchTerm]);

  // Auth & Data Loading
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

  // Grouping Logic
  const createGroup = () => {
    if (selectedInSidebar.length < 2) return alert("Select at least 2 guests to link.");
    const groupName = prompt("Enter Group Name (e.g. Miller Family):", "New Group");
    if (!groupName) return;

    const newGroup = {
      id: Date.now(),
      name: groupName,
      members: [...selectedInSidebar],
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length]
    };
    setGroups([...groups, newGroup]);
    setSelectedInSidebar([]);
  };

  const getGuestGroup = (name) => groups.find(g => g.members.includes(name));

  const checkGroupSplit = (name, targetTableId) => {
    const group = getGuestGroup(name);
    if (!group) return false;
    // Check if any group members are already seated at a DIFFERENT table
    const otherTables = Object.entries(tables).filter(([id]) => id !== targetTableId);
    return otherTables.some(([_, guests]) => guests.some(g => group.members.includes(g)));
  };

  // Save/Auto-save
  const performSave = async (isAuto = false) => {
    if (!session || !planName || !currentPlanId) return;
    if (!isAuto) setIsAutoSaving(true);
    const payload = { 
      name: planName, 
      data: { unassigned, tables, tablePos, groups }, // Groups synced here
      user_id: session.user.id 
    };
    await supabase.from('seating_plans').upsert({ id: currentPlanId, ...payload });
    if (!isAuto) { setIsAutoSaving(false); fetchPlans(); alert("Dashboard Synced!"); }
  };

  // Drag and Drop Guest
  const moveGuest = (name, source, target) => {
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= 8) {
      alert("Table is full!");
      return;
    }

    if (target !== 'sidebar' && checkGroupSplit(name, target)) {
      if (!window.confirm(`${name}'s group is seated elsewhere. Seat them here anyway?`)) return;
    }

    // Remove from source
    if (source === 'sidebar') setUnassigned(prev => prev.filter(n => n !== name));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));

    // Add to target
    if (target === 'sidebar') setUnassigned(prev => [...prev, name]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), name] }));
  };

  if (!session) return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center font-serif text-white">
      <div className="bg-white/5 p-12 rounded-3xl border border-white/10 text-center shadow-2xl">
        <h1 className="text-4xl mb-2">The Wedding Planner</h1>
        <p className="text-slate-400 mb-8 italic">Organize your perfect celebration.</p>
        <button onClick={() => {/* Sign in logic from previous sprint */}} className="bg-indigo-600 px-8 py-3 rounded-xl font-bold uppercase tracking-widest">Enter Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800 p-5 flex flex-col border-r border-slate-700 shadow-2xl z-20">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Guest Manager</h2>
            <span className="text-[8px] text-slate-500">{session.user.email}</span>
          </div>
          {isAutoSaving && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
        </header>

        {/* Grouping Actions */}
        {selectedInSidebar.length > 0 && (
          <div className="mb-4 p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-xl animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-indigo-200 mb-2">{selectedInSidebar.length} Guests Selected</p>
            <button onClick={createGroup} className="w-full bg-indigo-600 text-[10px] py-2 rounded-lg font-bold hover:bg-indigo-500 transition">LINK AS GROUP</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          <input type="text" placeholder="Search guests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-[10px] mb-4 focus:border-indigo-500 outline-none transition-all" />
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar" onDragOver={e => e.preventDefault()} onDrop={() => moveGuest(window.draggedGuest, window.draggedSource, 'sidebar')}>
            {filteredGuests.map(name => {
              const group = getGuestGroup(name);
              const isSelected = selectedInSidebar.includes(name);
              return (
                <div key={name} draggable onDragStart={() => { window.draggedGuest = name; window.draggedSource = 'sidebar'; }}
                  onClick={() => setSelectedInSidebar(prev => isSelected ? prev.filter(n => n !== name) : [...prev, name])}
                  className={`group relative p-3 rounded-xl text-[10px] cursor-pointer transition-all border-l-4 select-none
                    ${isSelected ? 'bg-indigo-600 border-indigo-300' : 'bg-slate-700 hover:bg-slate-600 border-transparent'}`}
                  style={{ borderLeftColor: group?.color }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{name}</span>
                    {group && <span className="text-[7px] bg-black/20 px-1.5 py-0.5 rounded uppercase font-black opacity-60">{group.name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Wedding Name..." className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-[10px]" />
          <button onClick={() => performSave(false)} className="w-full bg-emerald-600 p-2.5 rounded-xl font-bold text-xs hover:bg-emerald-500 transition">SYNC DASHBOARD</button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 flex flex-col p-6 bg-slate-900 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-8 py-4 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl">
          <div className="flex gap-12">
            <div><p className="text-[9px] text-slate-500 uppercase font-black">Waiting List</p><p className="text-2xl font-black text-indigo-400">{stats.unassigned}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase font-black">Seated</p><p className="text-2xl font-black text-emerald-400">{stats.seated}</p></div>
          </div>
          <button onClick={() => {
             const nextId = Object.keys(tables).length + 1;
             setTables(prev => ({ ...prev, [nextId]: [] }));
             setTablePos(prev => ({ ...prev, [nextId]: { section: Math.ceil(nextId/5), x: 50, y: 50 } }));
          }} className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">+ Add Table</button>
        </div>

        <div ref={canvasRef} className="flex-1 bg-white rounded-[2.5rem] border-[12px] border-slate-800 grid grid-cols-3 grid-rows-2 gap-6 p-10 relative shadow-2xl">
          {[1,2,3,4,5,6].map(sec => (
            <div key={sec} id={`sec-${sec}`} className="border-2 border-dashed border-slate-100 rounded-3xl relative bg-slate-50/30"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => {
                   const tableId = window.draggedTable;
                   if (!tableId) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   setTablePos(prev => ({ ...prev, [tableId]: { section: sec, x: ((e.clientX - rect.left)/rect.width)*100, y: ((e.clientY - rect.top)/rect.height)*100 } }));
                 }}>
              {Object.entries(tablePos).filter(([_,p]) => p.section === sec).map(([id, p]) => {
                const seated = tables[id] || [];
                const isFull = seated.length >= 8;
                return (
                  <div key={id} draggable onDragStart={() => { window.draggedTable = id; }}
                       onDrop={e => { e.stopPropagation(); moveGuest(window.draggedGuest, window.draggedSource, id); }}
                       className={`absolute w-56 h-56 rounded-full border-[6px] flex flex-col items-center justify-center p-6 transition-all cursor-move
                       ${isFull ? 'bg-rose-50 border-rose-500 shadow-rose-200 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200 hover:border-indigo-300'}`}
                       style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <h4 className="text-[12px] font-black mb-3 text-slate-900 border-b border-slate-100 w-full text-center pb-2 uppercase tracking-tighter">Table {id} ({seated.length}/8)</h4>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {seated.map((g, i) => {
                        const group = getGuestGroup(g);
                        return (
                          <div key={i} draggable onDragStart={(e) => { e.stopPropagation(); window.draggedGuest = g; window.draggedSource = id; }}
                               className="text-[8px] p-2 bg-slate-50 rounded-lg border border-slate-100 font-bold truncate text-center relative overflow-hidden"
                               style={{ borderLeft: group ? `4px solid ${group.color}` : '' }}>
                            {g}
                          </div>
                        );
                      })}
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