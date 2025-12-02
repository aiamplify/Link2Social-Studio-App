
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => void;
  onCancel: () => void;
  error?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 to-slate-950 pointer-events-none"></div>
      
      <button 
        onClick={onCancel}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-sans text-sm font-medium z-10"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Blog
      </button>

      <div className="w-full max-w-md bg-slate-900/50 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-12 space-y-8 animate-in fade-in zoom-in-95 duration-300 relative z-10">
          <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-white text-slate-950 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white font-sans">Admin Access</h1>
              <p className="text-slate-400 text-sm">Enter your credentials to access the studio.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                  <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-white/10 focus:ring-1 focus:ring-orange-500 focus:border-orange-500/50 transition-all outline-none bg-slate-950/50 text-white placeholder:text-slate-600 font-medium font-mono"
                      placeholder="Enter username"
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-white/10 focus:ring-1 focus:ring-orange-500 focus:border-orange-500/50 transition-all outline-none bg-slate-950/50 text-white placeholder:text-slate-600 font-medium font-mono"
                      placeholder="••••••••"
                  />
              </div>

              {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2 font-medium font-mono">
                      <AlertCircle className="w-4 h-4" /> {error}
                  </div>
              )}

              <button 
                  type="submit"
                  className="w-full py-3 bg-white hover:bg-slate-200 text-slate-950 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                  Login <ArrowRight className="w-4 h-4" />
              </button>
          </form>
      </div>
    </div>
  );
};

export default Login;
