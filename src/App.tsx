import React, { useState } from 'react';

const INITIAL_GUESTS = ["Alice W.", "Bob R.", "Charlie T.", "Diana L.", "Edward M.", "Fiona K.", "George P.", "Hannah B.", "Ian S.", "Julia O."];

export default function SeatingPlanner() {
  const [unassigned, setUnassigned] = useState(INITIAL_GUESTS);
  const [tables, setTables] = useState({
    1: [], 2: [], 3: [], 4: []
  });

  const handleDragStart = (e, name, source) => {
    e.dataTransfer.setData("name", name);
    e.dataTransfer.setData("source", source);
  };

  const onDrop = (e, targetTableId) => {
    const name = e.dataTransfer.getData("name");
    const source = e.dataTransfer.getData("source");

    // 1. Check Table Limit
    if (tables[targetTableId].length >= 8) {
      alert("Table is full! Max 8 guests allowed.");
      return;
    }

    // 2. Remove from source
    if (source === "sidebar") {
      setUnassigned(prev => prev.filter(n => n !== name));
    } else {
      setTables(prev => ({ ...prev, [source]: prev[source].filter(n => n !== name) }));
    }

    // 3. Add to target table
    setTables(prev => ({
      ...prev,
      [targetTableId]: [...prev[targetTableId], name]
    }));
  };

  return (
    <div className="flex h-screen bg-gray-100 p-8 font-sans">
      {/* Sidebar: Unassigned Guests */}
      <div className="w-1/4 bg-white p-6 rounded-xl shadow-lg mr-8 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Guest List</h2>
        {unassigned.map(name => (
          <div 
            key={name}
            draggable
            onDragStart={(e) => handleDragStart(e, name, "sidebar")}
            className="p-3 mb-2 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100 transition"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Main Canvas: Table Layout */}
      <div className="flex-1 grid grid-cols-2 gap-8">
        {Object.keys(tables).map(id => (
          <div 
            key={id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
            className="relative flex flex-col items-center justify-center p-6 border-4 border-dashed border-gray-300 rounded-full w-64 h-64 mx-auto bg-white hover:border-blue-400 transition"
          >
            <span className="font-bold text-gray-500 uppercase tracking-widest">Table {id}</span>
            <div className="mt-2 text-sm text-center">
              {tables[id].map((guest, i) => (
                <div key={i} className="text-gray-700">{guest}</div>
              ))}
            </div>
            <div className="absolute bottom-4 text-xs font-semibold text-blue-600">
              {tables[id].length} / 8 Seats
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}