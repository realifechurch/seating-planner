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
  
  const [unassigned, setUnassigned] = useState([]); // [{id, name, group}]
  const [tables, setTables] = useState({});
  const [tablePos, setTablePos] = useState({}); 

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [dragState, setDragState] = useState(null); 
  const [resizeState, setResizeState] = useState(null); 

  const canvasRef = useRef(null);

  // --- AUTH & INIT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) fetchPlans(); }, [session]);

  // Click background to deselect
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
      if (data) setPlans(data);
    } catch (err) { console.error(err); }
  };

  const loadPlan = (p) => {
    if (unassigned.length > 0 || Object.keys(tables).length > 0) {
       if (!window.confirm("Load plan? Unsaved changes lost.")) return;
    }
    setPlanName(p.name);
    setCurrentPlanId(p.id);
    
    // Legacy migration: String[] -> Object[]
    let guests = p.data.unassigned || [];
    if (guests.length > 0 && typeof guests[0] === 'string') {
        guests = guests.map(name => ({ id: crypto.randomUUID(), name, group: 'None' }));
    }
    setUnassigned(guests);
    setTables(p.data.tables || {});
    setTablePos(p.data.tablePos || {});
    setSelectedTableId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setTables({}); setTablePos({}); setUnassigned([]); setPlanName("");
  };

  const savePlan = async (asNewVersion = false) => {
    if (!planName) return alert("Please name your plan.");
    const idToUse = asNewVersion ? null : currentPlanId;
    const nameToUse = asNewVersion ? `${planName} (Copy)` : planName;
    const { data, error } = await supabase.from('seating_plans').upsert({ 
      id: idToUse, name: nameToUse, data: { unassigned, tables, tablePos }, user_id: session.user.id 
    }).select();
    if (!error) { 
      setCurrentPlanId(data[0].id); if (asNewVersion) setPlanName(nameToUse);
      fetchPlans(); alert(asNewVersion ? "Version saved!" : "Plan saved!"); 
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => {
          const imported = results.data.map(row => {
            const name = row.Name || Object.values(row)[0];
            return name ? { id: crypto.randomUUID(), name, group: 'None' } : null;
          }).filter(Boolean);
          setUnassigned(prev => [...new Set([...prev, ...imported])]);
      }});
    }
  };

  // --- AUTO ASSIGN LOGIC ---
  const autoAssignGroup = (groupName, startTableId) => {
    // Filter out decor items (capacity 0)
    const validTableIds = Object.keys(tables).filter(id => (tablePos[id]?.capacity || 0) > 0);
    
    if (validTableIds.length === 0) return alert("No tables available! Create tables first.");

    const guestsToAssign = unassigned.filter(g => g.group === groupName);
    if (guestsToAssign.length === 0) return alert("No unassigned guests in that group.");

    const sortedTableIds = validTableIds.map(Number).sort((a,b) => a - b);
    let currentTableIndex = sortedTableIds.indexOf(Number(startTableId));
    if (currentTableIndex === -1) return alert("Start table not found.");

    const newTables = { ...tables };
    const guestIdsAssigned = new Set();
    let guestsRemaining = [...guestsToAssign];

    while (guestsRemaining.length > 0) {
        if (currentTableIndex >= sortedTableIds.length) {
            alert(`Ran out of tables! ${guestsRemaining.length} guests from '${groupName}' could not be seated.`);
            break;
        }

        const currentTableId = sortedTableIds[currentTableIndex];
        const capacity = tablePos[currentTableId]?.capacity || 8;
        const currentSeated = newTables[currentTableId] || [];
        const spaceAvailable = capacity - currentSeated.length;

        if (spaceAvailable > 0) {
            const moving = guestsRemaining.slice(0, spaceAvailable);
            newTables[currentTableId] = [...currentSeated, ...moving.map(g => g.name)];
            moving.forEach(g => guestIdsAssigned.add(g.id));
            guestsRemaining = guestsRemaining.slice(spaceAvailable);
        }
        currentTableIndex++;
    }

    setTables(newTables);
    setUnassigned(prev => prev.filter(g => !guestIdsAssigned.has(g.id)));
  };

  // --- ADD ITEM LOGIC (Tables & Decor) ---
  const addTable = (shapeType) => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] }));
    
    const defaultWidth = shapeType === 'rect' ? 15 : 10; 
    const defaultHeight = shapeType === 'rect' ? 15 : null; 
    
    setTablePos(prev => ({ 
      ...prev, 
      [nextId]: { 
        x: 50, y: 50, 
        type: 'table', // Explicitly mark as table
        shape: shapeType, 
        capacity: 8, 
        width: defaultWidth, 
        height: defaultHeight 
      } 
    }));
    setSelectedTableId(nextId); 
  };

  const addDecor = (type) => {
    const nextId = Object.keys(tables).length + 1;
    setTables(prev => ({ ...prev, [nextId]: [] })); // Create entry but it will stay empty
    
    // Default Sizes for Decor
    let w = 15, h = 15, shape = 'rect';
    if (type === 'dancefloor') { w = 30; h = 25; }
    if (type === 'bar') { w = 20; h = 10; }
    if (type === 'plant') { w = 5; h = null; shape = 'circle'; }
    if (type === 'dj') { w = 10; h = null; shape = 'square'; }

    setTablePos(prev => ({ 
      ...prev, 
      [nextId]: { 
        x: 50, y: 50, 
        type: type, // Mark as decor
        shape: shape,
        capacity: 0, // No guests allowed
        width: w, 
        height: h 
      } 
    }));
    setSelectedTableId(nextId);
  };

  const updateTableShape = (id, newShape) => setTablePos(prev => ({ ...prev, [id]: { ...prev[id], shape: newShape } }));
  
  const updateTableCapacity = (id, delta) => setTablePos(prev => {
      // Don't allow capacity change for decor
      if (prev[id].type !== 'table' && prev[id].type !== undefined) return prev;
      
      const current = prev[id].capacity || 8;
      const newCap = Math.max(2, Math.min(20, current + delta));
      return { ...prev, [id]: { ...prev[id], capacity: newCap } };
  });

  const deleteTable = (id) => {
    const guestsAtTable = tables[id] || [];
    if (guestsAtTable.length > 0) {
        const rescued = guestsAtTable.map(name => ({ id: crypto.randomUUID(), name, group: 'None' }));
        setUnassigned(prev => [...prev, ...rescued]);
    }
    const newTables = { ...tables }; delete newTables[id]; setTables(newTables);
    const newTablePos = { ...tablePos }; delete newTablePos[id]; setTablePos(newTablePos);
    setSelectedTableId(null);
  };

  const moveGuest = (guestObjOrName, source, target) => {
    // Reject drops on decor
    if (tablePos[target]?.capacity === 0) return;

    const guestName = typeof guestObjOrName === 'string' ? guestObjOrName : guestObjOrName.name;
    const guestGroup = typeof guestObjOrName === 'object' ? guestObjOrName.group : 'None';
    const targetCap = tablePos[target]?.capacity || 8;
    if (target !== 'sidebar' && (tables[target]?.length || 0) >= targetCap) return alert("Table is full!");

    if (source === 'sidebar') setUnassigned(prev => prev.filter(g => g.name !== guestName));
    else setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== guestName) }));

    if (target === 'sidebar') setUnassigned(prev => [...prev, { id: crypto.randomUUID(), name: guestName, group: guestGroup }]);
    else setTables(prev => ({ ...prev, [target]: [...(prev[target] || []), guestName] }));
  };

  // --- CANVAS HANDLERS ---
  const handlePointerDown = (e, id) => {
    if (e.target.closest('.no-drag')) return; 
    setSelectedTableId(id);
    e.preventDefault(); e.stopPropagation(); 
    if (!canvasRef.current) return;
    e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const currentTable = tablePos[id];
    setDragState({
      id: id,
      offsetX: ((e.clientX - rect.left) / rect.width) * 100 - currentTable.x,
      offsetY: ((e.clientY - rect.top) / rect.height) * 100 - currentTable.y
    });
  };

  const handleResizePointerDown = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!canvasRef.current) return;
    e.target.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const config = tablePos[id];
    const fallbackWidth = config.shape === 'rect' ? (10 + (config.capacity || 8)) : 10;
    const fallbackHeight = config.shape === 'rect' ? 12 : null; 
    setResizeState({ 
        id, 
        startX: ((e.clientX - rect.left) / rect.width) * 100, 
        startY: ((e.clientY - rect.top) / rect.height) * 100, 
        startW: config.width || fallbackWidth, startH: config.height || fallbackHeight 
    });
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
        
        // Use aspect ratio lock for circle/square
        let newHeight = isRect ? (resizeState.startH + (deltaY * 2)) : null;
        
        newWidth = Math.max(3, Math.min(80, newWidth)); // Allowed wider range for dancefloors
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

  // --- RENDER ---
  if (!session) return <Auth supabase={supabase} />;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        unassigned={unassigned} setUnassigned={setUnassigned}
        plans={plans} loadPlan={loadPlan} currentPlanId={currentPlanId}
        planName={planName} setPlanName={setPlanName}
        savePlan={savePlan} exportToPDF={exportToPDF} handleLogout={handleLogout}
        userEmail={session.user.email} handleFileUpload={handleFileUpload}
        tables={tables} autoAssignGroup={autoAssignGroup}
        addDecor={addDecor} // Pass down the new function
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
      />
    </div>
  );
}