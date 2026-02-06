import React, { useState } from 'react';

// Elegant Icons
const IconUserAdd = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IconMagic = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconSettings = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const GROUP_COLORS = [
  { name: 'None', color: 'bg-slate-500' },
  { name: 'Family', color: 'bg-rose-500' },
  { name: 'Friends', color: 'bg-orange-400' },
  { name: 'Work', color: 'bg-sky-500' },
  { name: 'VIP', color: 'bg-amber-400' },
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

  const availableGroups = [...new Set(unassigned.map(g => g.group))].filter(g => g !== 'None');
  const realTables = Object.keys(tables);

  return (
    <div className="w-80 bg-[#1c1c1e] text-slate-300 flex flex-col border-r border-white/5 z-20 shadow-2xl relative h-full font-sans">
      
      {/* HEADER: Plans */}
      <div className="p-4 border-b border-white/5">
        <div className="flex gap-2 mb-2">
            <select 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg text-xs p-2 outline-none focus:border-indigo-500 text-white"
                onChange={(e) => { const selected = plans.find(p => p.id === e.target.value); if (selected) loadPlan(selected); }}
                value={currentPlanId || ""}
            >
                <option value="" disabled>My Plans...</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => savePlan(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg text-xs font-bold">Save</button>
        </div>
        <input 
            value={planName} onChange={e => setPlanName(e.target.value)} 
            placeholder="Event Name (e.g. Summer Wedding)" 
            className="w-full bg-transparent border-none p-0 text-sm font-bold text-white placeholder-slate-600 focus:ring-0"
        />
      </div>

      {/* TABS */}
      <div className="flex border-b border-white/5">
          <button onClick={() => setActiveTab('people')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'people' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Guests</button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'tools' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Tools</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* === TAB: PEOPLE === */}
        {activeTab === 'people' && (
            <>
                {/* ADD PERSON */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input value={newGuestName} onChange={e => setNewGuestName(e.target.value)} placeholder="Name..." className="flex-[2] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500" />
                        <select value={newGuestMeal} onChange={e => setNewGuestMeal(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 text-[10px] outline-none">
                            {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <button onClick={handleManualAddGuest} className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-slate-200 py-2 rounded-lg text-xs font-bold transition">
                        <IconUserAdd /> Add Guest
                    </button>
                    <label className="block w-full text-center cursor-pointer text-[10px] text-slate-500 hover:text-indigo-400 transition">
                        or Import CSV File <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* GUEST LIST */}
                <div className="space-y-1">
                    <div className="flex justify-between items-end pb-2 border-b border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Unseated ({unassigned.length})</span>
                        {selectedGuestIds.size > 0 && (
                            <div className="flex gap-1">
                                <select 
                                    className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] rounded px-2 py-0.5 outline-none"
                                    onChange={(e) => assignGroupToSelected(e.target.value)}
                                >
                                    <option>Assign Group...</option>
                                    {GROUP_COLORS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                                </select>
                                <button onClick={() => { if(window.confirm('Delete selected?')) { const newSet = new Set(selectedGuestIds); setUnassigned(prev => prev.filter(g => !newSet.has(g.id))); setSelectedGuestIds(new Set()); }}} className="text-red-400 hover:text-white"><IconTrash/></button>
                            </div>
                        )}
                    </div>
                    
                    <div className="min-h-[200px]">
                        {unassigned.map((guest) => {
                            const isSelected = selectedGuestIds.has(guest.id);
                            const groupColor = GROUP_COLORS.find(g => g.name === guest.group)?.color || 'bg-slate-600';
                            const hasInfo = guest.diet || guest.meal !== 'Standard';
                            return (
                                <div key={guest.id} className={`flex items-center gap-3 p-2 rounded-lg text-xs transition group ${isSelected ? 'bg-indigo-900/40' : 'hover:bg-white/5'}`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleGuestSelection(guest.id)} className="rounded border-slate-600 bg-transparent checked:bg-indigo-500" />
                                    <div draggable onDragStart={() => { window.draggedGuest = guest.name; window.draggedSource = 'sidebar'; }} className="flex-1 flex items-center justify-between cursor-grab">
                                        <span className="text-slate-300">{guest.name}</span>
                                        <div className="flex items-center gap-2">
                                            {hasInfo && <span className="text-[8px] opacity-50">ℹ️</span>}
                                            <span className={`w-2 h-2 rounded-full ${groupColor}`}></span>
                                            <button onClick={() => setEditingGuest(guest)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white">✎</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {unassigned.length === 0 && <div className="text-center text-slate-600 text-xs py-8">Everyone is seated! 🎉</div>}
                    </div>
                </div>
            </>
        )}

        {/* === TAB: TOOLS === */}
        {activeTab === 'tools' && (
            <div className="space-y-8">
                
                {/* ROOM ELEMENTS */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider">Room Layout</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addDecor('dancefloor')} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-xs font-medium text-slate-300 transition">Dance Floor</button>
                        <button onClick={() => addDecor('bar')} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-xs font-medium text-slate-300 transition">Bar Area</button>
                        <button onClick={() => addDecor('plant')} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-xs font-medium text-slate-300 transition">Plant</button>
                        <button onClick={() => addDecor('dj')} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-xs font-medium text-slate-300 transition">DJ Booth</button>
                    </div>
                </div>

                {/* MAGIC SEAT */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider flex items-center gap-1"><IconMagic /> Magic Seat</h3>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                        <select value={assignGroup} onChange={e => setAssignGroup(e.target.value)} className="w-full bg-black/20 text-xs p-2 rounded-lg border border-white/10 outline-none text-slate-300">
                            <option value="">Select Group...</option>
                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={assignTable} onChange={e => setAssignTable(e.target.value)} className="w-full bg-black/20 text-xs p-2 rounded-lg border border-white/10 outline-none text-slate-300">
                            <option value="">Start at Table...</option>
                            {realTables.map(id => <option key={id} value={id}>Table {id}</option>)}
                        </select>
                        <button onClick={handleAutoAssign} className="w-full bg-indigo-600/80 hover:bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold transition">Auto-Assign</button>
                    </div>
                </div>

                {/* SEATING RULES */}
                <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider flex items-center gap-1"><IconSettings /> Seating Rules</h3>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                        <p className="text-[10px] text-slate-400">Do not seat together:</p>
                        <div className="flex gap-1">
                            <select value={conflictA} onChange={e => setConflictA(e.target.value)} className="flex-1 bg-black/20 text-[10px] p-1.5 rounded border border-white/10 outline-none">
                                <option value="">Guest A</option>
                                {allGuests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <select value={conflictB} onChange={e => setConflictB(e.target.value)} className="flex-1 bg-black/20 text-[10px] p-1.5 rounded border border-white/10 outline-none">
                                <option value="">Guest B</option>
                                {allGuests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { if(conflictA && conflictB && conflictA !== conflictB) { const gA = allGuests.find(g=>g.id===conflictA); const gB = allGuests.find(g=>g.id===conflictB); addConflict(gA, gB); setConflictA(""); setConflictB(""); }}} className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 py-1.5 rounded border border-rose-500/30 text-[10px] font-bold">Block</button>
                        
                        <div className="pt-2 space-y-1">
                            {conflicts.map(c => (
                                <div key={c.id} className="flex justify-between text-[10px] bg-black/30 p-1.5 rounded text-slate-400">
                                    <span>{c.name1} ⚡ {c.name2}</span>
                                    <button onClick={() => removeConflict(c.id)} className="text-slate-500 hover:text-white">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={exportToPDF} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition">
                    Export Plan
                </button>
            </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-600">
        <span className="truncate max-w-[150px]">{userEmail}</span>
        <button onClick={handleLogout} className="hover:text-white transition">Sign Out</button>
      </div>

      {/* EDIT MODAL */}
      {editingGuest && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-[#2c2c2e] border border-white/10 p-5 rounded-2xl w-full shadow-2xl">
                <h3 className="text-white font-bold mb-4 text-sm">Edit Guest</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Name</label>
                        <div className="text-slate-200 text-sm">{editingGuest.name}</div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Meal</label>
                        <select className="w-full bg-black/20 border border-white/10 p-2 rounded-lg text-xs text-white outline-none" value={editingGuest.meal || 'Standard'} onChange={e => setEditingGuest({...editingGuest, meal: e.target.value})}>
                            {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Dietary Needs</label>
                        <input className="w-full bg-black/20 border border-white/10 p-2 rounded-lg text-xs text-white outline-none" placeholder="e.g. Gluten Free" value={editingGuest.diet || ''} onChange={e => setEditingGuest({...editingGuest, diet: e.target.value})} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={saveGuestEdits} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold">Save</button>
                        <button onClick={() => setEditingGuest(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-xs">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}