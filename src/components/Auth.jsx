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
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-white">
      
      {/* --- LEFT SIDE: THE FORM (Clean, Product-Focused) --- */}
      <div className="w-full lg:w-[45%] h-full flex flex-col justify-between p-8 lg:p-12 relative z-10 bg-white">
        
        {/* Logo */}
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
            Gather.
          </h1>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto">
            <div className="mb-10">
                <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
                  {isSignUp ? 'Start planning.' : 'Welcome back.'}
                </h2>
                <p className="text-slate-500 text-lg">
                  {isSignUp ? 'Create your perfect floorplan today.' : 'Bring your event vision to life.'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Email</label>
                  <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  />
              </div>

              <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                  <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  />
              </div>
              
              <button
                  disabled={loading}
                  className="w-full bg-[#1D1D1F] hover:bg-black text-white h-12 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
              >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'} 
                      <span aria-hidden="true">&rarr;</span>
                    </>
                  )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-slate-500 font-medium hover:text-indigo-600 transition"
                >
                    {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up free"}
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 font-medium">
            © 2024 Gather Platform. Protected by Supabase.
        </div>
      </div>

      {/* --- RIGHT SIDE: THE VISION (Cinematic Image) --- */}
      <div className="hidden lg:block w-[55%] h-full relative bg-slate-100">
        {/* We use an img tag for better loading reliability than background-image */}
        <img 
            src="https://images.unsplash.com/photo-1519225468359-2996bc01c083?q=80&w=2070&auto=format&fit=crop"
            alt="Beautiful Wedding Reception" 
            className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Subtle Gradient Overlay to make it feel premium */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        
        {/* Testimonial / Mood Text overlay */}
        <div className="absolute bottom-12 left-12 right-12 text-white">
            <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400">★</span>)}
            </div>
            <p className="text-2xl font-light leading-snug tracking-wide mb-2">
              "The most intuitive way to design your perfect evening."
            </p>
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">
              The Rosebery Venue
            </p>
        </div>
      </div>

    </div>
  );
}