import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// --- COMPONENT IMPORTS ---
import Auth from './components/Auth';
import Sidebar from './components/SidebarPanel'; 
import Stage from './components/Stage';
import Stage3D from './components/Stage3D'; 
import PlanManager from './components/PlanManager';
import useUndoRedo from './hooks/useUndoRedo';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// --- ICONS ---
const Icon3D = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/></svg>;
const Icon2D = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;

export default function SeatingPlanner() {
  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [planName, setPlanName] = useState("");
  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [isPlanManagerOpen, setIsPlanManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('2D'); 

  // --- HISTORY ---
  const { state: currentModel, setContent: setModel, undo, redo, canUndo, canRedo, reset: resetHistory } = useUndoRedo({
    unassigned: [],
    tables: {},
    tablePos: {},
    conflicts: []
  });

  const unassigned = currentModel?.unassigned || [];
  const tables = currentModel?.tables || {};
  // The "Committed" positions (saved in history)
  const committedTablePos = currentModel?.tablePos || {};
  const conflicts = currentModel?.conflicts || [];

  const [selectedTableId, setSelectedTableId] = useState(null);
  
  // --- DRAG & RESIZE STATE ---
  const [dragState, setDragState] = useState(null); 
  const [resizeState, setResizeState] = useState(null); 
  
  // --- TEMP STATE (For smooth dragging without crashing history) ---
  const [tempTablePos, setTempTablePos] = useState(null);

  const [viewScale, setViewScale] = useState(1); 
  const canvasRef = useRef(null);

  // --- MERGE LOGIC ---
  // If we are dragging, show the temp positions. Otherwise show the committed ones.
  const displayTablePos = tempTablePos || committedTablePos;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

  // Auto-save logic
  useEffect(() => {
    if (!currentPlanId) return; 
    setSaveStatus('saving');
    const timer = setTimeout(async () => { await savePlan(false, true); }, 3000); 
    return () => clearTimeout(timer);
  }, [currentModel, planName]);

  const updateModel = (updates) => { setModel({ ...currentModel, ...updates }); };
  
  // These helpers update the History directly (for non-drag actions like adding/deleting)
  const setUnassigned = (val) => updateModel({ unassigned: typeof val === 'function' ? val(unassigned) : val });
  const setTables = (val) => updateModel({ tables: typeof val === 'function' ? val(tables) : val });
  // We only use this for "instant" changes (like shape change), NOT for dragging
  const setTablePosDirect = (val) => updateModel({ tablePos: typeof val === 'function' ? val(committedTablePos) : val });
  const setConflicts = (val) => updateModel({ conflicts: typeof val === 'function' ? val(conflicts) : val });

  const fetchPlans = async () => {
    try {
      const { data } = await supabase.from('seating_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setPlans(data || []);
    } catch (err) { console.error(err); }
  };

  const loadPlan = (p) => {
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    const safeData = p.data || {};
    const normalizeGuests = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map(g => (typeof g === 'string' ? { id: crypto.randomUUID(), name: g, group: 'None', meal: 'Standard', diet: '' } : g));
    };
    const loadedState = {
        unassigned: normalizeGuests(safeData.unassigned),
        tables: {},
        tablePos: safeData.tablePos || {},
        conflicts: safeData.conflicts || []
    };
    Object.keys(safeData.tables || {}).forEach(key => { loadedState.tables[key] = normalizeGuests(safeData.tables[key]); });
    resetHistory(loadedState);
    setSelectedTableId(null);
    setIsPlanManagerOpen(false);
  };

  const handleDeletePlan = async (id) => {
      await supabase.from('seating_plans').delete().eq('id', id);
      fetchPlans();
      if(currentPlanId === id) {
          setCurrentPlanId(null);
          setPlanName("");
          resetHistory({ unassigned: [], tables: {}, tablePos: {}, conflicts: [] });
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); 
    resetHistory({ unassigned: [], tables: {}, tablePos: {}, conflicts: [] });
    setPlanName(""); 
  };

  const savePlan = async (asNewVersion = false, silent = false) => {
    if (!planName) return; 
    setSaveStatus('saving');
    let thumbnailUrl = null;
    if (canvasRef.current && viewMode === '2D') {
        try { thumbnailUrl = await toPng(canvasRef.current, { pixelRatio: 0.5, cacheBust: true, width: 800 }); } 
        catch(e) { console.log('Thumbnail generation failed'); }
    }
    const idToUse = asNewVersion ? null : currentPlanId;
    const nameToUse = asNewVersion ? `${planName} (Copy)` : planName;
    const { data, error } = await supabase.from('seating_plans').upsert({ 
      id: idToUse, name: nameToUse, thumbnail: thumbnailUrl, data: { ...currentModel }, user_id: session.user.id 
    }).select();
    if (!error) { 
      setCurrentPlanId(data[0].id); 
      if (asNewVersion) setPlanName(nameToUse);
      if (!silent) fetchPlans(); 
      setSaveStatus('saved');
    } else { setSaveStatus('error'); }
  };

  const handleSmartFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, { 
        header: true, skipEmptyLines: true, 
        complete: (results) => {
            const csvRows = results.data.filter(row => row.Name || Object.values(row)[0]);
            const incomingDataMap = new Map();
            csvRows.forEach(row => {
                const name = row.Name || Object.values(row)[0];
                if (name) incomingDataMap.set(name, { name: name, group: row.Group || 'None', meal: row.Meal || 'Standard', diet: row.Diet || '' });
            });
            let nextUnassigned = unassigned.map(g => incomingDataMap.has(g.name) ? { ...g, ...incomingDataMap.get(g.name) } : g);
            const nextTables = { ...tables };
            Object.keys(nextTables).forEach(tableId => {
                nextTables[tableId] = nextTables[tableId].map(g => incomingDataMap.has(g.name) ? { ...g, ...incomingDataMap.get(g.name) } : g);
            });
            const allCurrentNames = new Set([ ...nextUnassigned.map(g => g.name), ...Object.values(nextTables).flat().map(g => g.name) ]);
            incomingDataMap.forEach((data, name) => {
                if (!allCurrentNames.has(name)) nextUnassigned.push({ id: crypto.randomUUID(), ...data });
            });
            updateModel({ unassigned: nextUnassigned, tables: nextTables });
        }
    });
  };

  const moveGuest = (guestObjOrName, source, target) => {
    let guestObj = null;
    const guestName = typeof guestObjOrName === 'string' ? guestObjOrName : guestObjOrName.name;
    if (source === 'sidebar') guestObj = unassigned.find(g => g.name === guestName);
    else guestObj = tables[source]?.find(g => g.name === guestName);
    if (!guestObj) guestObj = { id: crypto.randomUUID(), name: guestName, group: 'None', meal: 'Standard', diet: '' };
    if (committedTablePos[target]?.capacity === 0) return; 
    const targetCap = committedTablePos[target]?.capacity || 8;
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetCap) return alert("Table is full!");
    let nextUnassigned = [...unassigned];
    let nextTables = { ...tables };
    if (source === 'sidebar') nextUnassigned = nextUnassigned.filter(g => g.name !== guestName);
    else nextTables[source] = nextTables[source].filter(g => (typeof g === 'string' ? g : g.name) !== guestName);
    if (target === 'sidebar') nextUnassigned.push(guestObj);
    else nextTables[target] = [...(nextTables[target] || []), guestObj];
    updateModel({ unassigned: nextUnassigned, tables: nextTables });
  };

  const swapGuests = (tableId, fromIndex, toIndex) => {
    const tableGuests = [...(tables[tableId] || [])];
    if(fromIndex < 0 || fromIndex >= tableGuests.length || toIndex < 0 || toIndex >= tableGuests.length) return;
    const temp = tableGuests[fromIndex];
    tableGuests[fromIndex] = tableGuests[toIndex];
    tableGuests[toIndex] = temp;
    updateModel({ tables: { ...tables, [tableId]: tableGuests } });
  };

  useEffect(() => {
    const handleSidebarDrop = (e) => {
        const { guestName, source } = e.detail;
        if (source !== 'sidebar') moveGuest(guestName, source, 'sidebar');
    };
    window.addEventListener('guest-dropped-sidebar', handleSidebarDrop);
    return () => window.removeEventListener('guest-dropped-sidebar', handleSidebarDrop);
  }, [tables, unassigned]);

  useEffect(() => {
    const handleClick = (e) => { if (e.target.dataset.type === 'canvas-bg') setSelectedTableId(null); };
    window.addEventListener('pointerdown', handleClick);
    return () => window.removeEventListener('pointerdown', handleClick);
  }, []);

  const addTable = (shapeType) => {
    const nextId = Object.keys(tables).length + 1;
    const defaultWidth = shapeType === 'rect' ? 15 : 10; 
    const defaultHeight = shapeType === 'rect' ? 15 : null; 
    updateModel({
        tables: { ...tables, [nextId]: [] },
        tablePos: { ...committedTablePos, [nextId]: { x: 50, y: 50, type: 'table', shape: shapeType, capacity: 8, width: defaultWidth, height: defaultHeight } }
    });
    setSelectedTableId(nextId); 
  };

  const addDecor = (type) => {
    const nextId = Object.keys(tables).length + 1;
    let w = 15, h = 15, shape = 'rect';
    if (type === 'dancefloor') { w = 30; h = 25; }
    if (type === 'bar') { w = 20; h = 10; }
    if (type === 'plant') { w = 5; h = null; shape = 'circle'; }
    if (type === 'dj') { w = 10; h = null; shape = 'square'; }
    updateModel({
        tables: { ...tables, [nextId]: [] },
        tablePos: { ...committedTablePos, [nextId]: { x: 50, y: 50, type: type, shape: shape, capacity: 0, width: w, height: h } }
    });
    setSelectedTableId(nextId);
  };

  const deleteTable = (id) => {
    const guestsAtTable = tables[id] || [];
    let nextUnassigned = [...unassigned];
    if (guestsAtTable.length > 0) {
        const rescued = guestsAtTable.map(g => (typeof g === 'string' ? { id: crypto.randomUUID(), name: g, group: 'None' } : g));
        nextUnassigned = [...nextUnassigned, ...rescued];
    }
    const newTables = { ...tables }; delete newTables[id];
    const newTablePos = { ...committedTablePos }; delete newTablePos[id];
    updateModel({ unassigned: nextUnassigned, tables: newTables, tablePos: newTablePos });
    setSelectedTableId(null);
  };

  const updateTableShape = (id, newShape) => setTablePosDirect(prev => ({ ...prev, [id]: { ...prev[id], shape: newShape } }));
  const updateTableCapacity = (id, delta) => setTablePosDirect(prev => {
      if (prev[id].type !== 'table' && prev[id].type !== undefined) return prev;
      const current = prev[id].capacity || 8;
      const newCap = Math.max(2, Math.min(20, current + delta));
      return { ...prev, [id]: { ...prev[id], capacity: newCap } };
  });

  const handlePointerDown = (e, id) => {
    if (e.target.closest('.no-drag')) return; 
    setSelectedTableId(id); e.preventDefault(); e.stopPropagation(); 
    if (!canvasRef.current) return; e.target.setPointerCapture(e.pointerId);
    
    // Initialize Drag Logic
    const rect = canvasRef.current.getBoundingClientRect();
    const currentTable = committedTablePos[id];
    
    // Copy current REAL positions to TEMP positions so we can edit safely
    setTempTablePos({ ...committedTablePos });
    
    setDragState({ id: id, offsetX: ((e.clientX - rect.left) / rect.width) * 100 - currentTable.x, offsetY: ((e.clientY - rect.top) / rect.height) * 100 - currentTable.y });
  };

  const handleResizePointerDown = (e, id) => {
    e.preventDefault(); e.stopPropagation(); if (!canvasRef.current) return; e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const config = committedTablePos[id];
    
    // Copy current REAL positions to TEMP positions
    setTempTablePos({ ...committedTablePos });

    const fallbackWidth = config.shape === 'rect' ? (10 + (config.capacity || 8)) : 10;
    const fallbackHeight = config.shape === 'rect' ? 12 : null; 
    setResizeState({ id, startX: ((e.clientX - rect.left) / rect.width) * 100, startY: ((e.clientY - rect.top) / rect.height) * 100, startW: config.width || fallbackWidth, startH: config.height || fallbackHeight });
  };

  const handlePointerMove = (e) => {
    if (!canvasRef.current) return;
    // If not dragging/resizing, do nothing
    if (!dragState && !resizeState) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const curX = ((e.clientX - rect.left) / rect.width) * 100;
    const curY = ((e.clientY - rect.top) / rect.height) * 100;

    // --- CRITICAL FIX: Update TEMP state, NOT Undo History ---
    if (resizeState) {
        e.preventDefault();
        const deltaX = curX - resizeState.startX;
        const deltaY = curY - resizeState.startY;
        let newWidth = resizeState.startW + (deltaX * 2);
        // Safely access current config from temp state
        const config = tempTablePos[resizeState.id] || committedTablePos[resizeState.id];
        const isRect = config.shape === 'rect';
        let newHeight = isRect ? (resizeState.startH + (deltaY * 2)) : null;
        newWidth = Math.max(3, Math.min(80, newWidth));
        if (isRect) newHeight = Math.max(3, Math.min(80, newHeight));
        
        setTempTablePos(prev => ({ ...prev, [resizeState.id]: { ...prev[resizeState.id], width: newWidth, height: newHeight } }));
    } else if (dragState) {
        e.preventDefault();
        let newX = curX - dragState.offsetX;
        let newY = curY - dragState.offsetY;
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
        
        setTempTablePos(prev => ({ ...prev, [dragState.id]: { ...prev[dragState.id], x: newX, y: newY } }));
    }
  };

  const handlePointerUp = (e) => {
    // If we were dragging/resizing, this is the moment we SAVE to history
    if (dragState || resizeState) {
        e.target.releasePointerCapture(e.pointerId);
        
        // COMMIT the temp state to the Real History Model
        if (tempTablePos) {
            updateModel({ tablePos: tempTablePos });
        }
        
        // Clear temp states
        setDragState(null);
        setResizeState(null);
        setTempTablePos(null); // Switch back to reading from History
    }
  };

  const updateGuestDetails = (id, updates) => {
    const inUnassigned = unassigned.find(g => g.id === id);
    if (inUnassigned) { updateModel({ unassigned: unassigned.map(g => g.id === id ? { ...g, ...updates } : g) }); return; }
    for (const [tableId, guests] of Object.entries(tables)) {
        if (guests.find(g => g.id === id)) { updateModel({ tables: { ...tables, [tableId]: tables[tableId].map(g => g.id === id ? { ...g, ...updates } : g) } }); return; }
    }
  };

  const handleUnseatAll = () => {
    if (!window.confirm("Unseat everyone?")) return;
    const allSeatedGuests = Object.values(tables).flat();
    const emptyTables = {};
    Object.keys(tables).forEach(id => emptyTables[id] = []);
    updateModel({ tables: emptyTables, unassigned: [...unassigned, ...allSeatedGuests] });
  };

  const handleClearUnseatedList = () => {
    if (!window.confirm("Delete all unseated guests?")) return;
    updateModel({ unassigned: [] });
  };

  const addConflict = (guestA, guestB) => {
    const exists = conflicts.find(c => (c.guest1Id === guestA.id && c.guest2Id === guestB.id) || (c.guest1Id === guestB.id && c.guest2Id === guestA.id));
    if (exists) return alert("Rule already exists.");
    updateModel({ conflicts: [...conflicts, { id: crypto.randomUUID(), guest1Id: guestA.id, guest2Id: guestB.id, name1: guestA.name, name2: guestB.name }] });
  };

  const removeConflict = (conflictId) => { updateModel({ conflicts: conflicts.filter(c => c.id !== conflictId) }); };

  const conflictTableIds = Object.entries(tables || {}).reduce((acc, [tableId, guests]) => {
      const guestIdsOnTable = new Set(guests.map(g => g.id));
      const hasConflict = conflicts.some(c => guestIdsOnTable.has(c.guest1Id) && guestIdsOnTable.has(c.guest2Id));
      if (hasConflict) acc.push(tableId);
      return acc;
  }, []);

  const allGuests = [ ...unassigned, ...Object.values(tables || {}).flat() ].sort((a,b) => a.name.localeCompare(b.name));

  if (!session) return <Auth supabase={supabase} />;

  return (
    <div className="flex h-screen w-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden font-sans relative selection:bg-indigo-500/20">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="absolute bottom-6 right-6 z-[60] flex gap-2">
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-xl border border-white/50 flex gap-1 ring-1 ring-black/5">
            <button onClick={() => setViewMode('2D')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === '2D' ? 'bg-[#1D1D1F] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}><Icon2D /> 2D</button>
            <button onClick={() => setViewMode('3D')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === '3D' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}><Icon3D /> 3D</button>
        </div>
      </div>

      {isPlanManagerOpen && ( <PlanManager plans={plans} onClose={() => setIsPlanManagerOpen(false)} onLoad={loadPlan} onDelete={handleDeletePlan} /> )}

      <Sidebar 
        unassigned={unassigned} setUnassigned={setUnassigned} plans={plans} planName={planName} setPlanName={setPlanName}
        savePlan={savePlan} saveStatus={saveStatus} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
        openPlanManager={() => { fetchPlans(); setIsPlanManagerOpen(true); }} handleLogout={handleLogout} userEmail={session.user.email} 
        handleFileUpload={handleSmartFileUpload} tables={tables} autoAssignGroup={() => {}} addDecor={addDecor} updateGuestDetails={updateGuestDetails}
        conflicts={conflicts} addConflict={addConflict} removeConflict={removeConflict} allGuests={allGuests} unseatAll={handleUnseatAll} 
        clearUnseatedList={handleClearUnseatedList} exportToPDF={async () => {
            if (!canvasRef.current || viewMode !== '2D') return alert("Switch to 2D view to export PDF.");
            try {
              const dataUrl = await toPng(canvasRef.current, { cacheBust: true, pixelRatio: 3 });
              const pdf = new jsPDF('l', 'mm', 'a4');
              const pageWidth = pdf.internal.pageSize.getWidth();
              const imgProps = pdf.getImageProperties(dataUrl);
              const pdfWidth = pageWidth - 20; 
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              pdf.setFontSize(18); pdf.text(planName || "Seating Layout", 10, 15);
              pdf.setFontSize(10); pdf.text(`Generated on Gather: ${new Date().toLocaleDateString()}`, 10, 22);
              pdf.addImage(dataUrl, 'PNG', 10, 30, pdfWidth, pdfHeight);
              pdf.save(`${planName || 'Gather_Plan'}.pdf`);
            } catch (err) { alert("Could not generate PDF."); }
        }}
      />
      
      {viewMode === '2D' ? (
          <Stage 
            canvasRef={canvasRef} 
            tablePos={displayTablePos} // <-- Using the smart display prop
            tables={tables} selectedTableId={selectedTableId} dragState={dragState} resizeState={resizeState}
            handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp} handleResizePointerDown={handleResizePointerDown}
            moveGuest={moveGuest} swapGuests={swapGuests} addTable={addTable} updateTableShape={updateTableShape} updateTableCapacity={updateTableCapacity} deleteTable={deleteTable}
            conflictTableIds={conflictTableIds} viewScale={viewScale} setViewScale={setViewScale}
          />
      ) : (
          <Stage3D tables={tables} tablePos={committedTablePos} />
      )}
    </div>
  );
}