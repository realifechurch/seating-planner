import React from 'react';

const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconFile = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;

// --- THE CRITICAL PART IS HERE: "export default" ---
export default function PlanManager({ plans, onClose, onLoad, onDelete }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Your Plans</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Select a layout to load</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition">&times;</button>
        </div>

        {/* Plan Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          {plans.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <IconFile />
              <span className="text-xs font-bold mt-2 uppercase tracking-widest">No plans saved yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:ring-2 hover:ring-indigo-500/20 transition-all duration-300 cursor-pointer relative" onClick={() => onLoad(plan)}>
                  
                  {/* Thumbnail Preview Area */}
                  <div className="aspect-video bg-slate-100 relative border-b border-slate-50">
                    {plan.thumbnail ? (
                        <img src={plan.thumbnail} alt="Layout Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><IconFile/></div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/5 transition duration-300"></div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 truncate pr-4">{plan.name}</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                {new Date(plan.created_at).toLocaleDateString()} at {new Date(plan.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this plan?')) onDelete(plan.id); }}
                            className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition"
                        >
                            <IconTrash />
                        </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            {plan.data?.unassigned?.length + Object.values(plan.data?.tables || {}).flat().length || 0} Guests
                        </span>
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            {Object.keys(plan.data?.tables || {}).length} Tables
                        </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}