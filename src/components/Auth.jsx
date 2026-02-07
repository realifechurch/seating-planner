import React, { useState } from 'react';

export default function Auth({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Success! Please check your email to confirm your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
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

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email Input */}
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

          {/* Password Input */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-sm placeholder-slate-300"
            />
          </div>
          
          {/* Action Button */}
          <button
            disabled={loading}
            className="w-full bg-[#1D1D1F] hover:bg-black text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6">
            <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-slate-500 font-medium hover:text-indigo-600 transition"
            >
                {isSignUp ? 'Already have an account? Sign In' : 'No account? Create one'}
            </button>
        </div>

        <div className="mt-8 text-[10px] text-slate-400 font-medium">
            Protected by Supabase Auth
        </div>
      </div>
    </div>
  );
}