import React, { useState } from 'react';

export default function Auth({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Check your email for the login link!');
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#F5F5F7] relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-rose-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Glass Card */}
      <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/80 z-10 text-center ring-1 ring-black/5">
        
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight mb-2">Gather.</h1>
            <p className="text-sm text-slate-500 font-medium">Event seating, simplified.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-sm placeholder-slate-300"
            />
          </div>
          
          <button
            disabled={loading}
            className="w-full bg-[#1D1D1F] hover:bg-black text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Magic Link...' : 'Sign In with Email'}
          </button>
        </form>

        <div className="mt-8 text-[10px] text-slate-400 font-medium">
            Protected by Supabase Auth
        </div>
      </div>
    </div>
  );
}