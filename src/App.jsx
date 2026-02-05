import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// --- ICONS (SVG) ---
const IconCircle = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>;
const IconSquare = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;
const IconRect = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/></svg>;
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconUsers = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SeatingPlanner() {
  // --- STATE ---
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [planName, setPlanName] = useState("");
  
  // Data Structure Upgrade: 'unassigned' is now an array of Objects { id, name, group }
  const [unassigned, setUnassigned] = useState([]); 
  const [tables, setTables] = useState({});
  const [tablePos, setTablePos] = useState({}); 

  // Guest Management State
  const [newGuestName, setNewGuestName] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState(new Set());

  // Interaction State
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [dragState, setDragState] = useState(null); 
  const [resizeState, setResizeState] = useState(null); 

  const canvasRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.dataset.type === 'canvas-bg') setSelectedTableId(null);
    };
    window.addEventListener('pointerdown', handleClick);
    return () => window.removeEventListener('pointerdown', handleClick);
  }, []);

  // --- DATA OPERATIONS ---
  const fetchPlans = async () => {
    try {
      const { data } = await supabase.from('seating_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setPlans(data);
    } catch (err) { console.error(err); }
  };

  const loadPlan = (p) => {
    if (unassigned.length > 0 || Object.keys(tables).length > 0) {
       if (!window.confirm("Load this plan? Unsaved changes will be lost.")) return;
    }
    
    setPlanName(p.name);
    setCurrentPlanId(p.id);

    // MIGRATION: Convert old string arrays to object arrays if necessary
    let loadedGuests = p.data.unassigned || [];
    if (loadedGuests.length > 0 && typeof loadedGuests[0] === 'string') {
        loadedGuests = loadedGuests.map(name => ({ id: crypto.randomUUID(), name, group: 'None' }));
    }

    setUnassigned(loadedGuests);
    setTables(p.data.tables || {});
    setTablePos(p.data.tablePos || {});
    setSelectedTableId(null);
    setSelectedGuestIds(new Set());
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTables({});
    setTablePos({});
    setUnassigned([]);
    setPlanName("");
  };

  const savePlan = async (asNewVersion = false) => {
    if (!planName) return alert("Please name your plan.");

    const idToUse = asNewVersion ? null : currentPlanId;
    const nameToUse = asNewVersion ? `${planName} (Copy)` : planName;

    const { data, error } = await supabase.from('seating_plans').upsert({ 
      id: idToUse, 
      name: nameToUse, 
      data: { unassigned, tables, tablePos }, 
      user_id: session.user.id 
    }).select();

    if (!error) { 
      setCurrentPlanId(data[0].id); 
      if (asNewVersion) setPlanName(nameToUse);
      fetchPlans(); 
      alert(asNewVersion ? "Version saved!" : "Plan saved!"); 
    }
  };

  // --- GUEST MANAGEMENT LOGIC ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data.map(row => {
            const name = row.Name || Object.values(row)[0];
            return name ? { id: crypto.randomUUID(), name: name, group: 'None' } : null;
          }).filter(Boolean);
          
          setUnassigned(prev => [...prev, ...imported]);
        }
      });
    }
  };

  const handleManualAddGuest = (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    setUnassigned(prev => [...prev, { id: crypto.randomUUID(), name: newGuestName.trim(), group: 'None' }]);
    setNewGuestName("");
  };

  // Selection Logic
  const toggleGuestSelection = (id) => {
    const newSet = new Set(selectedGuestIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedGuestIds(newSet);
  };

  // Bulk Delete
  const deleteSelectedGuests = () => {
    if (selectedGuestIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedGuestIds.size} guests?`)) return;
    
    setUnassigned(prev => prev.filter(g => !selectedGuestIds.has(g.id)));
    setSelectedGuestIds(new Set());
  };

  // Bulk Group Assign
  const assignGroupToSelected = (groupName) => {
    setUnassigned(prev => prev.map(g => 
        selectedGuestIds.has(g.id) ? { ...g, group: groupName } : g
    ));
    setSelectedGuestIds(new Set()); // Clear selection after assign
  };

  // Drag & Drop Movement
  const moveGuest = (guestObjOrName, source, target) => {
    // Determine Name string (handle object or string inputs for compatibility)
    const guestName = typeof guestObjOrName === 'string' ? guestObjOrName : guestObjOrName.name;
    const guestGroup = typeof guestObjOrName === 'object' ? guestObjOrName.group : 'None';

    const targetCap = tablePos[target]?.capacity || 8;
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetCap) return alert("Table is full!");

    // Remove from Source
    if (source === 'sidebar') {
        setUnassigned(prev => prev.filter(g => g.name !== guestName));
    } else {
        setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== guestName) }));
    }

    // Add to Target
    if (target === 'sidebar') {
        // When moving back to sidebar, ensure it's an object
        setUnassigned(prev => [...prev, { id: crypto.randomUUID(), name: guestName, group: guestGroup }]);
    } else {
        // When moving to table, store as String (Legacy Compatibility)
        setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), guestName] }));
    }
  };

  // --- TABLE & CANVAS LOGIC ---
  const addTable = (shapeType) => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    const defaultWidth = shapeType === 'rect' ? 15 : 10; 
    const defaultHeight = shapeType === 'rect' ? 15 : null; 
    setTablePos(prev => ({ ...prev, [nextId]: { x: 50, y: 50, shape: shapeType, capacity: 8, width: defaultWidth, height: defaultHeight } }));
    setSelectedTableId(nextId); 
  };

  const updateTableShape = (id, newShape) => {
    setTablePos(prev => ({ ...prev, [id]: { ...prev[id], shape: newShape } }));
  };

  const updateTableCapacity = (id, delta) => {
    setTablePos(prev => {
        const current = prev[id].capacity || 8;
        const newCap = Math.max(2, Math.min(20, current + delta));
        return { ...prev, [id]: { ...prev[id], capacity: newCap } };
    });
  };

  const deleteTable = (id) => {
    const guestsAtTable = tables[id] || [];
    if (guestsAtTable.length > 0) {
        // Rescue guests as objects
        const rescuedGuests = guestsAtTable.map(name => ({ id: crypto.randomUUID(), name, group: 'None' }));
        setUnassigned(prev => [...prev, ...rescuedGuests]);
    }
    
    const newTables = { ...tables }; delete newTables[id]; setTables(newTables);
    const newTablePos = { ...tablePos }; delete newTablePos[id]; setTablePos(newTablePos);
    setSelectedTableId(null);
  };

  // --- INTERACTIONS ---
  const handlePointerDown = (e, id) => {
    if (e.target.closest('.no-drag')) return; 
    setSelectedTableId(id);
    e.preventDefault(); e.stopPropagation(); 
    if (!canvasRef.current) return;
    e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const currentTable = tablePos[id];
    setDragState({ id: id, offsetX: mouseXPercent - currentTable.x, offsetY: mouseYPercent - currentTable.y });
  };

  const handleResizePointerDown = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!canvasRef.current) return;
    e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    const startY = ((e.clientY - rect.top) / rect.height) * 100;
    const config = tablePos[id];
    const fallbackWidth = config.shape === 'rect' ? (10 + (config.capacity || 8)) : 10;
    const fallbackHeight = config.shape === 'rect' ? 12 : null; 
    setResizeState({ id, startX, startY, startW: config.width || fallbackWidth, startH: config.height || fallbackHeight });
  };

  const handlePointerMove = (e) => {
    if (!canvasRef.current) return;
    if (resizeState) {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const deltaX = (((e.clientX - rect.left) / rect.width) * 100) - resizeState.startX;
        const deltaY = (((e.clientY - rect.top) / rect.height) * 100) - resizeState.startY;
        let newWidth = resizeState.startW + (deltaX * 2);
        const config = tablePos[resizeState.id];
        const isRect = config.shape === 'rect';
        let newHeight = isRect ? (resizeState.startH + (deltaY * 2)) : null;
        newWidth = Math.max(5, Math.min(50, newWidth));
        if (isRect) newHeight = Math.max(5, Math.min(50, newHeight));
        setTablePos(prev => ({ ...prev, [resizeState.id]: { ...prev[resizeState.id], width: newWidth, height: newHeight } }));
        return;
    }
    if (dragState) {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        let newX = (((e.clientX - rect.left) / rect.width) * 100) - dragState.offsetX;
        let newY = (((e.clientY - rect.top) / rect.height) * 100) - dragState.offsetY;
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
        setTablePos(prev => ({ ...prev, [dragState.id]: { ...prev[dragState.id], x: newX, y: newY } }));
    }
  };

  const handlePointerUp = (e) => {
    if (dragState) { e.target.releasePointerCapture(e.pointerId); setDragState(null); }
    if (resizeState) { e.target.releasePointerCapture(e.pointerId); setResizeState(null); }
  };

  const exportToPDF = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { cacheBust: true, pixelRatio: 3 });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pageWidth - 20; 
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.setFontSize(18); pdf.text(planName || "Wedding Seating Plan", 10, 15);
      pdf.setFontSize(10); pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 22);
      pdf.addImage(dataUrl, 'PNG', 10, 30, pdfWidth, pdfHeight);
      pdf.save(`${planName || 'Seating_Plan'}.pdf`);
    } catch (err) { alert("Could not generate PDF."); }
  };

  // --- RENDER ---
  if (!session) return ( 
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email: authEmail, password: authPass }); }} className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-serif mb-6 text-center italic">Wedding Dashboard</h1>
        <input type="email" placeholder="Email" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 outline-none" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 outline-none" value={authPass} onChange={e => setAuthPass(e.target.value)} />
        <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg">Sign In</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <div className="w-80 bg-slate-900 p-5 flex flex-col border-r border-slate-800 z-20 shadow-2xl relative">
        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Guest Manager</h2>
        
        {/* MANUAL ADD */}
        <form onSubmit={handleManualAddGuest} className="flex gap-2 mb-2">
            <input 
              value={newGuestName} 
              onChange={e => setNewGuestName(e.target.value)} 
              placeholder="Guest Name..." 
              className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs outline-none focus:border-indigo-500"
            />
            <button type="submit" className="bg-indigo-600 px-3 rounded-lg font-bold text-lg hover:bg-indigo-500 shadow-md">+</button>
        </form>

        {/* CSV & ACTIONS */}
        <div className="flex gap-2 mb-4">
          <label className="flex-1 bg-slate-800 border border-slate-700 text-center p-2 rounded-lg cursor-pointer font-bold text-[9px] uppercase hover:bg-slate-700 transition text-slate-400 hover:text-white">
            Upload CSV<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* BULK ACTIONS BAR (Shows only when guests selected) */}
        {selectedGuestIds.size > 0 && (
          <div className="bg-indigo-900/50 border border-indigo-500/50 p-2 rounded-lg mb-2 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold px-1">
                <span>{selectedGuestIds.size} Selected</span>
                <button onClick={() => setSelectedGuestIds(new Set())} className="text-xs text-indigo-400 hover:text-white">&times;</button>
            </div>
            <div className="flex gap-1">
               <select 
                 className="flex-1 bg-slate-800 text-[9px] p-1.5 rounded border border-slate-700 outline-none"
                 onChange={(e) => assignGroupToSelected(e.target.value)}
                 defaultValue=""
               >
                 <option value="" disabled>Assign Group...</option>
                 {GROUP_COLORS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
               </select>
               <button onClick={deleteSelectedGuests} className="bg-red-900/80 text-white p-1.5 rounded border border-red-800 hover:bg-red-800" title="Delete Selected">
                 <IconTrash />
               </button>
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
              <div 
                key={guest.id} 
                className={`flex items-center gap-2 p-2 border rounded-lg text-[10px] transition-all
                  ${isSelected ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
              >
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => toggleGuestSelection(guest.id)}
                  className="accent-indigo-500 cursor-pointer"
                />
                <div 
                  draggable 
                  onDragStart={() => { window.draggedGuest = guest.name; window.draggedSource = 'sidebar'; }} 
                  className="flex-1 cursor-grab active:cursor-grabbing flex justify-between items-center"
                >
                  <span className="truncate">{guest.name}</span>
                  {guest.group !== 'None' && (
                    <span className={`w-2 h-2 rounded-full ${groupColor}`} title={guest.group}></span>
                  )}
                </div>
              </div>
            );
          })}
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
          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{session.user.email}</span>
          <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase">Log Out</button>
        </div>
      </div>

      {/* --- STAGE --- */}
      <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-hidden relative">
        {selectedTableId && <div className="absolute top-6 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] animate-pulse">Table Selected</div>}
        <div 
          ref={canvasRef} data-type="canvas-bg"
          className="aspect-video w-full max-h-full bg-white rounded shadow-2xl relative border border-slate-800 touch-none"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, 'sidebar'); }}
        >
          {Object.entries(tablePos).map(([id, config]) => {
            const isRect = config.shape === 'rect';
            const isCircle = !isRect && config.shape !== 'square';
            const capacity = config.capacity || 8; 
            const seated = tables[id] || [];
            const isDragging = dragState?.id === id;
            const isResizing = resizeState?.id === id;
            const isSelected = selectedTableId === id;
            const isFull = seated.length >= capacity;

            return (
              <React.Fragment key={id}>
                <div 
                  onPointerDown={(e) => handlePointerDown(e, id)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.stopPropagation(); if (window.draggedGuest) moveGuest(window.draggedGuest, window.draggedSource, id); }}
                  style={{ 
                    left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)', 
                    width: config.width ? `${config.width}%` : '14%', 
                    height: isRect ? (config.height ? `${config.height}%` : '12%') : 'auto', 
                    aspectRatio: isRect ? 'auto' : '1 / 1',
                    cursor: isDragging ? 'grabbing' : 'grab', zIndex: isDragging || isResizing || isSelected ? 50 : 10,
                  }}
                  className={`absolute flex flex-col items-center justify-center p-2 border-[3px] transition-all select-none group
                    ${isCircle ? 'rounded-full' : 'rounded-lg'} 
                    ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : (isFull ? 'border-red-500' : 'border-slate-300')}
                    ${isFull ? 'bg-red-50' : 'bg-white shadow-md hover:border-indigo-400'}`}
                >
                  {isSelected && (
                    <div className="no-drag absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, id)}>
                        <div className="w-3 h-3 bg-indigo-500 rounded-sm border border-white shadow-sm"></div>
                    </div>
                  )}
                  <span className={`text-[0.6rem] font-black mb-1 pointer-events-none uppercase tracking-tighter ${isFull ? 'text-red-800' : 'text-slate-700'}`}>Table {id}</span>
                  <div className="grid grid-cols-2 gap-0.5 w-full pointer-events-none px-1 overflow-hidden">
                    {seated.map(g => <div key={g} className="text-[0.35rem] bg-slate-100 border border-slate-200 p-0.5 rounded truncate text-center font-bold text-slate-600">{g}</div>)}
                  </div>
                </div>

                {isSelected && (
                  <div 
                    className="absolute z-[100] bg-slate-800 text-white p-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-600 no-drag"
                    style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -160%)' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                     <div className="flex bg-slate-900 rounded-full p-1 border border-slate-700">
                        <button onClick={() => updateTableShape(id, 'circle')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'circle' ? 'text-indigo-400' : 'text-slate-400'}`}><IconCircle/></button>
                        <button onClick={() => updateTableShape(id, 'square')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'square' ? 'text-indigo-400' : 'text-slate-400'}`}><IconSquare/></button>
                        <button onClick={() => updateTableShape(id, 'rect')} className={`p-1.5 rounded-full hover:bg-indigo-600 ${config.shape === 'rect' ? 'text-indigo-400' : 'text-slate-400'}`}><IconRect/></button>
                     </div>
                     <div className="h-4 w-px bg-slate-600 mx-1"></div>
                     <div className="flex items-center gap-1">
                        <button onClick={() => updateTableCapacity(id, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded-full hover:bg-white hover:text-black font-bold text-xs">-</button>
                        <span className="text-[10px] font-mono min-w-[12px] text-center">{capacity}</span>
                        <button onClick={() => updateTableCapacity(id, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded-full hover:bg-white hover:text-black font-bold text-xs">+</button>
                     </div>
                     <div className="h-4 w-px bg-slate-600 mx-1"></div>
                     <button onClick={() => deleteTable(id)} className="p-1.5 hover:bg-red-500 rounded-full text-red-400 hover:text-white transition"><IconTrash/></button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ADD TABLE CONTROLS */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-2xl flex gap-3 shadow-2xl z-40">
           <button onClick={() => addTable('circle')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
             <div className="w-8 h-8 rounded-full border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
             <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Circle</span>
           </button>
           <button onClick={() => addTable('square')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
             <div className="w-8 h-8 rounded-lg border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
             <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Square</span>
           </button>
           <button onClick={() => addTable('rect')} className="flex flex-col items-center gap-1 p-2 hover:bg-indigo-600 rounded-xl group transition">
             <div className="w-10 h-6 mt-1 rounded-lg border-2 border-slate-400 group-hover:border-white group-hover:bg-white/20"></div>
             <span className="text-[8px] font-bold uppercase text-slate-400 group-hover:text-white">Rectangle</span>
           </button>
        </div>
      </div>
    </div>
  );
}