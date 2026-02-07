import React, { useState } from 'react';

// Minimalist Icons (Feather)
const IconUserAdd = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IconMagic = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconSettings = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const GROUP_COLORS = [
  { name: 'None', color: 'bg-slate-300' },
  { name: 'Family', color: 'bg-rose-400' },
  { name: 'Friends', color: 'bg-orange-300' },
  { name: 'Work', color: 'bg-sky-400' },
  { name: 'VIP', color: 'bg-amber-300' },
  { name: 'Kids', color: 'bg-emerald-400' },
];

const MEAL_OPTIONS = ['Standard', 'Beef', 'Chicken', 'Fish', 'Veg', 'Vegan', 'Child'];

export default function Sidebar({
  unassigned, setUnassigned,
  plans, loadPlan, currentPlanId,
  planName, setPlanName,
  savePlan, exportToPDF, handleLogout,
  userEmail, handleFileUpload,
  tables, autoAssignGroup, addDecor,
  updateGuestDetails,
  conflicts, addConflict, removeConflict, allGuests
}) {
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestMeal, setNewGuestMeal] = useState("Standard");
  const [newGuestDiet, setNewGuestDiet] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('people'); // 'people' or 'tools'

  // Conflict State
  const [conflictA, setConflictA] = useState("");
  const [conflictB, setConflictB] = useState("");
  
  // Auto Assign State
  const [assignGroup, setAssignGroup] = useState("");
  const [assignTable, setAssignTable] = useState("");

  const [editingGuest, setEditingGuest] = useState(null); 

  // --- LOGIC ---
  const handleManualAddGuest = (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    const newGuest = { id: crypto.randomUUID(), name: newGuestName.trim(), group: 'None', meal: newGuestMeal, diet: newGuestDiet };
    setUnassigned(prev => [...prev, newGuest]);
    setNewGuestName("");
  };

  const toggleGuestSelection = (id) => {
    const newSet = new Set(selectedGuestIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedGuestIds(newSet);
  };

  const assignGroupToSelected = (groupName) => {
    setUnassigned(prev => prev.map(g => selectedGuestIds.has(g.id) ? { ...g, group: groupName } : g));
    setSelectedGuestIds(new Set()); 
  };

  const saveGuestEdits = () => {
    if (!editingGuest) return;
    updateGuestDetails(editingGuest.id, { meal: editingGuest.meal, diet: editingGuest.diet });
    setEditingGuest(null);
  };

  const handleAutoAssign = () => {
    if (!assignGroup || !assignTable) return alert("Please select a group and a table.");
    autoAssignGroup(assignGroup, assignTable);
  };

  const availableGroups = [...new Set(unassigned.map(g => g.group))].filter(g => g !== 'None');
  const realTables = Object.keys(tables);

  return (
    // GLASS PANEL CONTAINER
    <div className="w-80 h-[96%] my-auto ml-4 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-[2rem] flex flex-col z-20 relative font-sans text-slate-700 overflow-hidden ring-1 ring-black/5">
      
      {/* HEADER: Plans */}
      <div className="p-5 border-b border-black/5 bg-white/30">
        <div className="flex gap-2 mb-3">
            <select 
                className="flex-1 bg-white/60 border border-black/5 rounded-xl text-xs p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 shadow-sm"
                onChange={(e) => { const selected = plans.find(p => p.id === e.target.value); if (selected) loadPlan(selected); }}
                value={currentPlanId || ""}
            >
                <option value="" disabled>My Plans...</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => savePlan(false)} className="bg-white/80 hover:bg-white text-indigo-600 border border-black/5 px-4 rounded-xl text-xs font-bold shadow-sm transition">Save</button>
        </div>
        <input 
            value={planName} onChange={e => setPlanName(e.target.value)} 
            placeholder="Event Name..." 
            className="w-full bg-transparent border-none p-0 text-lg font-semibold text-slate-800 placeholder-slate-400 focus:ring-0 tracking-tight"
        />
      </div>

      {/* TABS */}
      <div className="flex p-1 mx-4 mt-4 bg-black/5 rounded-xl">
          <button onClick={() => setActiveTab('people')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'people' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Guests</button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'tools' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tools</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {/* === TAB: PEOPLE === */}
        {activeTab === 'people' && (
            <>
                {/* ADD PERSON */}
                <div className="space-y-3 bg-white/40 p-3 rounded-2xl border border-white/50 shadow-sm">
                    <div className="flex gap-2">
                        <input value={newGuestName} onChange={e => setNewGuestName(e.target.value)} placeholder="Name..." className="flex-[2] bg-white border border-black/5 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10" />
                        <select value={newGuestMeal} onChange={e => setNewGuestMeal(e.target.value)} className="flex-1 bg-white border border-black/5 rounded-xl px-2 text-[10px] outline-none">
                            {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <button onClick={handleManualAddGuest} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-medium transition shadow-sm">
                        <IconUserAdd /> Add Guest
                    </button>
                    <label className="block w-full text-center cursor-pointer text-[10px] font-medium text-slate-400 hover:text-indigo-500 transition">
                        Import CSV <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* GUEST LIST */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end pb-1 px-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unseated ({unassigned.length})</span>
                        {selectedGuestIds.size > 0 && (
                            <div className="flex gap-1">
                                <select 
                                    className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] rounded-lg px-2 py-1 outline-none font-medium"
                                    onChange={(e) => assignGroupToSelected(e.target.value)}
                                >
                                    <option>Group...</option>
                                    {GROUP_COLORS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                                </select>
                                <button onClick={() => { if(window.confirm('Delete selected?')) { const newSet = new Set(selectedGuestIds); setUnassigned(prev => prev.filter(g => !newSet.has(g.id))); setSelectedGuestIds(new Set()); }}} className="text-red-400 hover:text-red-500"><IconTrash/></button>
                            </div>
                        )}
                    </div>
                    
                    <div className="min-h-[200px] space-y-1.5">
                        {unassigned.map((guest) => {
                            const isSelected = selectedGuestIds.has(guest.id);
                            const groupColor = GROUP_COLORS.find(g => g.name === guest.group)?.color || 'bg-slate-200';
                            const hasInfo = guest.diet || guest.meal !== 'Standard';
                            return (
                                <div key={guest.id} className={`flex items-center gap-3 p-2.5 rounded-xl text-xs transition border ${isSelected ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white/40 border-transparent hover:bg-white/80 hover:shadow-sm'}`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleGuestSelection(guest.id)} className="rounded-md border-slate-300 text-indigo-500 focus:ring-indigo-500/20" />
                                    <div draggable onDragStart={() => { window.draggedGuest = guest.name; window.draggedSource = 'sidebar'; }} className="flex-1 flex items-center justify-between cursor-grab">
                                        <span className="text-slate-700 font-medium">{guest.name}</span>
                                        <div className="flex items-center gap-2">
                                            {hasInfo && <span className="text-[9px] text-amber-500">★</span>}
                                            <span className={`w-2 h-2 rounded-full ${groupColor}`}></span>
                                            <button onClick={() => setEditingGuest(guest)} className="text-slate-300 hover:text-indigo-500">✎</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {unassigned.length === 0 && <div className="text-center text-slate-400 text-xs py-8 italic">All guests seated</div>}
                    </div>
                </div>
            </>
        )}

        {/* === TAB: TOOLS === */}
        {activeTab === 'tools' && (
            <div className="space-y-6">
                
                {/* ROOM ELEMENTS */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest pl-1">Room</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {['dancefloor', 'bar', 'plant', 'dj'].map(type => (
                            <button key={type} onClick={() => addDecor(type)} className="bg-white/50 hover:bg-white border border-white/60 hover:border-indigo-200 p-3 rounded-2xl text-xs font-semibold text-slate-600 transition shadow-sm capitalize">
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MAGIC SEAT */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest pl-1 flex items-center gap-1"><IconMagic /> Smart Assign</h3>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm space-y-3">
                        <select value={assignGroup} onChange={e => setAssignGroup(e.target.value)} className="w-full bg-white border border-black/5 text-xs p-2.5 rounded-xl outline-none text-slate-700 shadow-sm">
                            <option value="">Select Group...</option>
                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={assignTable} onChange={e => setAssignTable(e.target.value)} className="w-full bg-white border border-black/5 text-xs p-2.5 rounded-xl outline-none text-slate-700 shadow-sm">
                            <option value="">Start at Table...</option>
                            {realTables.map(id => <option key={id} value={id}>Table {id}</option>)}
                        </select>
                        <button onClick={handleAutoAssign} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-200">Auto-Assign Guests</button>
                    </div>
                </div>

                {/* SEATING RULES */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest pl-1 flex items-center gap-1"><IconSettings /> Constraints</h3>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm space-y-3">
                        <p className="text-[10px] font-medium text-slate-500">Prevent seating together:</p>
                        <div className="flex gap-2">
                            <select value={conflictA} onChange={e => setConflictA(e.target.value)} className="flex-1 bg-white border border-black/5 text-[10px] p-2 rounded-xl outline-none shadow-sm">
                                <option value="">Guest A</option>
                                {allGuests && allGuests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <select value={conflictB} onChange={e => setConflictB(e.target.value)} className="flex-1 bg-white border border-black/5 text-[10px] p-2 rounded-xl outline-none shadow-sm">
                                <option value="">Guest B</option>
                                {allGuests && allGuests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { if(conflictA && conflictB && conflictA !== conflictB) { const gA = allGuests.find(g=>g.id===conflictA); const gB = allGuests.find(g=>g.id===conflictB); addConflict(gA, gB); setConflictA(""); setConflictB(""); }}} className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 py-2 rounded-xl text-[10px] font-bold border border-rose-100 transition">Block Pairing</button>
                        
                        <div className="space-y-1.5 pt-1">
                            {conflicts.map(c => (
                                <div key={c.id} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-lg border border-slate-100 text-slate-500 shadow-sm">
                                    <span>{c.name1} ⚡ {c.name2}</span>
                                    <button onClick={() => removeConflict(c.id)} className="text-slate-300 hover:text-red-500 font-bold">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={exportToPDF} className="w-full py-3 bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:-translate-y-0.5 transition duration-300">
                    Export Plan PDF
                </button>
            </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-black/5 bg-white/30 flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <span className="truncate max-w-[150px]">{userEmail}</span>
        <button onClick={handleLogout} className="hover:text-slate-800 transition">Log Out</button>
      </div>

      {/* EDIT MODAL */}
      {editingGuest && (
        <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] w-full shadow-2xl ring-1 ring-black/5">
                <h3 className="text-slate-800 font-bold mb-4 text-sm">Edit Guest</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Name</label>
                        <div className="text-slate-800 font-medium text-sm">{editingGuest.name}</div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Meal</label>
                        <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none mt-1" value={editingGuest.meal || 'Standard'} onChange={e => setEditingGuest({...editingGuest, meal: e.target.value})}>
                            {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Dietary</label>
                        <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none mt-1" placeholder="e.g. Gluten Free" value={editingGuest.diet || ''} onChange={e => setEditingGuest({...editingGuest, diet: e.target.value})} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={saveGuestEdits} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-100">Save</button>
                        <button onClick={() => setEditingGuest(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}