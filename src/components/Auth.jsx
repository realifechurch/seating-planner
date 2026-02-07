import React, { useState } from 'react';

export default function Auth({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

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
    <div className="min-h-screen w-full flex items-center justify-center relative font-sans overflow-hidden">
      
      {/* --- CINEMATIC BACKGROUND --- */}
      {/* We use a direct style tag for the background image to ensure it covers the screen immediately */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
            // High-quality wedding reception with string lights (Industrial Chic style)
            backgroundImage: `url('https://images.unsplash.com/photo-1519225468359-2996bc01c083?q=80&w=2070&auto=format&fit=crop')`,
        }}
      >
        {/* Dark Overlay: Ensures text is readable regardless of the image brightness */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-brightness-75"></div>
      </div>

      {/* --- CONTENT WRAPPER --- */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        
        {/* HERO BRANDING */}
        <div className="text-center mb-8 drop-shadow-md">
            <h1 className="text-6xl font-bold text-white tracking-tighter mb-2">Gather.</h1>
            <p className="text-xl text-white/90 font-light tracking-wide">Bring your vision to life.</p>
        </div>

        {/* GLASS CARD */}
        <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl ring-1 ring-white/10">
            
            <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Email Input */}
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/70 ml-1">Email</label>
                <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:bg-black/30 focus:border-white/30 transition shadow-inner placeholder-white/30"
                />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/70 ml-1">Password</label>
                <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:bg-black/30 focus:border-white/30 transition shadow-inner placeholder-white/30"
                />
            </div>
            
            {/* Primary Action Button */}
            <button
                disabled={loading}
                className="w-full bg-white hover:bg-white/90 text-slate-900 py-4 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center border-t border-white/10 pt-4">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-white/80 font-medium hover:text-white hover:underline transition"
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-white/30 font-medium tracking-wide">
            Protected by Supabase Auth
        </div>

      </div>
    </div>
  );
}