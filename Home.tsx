/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ViewMode } from '../types';
import { FileText, Link, BrainCircuit, Image, Sparkles, ArrowRight, Share2 } from 'lucide-react';

interface HomeProps {
  onNavigate: (mode: ViewMode) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-20 mb-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-slate-300 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Powered by Nano Banana Pro</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 font-sans leading-tight">
          Link 2 Social
        </h1>
        
        <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
          Turn any link into a complete social media content bundle instantly.
        </p>

        {/* Main Action */}
        <div className="flex flex-col items-center justify-center pt-8 w-full max-w-[480px] mx-auto">
            
            <div className="w-full flex items-center justify-center gap-4 group relative">
                <button 
                    onClick={() => onNavigate(ViewMode.ARTICLE_INFOGRAPHIC)}
                    className="w-full glass-panel p-8 rounded-2xl hover:bg-white/10 transition-all border border-white/5 hover:border-emerald-500/50 text-center group-hover:scale-105 group-hover:shadow-neon-emerald relative overflow-hidden flex flex-col items-center gap-4"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-32 h-32 -rotate-12" />
                    </div>
                    
                    <div className="p-5 bg-emerald-500/20 rounded-2xl text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors relative z-10">
                        <FileText className="w-10 h-10" />
                    </div>
                    
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white group-hover:text-emerald-200 transition-colors">Create Content Bundle</h3>
                        <p className="text-sm text-slate-400 font-mono mt-2 group-hover:text-slate-300">Infographic + Social Posts from URL</p>
                    </div>
                    
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <ArrowRight className="w-5 h-5 text-emerald-400" />
                    </div>
                </button>
            </div>
        </div>
      </div>

      {/* 3-Step Process Visualization */}
      <div className="relative pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 border-t border-white/5">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative pt-10">
             {/* Step 1 */}
             <div className="flex flex-col items-center text-center space-y-4 group">
                 <div className="w-12 h-12 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-center shadow-glass-lg group-hover:border-emerald-500/50 transition-colors">
                     <Link className="w-5 h-5 text-slate-300 group-hover:text-emerald-300 transition-colors" />
                 </div>
                 <div>
                     <h3 className="text-white font-bold text-sm font-mono uppercase tracking-wider mb-1">
                        1. Paste Link
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        Use any public article or blog.
                     </p>
                 </div>
             </div>

             {/* Step 2 */}
             <div className="flex flex-col items-center text-center space-y-4 group">
                 <div className="w-12 h-12 rounded-xl bg-slate-900/50 border border-emerald-500/30 flex items-center justify-center shadow-neon-emerald">
                     <BrainCircuit className="w-5 h-5 text-emerald-300" />
                 </div>
                 <div>
                     <h3 className="text-white font-bold text-sm font-mono uppercase tracking-wider mb-1">
                        2. Analyze & Draft
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        AI creates captions & visual plan.
                     </p>
                 </div>
             </div>

             {/* Step 3 */}
             <div className="flex flex-col items-center text-center space-y-4 group">
                 <div className="w-12 h-12 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-center shadow-glass-lg group-hover:border-emerald-500/50 transition-colors">
                     <Share2 className="w-5 h-5 text-slate-300 group-hover:text-emerald-300 transition-colors" />
                 </div>
                 <div>
                     <h3 className="text-white font-bold text-sm font-mono uppercase tracking-wider mb-1">
                        3. Publish
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        Download infographic & copy text.
                     </p>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Home;