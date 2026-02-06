import React, { useState } from 'react';

const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconEdit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

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

const MEAL_OPTIONS = ['Standard', 'Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan', 'Child', 'Vendor'];

export default function Sidebar({
  unassigned, setUnassigned,
  plans, loadPlan, currentPlanId,
  planName, setPlanName,
  savePlan, exportToPDF, handleLogout,
  userEmail, handleFileUpload,
  tables, autoAssignGroup, addDecor,
  updateGuestDetails // NEW
}) {
  const [newGuestName, setNewGuestName] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState(new Set());
  
  const [assignGroup, setAssignGroup] = useState("");
  const [assignTable, setAssignTable] = useState("");

  // Edit Modal State
  const [editingGuest, setEditingGuest] = useState(null); // { id, meal, diet, name }

  const handleManualAddGuest = (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    setUnassigned(prev => [...prev, { id: crypto.randomUUID(), name: newGuestName.trim(), group: 'None', meal: 'Standard', diet: '' }]);
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
    setUnassigned(prev => prev.map(g => selectedGuestIds.has(g.id) ? { ...g, group: groupName } : g));
    setSelectedGuestIds(new Set()); 
  };

  const handleAutoAssign = () => {
    if (!assignGroup || !assignTable) return alert("Please select a group and a table.");
    autoAssignGroup(assignGroup, assignTable);
  };

  const saveGuestEdits = () => {
    if (!editingGuest) return;
    updateGuestDetails(editingGuest.id, { meal: editingGuest.meal, diet: editingGuest.diet });
    setEditingGuest(null);
  };

  const availableGroups = [...new Set(unassigned.map(g => g.group))].filter(g => g !== 'None');
  const realTables = Object.keys(tables); // Simplified filter

  return (
    <div className="w-80 bg-slate-900 p-5 flex flex-col border-r border-slate-800 z-20 shadow-2xl relative h-full">
      <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Guest Manager</h2>
      
      {/* EDIT MODAL OVERLAY */}
      {editingGuest && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-600 p-4 rounded-xl w-full shadow-2xl">
                <h3 className="text-white font-bold mb-2">Edit Guest</h3>
                <p className="text-slate-400 text-xs mb-3">{editingGuest.name}</p>
                
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Meal Preference</label>
                <select 
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded mb-3 text-xs text-white"
                    value={editingGuest.meal || 'Standard'}
                    onChange={e => setEditingGuest({...editingGuest, meal: e.target.value})}
                >
                    {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Dietary Restrictions</label>
                <input 
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded mb-4 text-xs text-white"
                    placeholder="e.g. Gluten Free, Nut Allergy"
                    value={editingGuest.diet || ''}
                    onChange={e => setEditingGuest({...editingGuest, diet: e.target.value})}
                />

                <div className="flex gap-2">
                    <button onClick={saveGuestEdits} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-xs font-bold">Save</button>
                    <button onClick={() => setEditingGuest(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs">Cancel</button>
                </div>
            </div>
        </div>
      )}

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

      {/* BULK ACTIONS */}
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
              <div draggable onDragStart={() => { window.draggedGuest = guest.name; window.draggedSource = 'sidebar'; }} className="flex-1 cursor-grab active:cursor-grabbing flex justify-between items-center overflow-hidden">
                <span className="truncate mr-2">{guest.name}</span>
                <div className="flex items-center gap-1">
                    {/* EDIT BUTTON */}
                    <button onClick={() => setEditingGuest(guest)} className="text-slate-500 hover:text-white"><IconEdit /></button>
                    {guest.group !== 'None' && <span className={`w-2 h-2 rounded-full ${groupColor}`} title={guest.group}></span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DECOR */}
      <div className="mb-4 border-t border-slate-800 pt-2">
         <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Room Elements:</p>
         <div className="grid grid-cols-2 gap-2 mb-2">
             <button onClick={() => addDecor('dancefloor')} className="bg-slate-800 p-2 rounded border border-slate-700 hover:bg-slate-700 text-[9px] font-bold text-slate-300">Dance Floor</button>
             <button onClick={() => addDecor('bar')} className="bg-slate-800 p-2 rounded border border-slate-700 hover:bg-slate-700 text-[9px] font-bold text-slate-300">Bar Area</button>
             <button onClick={() => addDecor('plant')} className="bg-slate-800 p-2 rounded border border-slate-700 hover:bg-slate-700 text-[9px] font-bold text-slate-300">Plant</button>
             <button onClick={() => addDecor('dj')} className="bg-slate-800 p-2 rounded border border-slate-700 hover:bg-slate-700 text-[9px] font-bold text-slate-300">DJ Booth</button>
         </div>
      </div>

      {/* AUTO ASSIGN */}
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
                    {realTables.map(id => <option key={id} value={id}>Table {id}</option>)}
                </select>
            </div>
            <button onClick={handleAutoAssign} className="w-full bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[10px] py-1.5 rounded border border-indigo-900 font-bold">Go</button>
         </div>
      </div>

      {/* PLAN CONTROLS */}
      <div className="border-t border-slate-800 pt-4 space-y-3">
         <div className="relative">
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

      <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{userEmail}</span>
        <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase">Log Out</button>
      </div>
    </div>
  );
}