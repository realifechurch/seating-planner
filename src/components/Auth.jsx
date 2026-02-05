import React, { useState } from 'react';

// NOTE THE "export default" KEYWORDS HERE:
export default function Auth({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Note: We don't need onLogin prop because the App.jsx listener handles the session update automatically
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <form onSubmit={handleLogin} className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-serif mb-6 text-center italic">Wedding Dashboard</h1>
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-4 outline-none focus:border-indigo-500" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 outline-none focus:border-indigo-500" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        <button disabled={loading} type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition">
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}