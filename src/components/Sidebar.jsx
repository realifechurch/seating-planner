import React, { useState } from 'react';

// --- ICONS ---
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

// --- CONSTANTS ---
const GROUP_COLORS = [
  { name: 'None', color: 'bg-slate-700' },
  { name: 'Family', color: 'bg-red-500' },
  { name: 'Friends', color: 'bg-orange-500' },
  { name: 'Work', color: 'bg-blue-500' },
  { name: 'Bride', color: 'bg-pink-500' },
  { name: 'Groom', color: 'bg-indigo-500' },
  { name: 'VIP', color: 'bg-amber-500' },
  { name: 'Kids', color: 'bg-green-500' },
  { name: 'Plus Ones', color: 'bg-purple-500' },
  { name: 'Other', color: 'bg-gray-500' },
];

export default function Sidebar({
  unassigned, setUnassigned,
  plans, loadPlan, currentPlanId,
  planName, setPlanName,
  savePlan, exportToPDF, handleLogout,
  userEmail, handleFileUpload,
  tables, autoAssignGroup // <--- New Prop
}) {
  const [newGuestName, setNewGuestName] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState(new Set());
  
  // Auto-Assign Local State
  const [assignGroup, setAssignGroup] = useState("");
  const [assignTable, setAssignTable] = useState("");

  // --- LOCAL LOGIC ---
  const handleManualAddGuest = (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    setUnassigned(prev => [...prev, { id: crypto.randomUUID(), name: newGuestName.trim(), group: 'None' }]);
    setNewGuestName("");
  };

  const toggleGuestSelection = (id) => {
    const newSet = new Set(selectedGuestIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedGuestIds(newSet);
  };

  const deleteSelectedGuests = () => {
    if (selectedGuestIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedGuestIds.size} guests?`)) return;
    setUnassigned(prev => prev.filter(g => !selectedGuestIds.has(g.id)));
    setSelectedGuestIds(new Set());
  };

  const assignGroupToSelected = (groupName) => {
    setUnassigned(prev => prev.map(g => 
        selectedGuestIds.has(g.id) ? { ...g, group: groupName } : g
    ));
    setSelectedGuestIds(new Set()); 
  };

  const handleAutoAssign = () => {
    if (!assignGroup || !assignTable) return alert("Please select a group and a table.");
    autoAssignGroup(assignGroup, assignTable);
  };

  // Derived list of groups that actually exist in the sidebar
  const availableGroups = [...new Set(unassigned.map(g => g.group))].filter(g => g !== 'None');

  return (
    <div className="w-80 bg-slate-900 p-5 flex flex-col border-r border-slate-800 z-20 shadow-2xl relative h-full">
      <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Guest Manager</h2>
      
      {/* MANUAL ADD */}
      <form onSubmit={handleManualAddGuest} className="flex gap-2 mb-2">
        <input value={newGuestName} onChange={e => setNewGuestName(e.target.value)} placeholder="Guest Name..." className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs outline-none focus:border-indigo-500" />
        <button type="submit" className="bg-indigo-600 px-3 rounded-lg font-bold text-lg hover:bg-indigo-500 shadow-md">+</button>
      </form>

      {/* CSV & ACTIONS */}
      <div className="flex gap-2 mb-4">
        <label className="flex-1 bg-slate-800 border border-slate-700 text-center p-2 rounded-lg cursor-pointer font-bold text-[9px] uppercase hover:bg-slate-700 transition text-slate-400 hover:text-white">
          Upload CSV<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={() => setUnassigned([])} className="px-3 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white uppercase">Clear</button>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedGuestIds.size > 0 && (
        <div className="bg-indigo-900/50 border border-indigo-500/50 p-2 rounded-lg mb-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold px-1">
            <span>{selectedGuestIds.size} Selected</span>
            <button onClick={() => setSelectedGuestIds(new Set())} className="text-xs text-indigo-400 hover:text-white">&times;</button>
          </div>
          <div className="flex gap-1">
             <select className="flex-1 bg-slate-800 text-[9px] p-1.5 rounded border border-slate-700 outline-none" onChange={(e) => assignGroupToSelected(e.target.value)} defaultValue="">
               <option value="" disabled>Assign Group...</option>
               {GROUP_COLORS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
             </select>
             <button onClick={deleteSelectedGuests} className="bg-red-900/80 text-white p-1.5 rounded border border-red-800 hover:bg-red-800" title="Delete Selected"><IconTrash /></button>
          </div>
        </div>
      )}

      {/* GUEST LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar bg-slate-900/50 rounded-xl mb-4 p-2">
        {unassigned.length === 0 && <p className="text-[10px] text-slate-600 text-center mt-4 italic">Add guests to start</p>}
        {unassigned.map((guest) => {
          const isSelected = selectedGuestIds.has(guest.id);
          const groupColor = GROUP_COLORS.find(g => g.name === guest.group)?.color || 'bg-slate-700';
          return (
            <div key={guest.id} className={`flex items-center gap-2 p-2 border rounded-lg text-[10px] transition-all ${isSelected ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleGuestSelection(guest.id)} className="accent-indigo-500 cursor-pointer" />
              <div draggable onDragStart={() => { window.draggedGuest = guest.name; window.draggedSource = 'sidebar'; }} className="flex-1 cursor-grab active:cursor-grabbing flex justify-between items-center">
                <span className="truncate">{guest.name}</span>
                {guest.group !== 'None' && <span className={`w-2 h-2 rounded-full ${groupColor}`} title={guest.group}></span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW: AUTO-ASSIGN GROUP */}
      <div className="mb-4 border-t border-slate-800 pt-2">
         <p className="text-[9px] font-bold text-indigo-400 uppercase mb-2">Auto-Assign Group:</p>
         <div className="flex flex-col gap-2">
            <div className="flex gap-1">
                <select value={assignGroup} onChange={e => setAssignGroup(e.target.value)} className="flex-1 bg-slate-800 text-[10px] p-1.5 rounded border border-slate-700 outline-none">
                    <option value="" disabled>Group...</option>
                    {availableGroups.length > 0 ? availableGroups.map(g => <option key={g} value={g}>{g}</option>) : <option disabled>No Groups</option>}
                </select>
                <select value={assignTable} onChange={e => setAssignTable(e.target.value)} className="flex-1 bg-slate-800 text-[10px] p-1.5 rounded border border-slate-700 outline-none">
                    <option value="" disabled>Start Table...</option>
                    {Object.keys(tables).map(id => <option key={id} value={id}>Table {id}</option>)}
                </select>
            </div>
            <button onClick={handleAutoAssign} className="w-full bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[10px] py-1.5 rounded border border-indigo-900 font-bold">
               Go (Waterfall Fill)
            </button>
         </div>
      </div>

      {/* PLAN CONTROLS */}
      <div className="border-t border-slate-800 pt-4 space-y-3">
         <div className="relative">
           <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Load Project / Version:</p>
           <select 
             className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-[10px] outline-none focus:border-indigo-500 cursor-pointer text-slate-300"
             onChange={(e) => { const selected = plans.find(p => p.id === e.target.value); if (selected) loadPlan(selected); }}
             value={currentPlanId || ""}
           >
              <option value="" disabled>-- Select a Plan --</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({new Date(p.created_at).toLocaleDateString()})</option>)}
           </select>
         </div>
         <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Current Plan Name..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors" />
         <div className="grid grid-cols-2 gap-2">
           <button onClick={() => savePlan(false)} className="bg-emerald-600 p-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-emerald-500 shadow-lg text-white">Save</button>
           <button onClick={() => savePlan(true)} className="bg-slate-700 p-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-600 shadow-lg text-slate-300">Save Copy</button>
         </div>
         <button onClick={exportToPDF} className="w-full bg-slate-800 border border-slate-700 text-slate-400 p-2.5 rounded-xl font-bold text-[10px] uppercase hover:text-white transition">Export to PDF</button>
      </div>

      {/* LOGOUT */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{userEmail}</span>
        <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase">Log Out</button>
      </div>
    </div>
  );
}