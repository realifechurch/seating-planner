import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// --- COMPONENT IMPORTS ---
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Stage from './components/Stage';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SeatingPlanner() {
  // --- GLOBAL STATE ---
  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [planName, setPlanName] = useState("");
  
  // Safe defaults
  const [unassigned, setUnassigned] = useState([]); 
  const [tables, setTables] = useState({}); 
  const [tablePos, setTablePos] = useState({}); 
  const [conflicts, setConflicts] = useState([]); 

  // UX State
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [dragState, setDragState] = useState(null); 
  const [resizeState, setResizeState] = useState(null); 
  const [viewScale, setViewScale] = useState(1); 

  const canvasRef = useRef(null);

  // --- AUTH & INIT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

  // Listener for Dragging back to Sidebar
  useEffect(() => {
    const handleSidebarDrop = (e) => {
        const { guestName, source } = e.detail;
        if (source !== 'sidebar') {
             moveGuest(guestName, source, 'sidebar');
        }
    };
    window.addEventListener('guest-dropped-sidebar', handleSidebarDrop);
    return () => window.removeEventListener('guest-dropped-sidebar', handleSidebarDrop);
  }, [tables, unassigned]);

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.dataset.type === 'canvas-bg') setSelectedTableId(null);
    };
    window.addEventListener('pointerdown', handleClick);
    return () => window.removeEventListener('pointerdown', handleClick);
  }, []);

  // --- DATA LOGIC ---
  const fetchPlans = async () => {
    try {
      const { data } = await supabase.from('seating_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setPlans(data || []);
    } catch (err) { console.error(err); }
  };

  const loadPlan = (p) => {
    if (unassigned.length > 0 || Object.keys(tables).length > 0) {
       if (!window.confirm("Load plan? Unsaved changes lost.")) return;
    }
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    
    // SAFETY CHECK: Handle null/undefined data gracefully
    const safeData = p.data || {};
    
    const normalizeGuests = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map(g => (typeof g === 'string' ? { id: crypto.randomUUID(), name: g, group: 'None', meal: 'Standard', diet: '' } : g));
    };

    setUnassigned(normalizeGuests(safeData.unassigned));
    
    const loadedTables = safeData.tables || {};
    const normalizedTables = {};
    Object.keys(loadedTables).forEach(key => { normalizedTables[key] = normalizeGuests(loadedTables[key]); });

    setTables(normalizedTables);
    setTablePos(safeData.tablePos || {});
    setConflicts(safeData.conflicts || []); 
    setSelectedTableId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setTables({}); setTablePos({}); setUnassigned([]); setPlanName(""); setConflicts([]);
  };

  const savePlan = async (asNewVersion = false) => {
    if (!planName) return alert("Please name your plan.");
    const idToUse = asNewVersion ? null : currentPlanId;
    const nameToUse = asNewVersion ? `${planName} (Copy)` : planName;
    const { data, error } = await supabase.from('seating_plans').upsert({ 
      id: idToUse, name: nameToUse, 
      data: { unassigned, tables, tablePos, conflicts }, 
      user_id: session.user.id 
    }).select();
    if (!error) { 
      setCurrentPlanId(data[0].id); if (asNewVersion) setPlanName(nameToUse);
      fetchPlans(); alert(asNewVersion ? "Version saved!" : "Plan saved!"); 
    }
  };

  // --- CSV & LIST MANAGEMENT ---
  const handleSmartFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, { 
        header: true, 
        skipEmptyLines: true, 
        complete: (results) => {
            const csvRows = results.data.filter(row => row.Name || Object.values(row)[0]);
            
            const incomingDataMap = new Map();
            csvRows.forEach(row => {
                const name = row.Name || Object.values(row)[0];
                if (name) {
                    incomingDataMap.set(name, {
                        name: name,
                        group: row.Group || 'None',
                        meal: row.Meal || 'Standard',
                        diet: row.Diet || ''
                    });
                }
            });

            let newUnassigned = unassigned.map(g => incomingDataMap.has(g.name) ? { ...g, ...incomingDataMap.get(g.name) } : g);
            const newTables = { ...tables };
            Object.keys(newTables).forEach(tableId => {
                newTables[tableId] = newTables[tableId].map(g => incomingDataMap.has(g.name) ? { ...g, ...incomingDataMap.get(g.name) } : g);
            });

            const allCurrentNames = new Set([
                ...newUnassigned.map(g => g.name),
                ...Object.values(newTables).flat().map(g => g.name)
            ]);

            incomingDataMap.forEach((data, name) => {
                if (!allCurrentNames.has(name)) {
                    newUnassigned.push({ id: crypto.randomUUID(), ...data });
                }
            });

            setUnassigned(newUnassigned);
            setTables(newTables);
        }
    });
  };

  const handleUnseatAll = () => {
    if (!window.confirm("Unseat everyone?")) return;
    const allSeatedGuests = Object.values(tables).flat();
    const emptyTables = {};
    Object.keys(tables).forEach(id => emptyTables[id] = []);
    setTables(emptyTables);
    setUnassigned(prev => [...prev, ...allSeatedGuests]);
  };

  const handleClearUnseatedList = () => {
    if (!window.confirm("Delete all unseated guests?")) return;
    setUnassigned([]); 
  };

  // --- CONFLICT LOGIC ---
  const addConflict = (guestA, guestB) => {
    const exists = conflicts.find(c => 
        (c.guest1Id === guestA.id && c.guest2Id === guestB.id) || 
        (c.guest1Id === guestB.id && c.guest2Id === guestA.id)
    );
    if (exists) return alert("Rule already exists.");

    setConflicts(prev => [...prev, {
        id: crypto.randomUUID(),
        guest1Id: guestA.id,
        guest2Id: guestB.id,
        name1: guestA.name,
        name2: guestB.name
    }]);
  };

  const removeConflict = (conflictId) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  const conflictTableIds = Object.entries(tables).reduce((acc, [tableId, guests]) => {
      const guestIdsOnTable = new Set(guests.map(g => g.id));
      const hasConflict = conflicts.some(c => guestIdsOnTable.has(c.guest1Id) && guestIdsOnTable.has(c.guest2Id));
      if (hasConflict) acc.push(tableId);
      return acc;
  }, []);

  const updateGuestDetails = (id, updates) => {
    const inUnassigned = unassigned.find(g => g.id === id);
    if (inUnassigned) {
        setUnassigned(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
        return;
    }
    for (const [tableId, guests] of Object.entries(tables)) {
        if (guests.find(g => g.id === id)) {
            setTables(prev => ({
                ...prev,
                [tableId]: prev[tableId].map(g => g.id === id ? { ...g, ...updates } : g)
            }));
            return;
        }
    }
  };

  const autoAssignGroup = (groupName, startTableId) => {
    const validTableIds = Object.keys(tables).filter(id => (tablePos[id]?.capacity || 8) > 0);
    if (validTableIds.length === 0) return alert("No tables available!");

    const guestsToAssign = unassigned.filter(g => g.group === groupName);
    if (guestsToAssign.length === 0) return alert("No guests in that group.");

    const sortedTableIds = validTableIds.map(Number).sort((a,b) => a - b);
    let currentTableIndex = sortedTableIds.indexOf(Number(startTableId));
    if (currentTableIndex === -1) return alert("Start table not found.");

    const newTables = { ...tables };
    const guestIdsAssigned = new Set();
    let guestsRemaining = [...guestsToAssign];

    while (guestsRemaining.length > 0) {
        if (currentTableIndex >= sortedTableIds.length) {
            alert(`Ran out of tables! ${guestsRemaining.length} guests left.`);
            break;
        }
        const currentTableId = sortedTableIds[currentTableIndex];
        const capacity = tablePos[currentTableId]?.capacity || 8;
        const currentSeated = newTables[currentTableId] || [];
        const spaceAvailable = capacity - currentSeated.length;

        if (spaceAvailable > 0) {
            const moving = guestsRemaining.slice(0, spaceAvailable);
            newTables[currentTableId] = [...currentSeated, ...moving];
            moving.forEach(g => guestIdsAssigned.add(g.id));
            guestsRemaining = guestsRemaining.slice(spaceAvailable);
        }
        currentTableIndex++;
    }
    setTables(newTables);
    setUnassigned(prev => prev.filter(g => !guestIdsAssigned.has(g.id)));
  };

  const moveGuest = (guestObjOrName, source, target) => {
    let guestObj = null;
    const guestName = typeof guestObjOrName === 'string' ? guestObjOrName : guestObjOrName.name;

    if (source === 'sidebar') guestObj = unassigned.find(g => g.name === guestName);
    else guestObj = tables[source]?.find(g => g.name === guestName);

    if (!guestObj) guestObj = { id: crypto.randomUUID(), name: guestName, group: 'None', meal: 'Standard', diet: '' };

    if (tablePos[target]?.capacity === 0) return; 
    const targetCap = tablePos[target]?.capacity || 8;
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetCap) return alert("Table is full!");

    if (source === 'sidebar') setUnassigned(prev => prev.filter(g => g.name !== guestName));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(g => (typeof g === 'string' ? g : g.name) !== guestName) }));

    if (target === 'sidebar') setUnassigned(prev => [...prev, guestObj]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), guestObj] }));
  };

  const handlePointerDown = (e, id) => {
    if (e.target.closest('.no-drag')) return; 
    setSelectedTableId(id); e.preventDefault(); e.stopPropagation(); 
    if (!canvasRef.current) return; e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const currentTable = tablePos[id];
    setDragState({ id: id, offsetX: ((e.clientX - rect.left) / rect.width) * 100 - currentTable.x, offsetY: ((e.clientY - rect.top) / rect.height) * 100 - currentTable.y });
  };

  const handleResizePointerDown = (e, id) => {
    e.preventDefault(); e.stopPropagation(); if (!canvasRef.current) return; e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const config = tablePos[id];
    const fallbackWidth = config.shape === 'rect' ? (10 + (config.capacity || 8)) : 10;
    const fallbackHeight = config.shape === 'rect' ? 12 : null; 
    setResizeState({ id, startX: ((e.clientX - rect.left) / rect.width) * 100, startY: ((e.clientY - rect.top) / rect.height) * 100, startW: config.width || fallbackWidth, startH: config.height || fallbackHeight });
  };

  const handlePointerMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = ((e.clientX - rect.left) / rect.width) * 100;
    const curY = ((e.clientY - rect.top) / rect.height) * 100;

    if (resizeState) {
        e.preventDefault();
        const deltaX = curX - resizeState.startX;
        const deltaY = curY - resizeState.startY;
        let newWidth = resizeState.startW + (deltaX * 2);
        const config = tablePos[resizeState.id];
        const isRect = config.shape === 'rect';
        let newHeight = isRect ? (resizeState.startH + (deltaY * 2)) : null;
        newWidth = Math.max(3, Math.min(80, newWidth));
        if (isRect) newHeight = Math.max(3, Math.min(80, newHeight));
        setTablePos(prev => ({ ...prev, [resizeState.id]: { ...prev[resizeState.id], width: newWidth, height: newHeight } }));
    } else if (dragState) {
        e.preventDefault();
        let newX = curX - dragState.offsetX;
        let newY = curY - dragState.offsetY;
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
      pdf.setFontSize(18); pdf.text(planName || "Seating Layout", 10, 15);
      pdf.setFontSize(10); pdf.text(`Generated on Gather: ${new Date().toLocaleDateString()}`, 10, 22);
      pdf.addImage(dataUrl, 'PNG', 10, 30, pdfWidth, pdfHeight);
      pdf.save(`${planName || 'Gather_Plan'}.pdf`);
    } catch (err) { alert("Could not generate PDF."); }
  };

  if (!session) return <Auth supabase={supabase} />;

  const allGuests = [
      ...unassigned,
      ...Object.values(tables).flat()
  ].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="flex h-screen w-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden font-sans relative selection:bg-indigo-500/20">
      
      {/* AMBIENT LIGHTING */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <Sidebar 
        unassigned={unassigned || []} 
        setUnassigned={setUnassigned}
        plans={plans || []} 
        loadPlan={loadPlan} 
        currentPlanId={currentPlanId}
        planName={planName} 
        setPlanName={setPlanName}
        savePlan={savePlan} 
        exportToPDF={exportToPDF} // <--- THIS MATCHES SIDEBAR PROP
        handleLogout={handleLogout}
        userEmail={session.user.email} 
        handleFileUpload={handleSmartFileUpload}
        tables={tables || {}} 
        autoAssignGroup={autoAssignGroup} 
        addDecor={addDecor}
        updateGuestDetails={updateGuestDetails}
        conflicts={conflicts || []} 
        addConflict={addConflict} 
        removeConflict={removeConflict}
        allGuests={allGuests} 
        unseatAll={handleUnseatAll} 
        clearUnseatedList={handleClearUnseatedList}
      />
      
      <Stage 
        canvasRef={canvasRef}
        tablePos={tablePos} tables={tables}
        selectedTableId={selectedTableId} dragState={dragState} resizeState={resizeState}
        handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp}
        handleResizePointerDown={handleResizePointerDown}
        moveGuest={moveGuest}
        addTable={addTable} updateTableShape={updateTableShape} 
        updateTableCapacity={updateTableCapacity} deleteTable={deleteTable}
        conflictTableIds={conflictTableIds}
        viewScale={viewScale}
        setViewScale={setViewScale}
      />
    </div>
  );
}