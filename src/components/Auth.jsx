import React, { useState, useEffect } from 'react';

export default function Auth({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload background image for performance
  useEffect(() => {
    const img = new Image();
    // Using a curated Unsplash image that matches "Wedding, Warm Lights, Industrial Chic"
    img.src = "https://images.unsplash.com/photo-1519225468359-2996bc01c083?q=80&w=2070&auto=format&fit=crop";
    img.onload = () => setImageLoaded(true);
  }, []);

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
    <div className="flex h-screen w-screen items-center justify-center relative overflow-hidden font-sans bg-slate-900">
      
      {/* --- CINEMATIC BACKDROP --- */}
      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* The Image */}
        <img 
            src="https://images.unsplash.com/photo-1519225468359-2996bc01c083?q=80&w=2070&auto=format&fit=crop" 
            alt="Wedding Reception with Lights" 
            className="w-full h-full object-cover"
        />
        {/* The Overlay: Adds a subtle dark tint so the white text/glass pops, but keeps warmth */}
        <div className="absolute inset-0 bg-black/30 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

      {/* --- GLASS LOGIN CARD --- */}
      <div className="w-full max-w-md relative z-10 p-6">
        
        {/* Branding (Floating above card for prominence) */}
        <div className="text-center mb-8 drop-shadow-lg">
            <h1 className="text-5xl font-bold text-white tracking-tight mb-2">Gather.</h1>
            <p className="text-lg text-white/90 font-medium tracking-wide">Bring your vision to life.</p>
        </div>

        {/* The Glass Container */}
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-white/20">
            
            <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Email Input */}
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/80 ml-1">Email</label>
                <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/80 border-none rounded-2xl px-4 py-3.5 text-sm text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-white/30 transition shadow-inner placeholder-slate-400"
                />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/80 ml-1">Password</label>
                <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/80 border-none rounded-2xl px-4 py-3.5 text-sm text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-white/30 transition shadow-inner placeholder-slate-400"
                />
            </div>
            
            {/* Action Button */}
            <button
                disabled={loading}
                className="w-full bg-[#1D1D1F] hover:bg-black text-white py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
                {loading ? 'Processing...' : (isSignUp ? 'Create Free Account' : 'Sign In')}
            </button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-white/90 font-medium hover:text-white hover:underline transition shadow-sm"
                >
                    {isSignUp ? 'Already have an account? Sign In' : 'New here? Create an account'}
                </button>
            </div>
        </div>

        {/* Footer Text */}
        <div className="mt-8 text-center text-[10px] text-white/40 font-medium">
            Protected by Supabase Auth
        </div>

      </div>
    </div>
  );
}