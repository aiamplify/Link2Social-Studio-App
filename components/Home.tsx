
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ViewMode } from '../types';
import { FileText, Link, BrainCircuit, Sparkles, ArrowRight, Share2, Layout, PenTool, Youtube, Video, Clapperboard } from 'lucide-react';

interface HomeProps {
  onNavigate: (mode: ViewMode) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-20 mb-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-slate-300 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Powered by Nano Banana Pro & Veo 3.1</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 font-sans leading-tight">
          Link 2 Social
        </h1>
        
        <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
          Turn any link into a complete social media content suite.
        </p>

        {/* Main Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pt-8 w-full mx-auto px-4">
            
            {/* Infographic Bundle */}
            <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.ARTICLE_INFOGRAPHIC)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-emerald-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-neon-emerald relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-40 h-40 -rotate-12 text-emerald-500" />
                    </div>
                    
                    <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors relative z-10">
                        <FileText className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">Content Bundle</h3>
                        <p className="text-xs text-slate-400 font-mono">Infographic + Posts</p>
                    </div>
                    
                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-emerald-500/30 text-[10px] text-emerald-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
            </div>

            {/* Carousel Creator */}
            <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.CAROUSEL_GENERATOR)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-sky-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(14,165,233,0.2)] relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layout className="w-40 h-40 -rotate-12 text-sky-500" />
                    </div>
                    
                    <div className="p-4 bg-sky-500/20 rounded-2xl text-sky-300 border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-colors relative z-10">
                        <Layout className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-sky-200 transition-colors">Carousel Creator</h3>
                        <p className="text-xs text-slate-400 font-mono">LinkedIn & IG Slides</p>
                    </div>

                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-sky-500/30 text-[10px] text-sky-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
            </div>

             {/* Blog to Blog */}
             <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.BLOG_TO_BLOG)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-orange-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PenTool className="w-40 h-40 -rotate-12 text-orange-500" />
                    </div>
                    
                    <div className="p-4 bg-orange-500/20 rounded-2xl text-orange-300 border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-colors relative z-10">
                        <PenTool className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-orange-200 transition-colors">Blog Remix</h3>
                        <p className="text-xs text-slate-400 font-mono">Rewrite Articles</p>
                    </div>

                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-orange-500/30 text-[10px] text-orange-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
            </div>

            {/* YouTube Thumbnails */}
            <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.YOUTUBE_THUMBNAIL)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-red-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Youtube className="w-40 h-40 -rotate-12 text-red-500" />
                    </div>
                    
                    <div className="p-4 bg-red-500/20 rounded-2xl text-red-300 border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors relative z-10">
                        <Youtube className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-red-200 transition-colors">Viral Thumbnails</h3>
                        <p className="text-xs text-slate-400 font-mono">High CTR Designs</p>
                    </div>

                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-red-500/30 text-[10px] text-red-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
            </div>

             {/* Veo B-Roll */}
             <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.VIDEO_BROLL)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-indigo-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Video className="w-40 h-40 -rotate-12 text-indigo-500" />
                    </div>
                    
                    <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-300 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors relative z-10">
                        <Video className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">B-Roll Creator</h3>
                        <p className="text-xs text-slate-400 font-mono">Cinematic Video</p>
                    </div>

                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-indigo-500/30 text-[10px] text-indigo-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
                    </div>
                </button>
            </div>

            {/* Script Visualizer */}
            <div className="w-full group relative h-full">
                <button 
                    onClick={() => onNavigate(ViewMode.VIDEO_SCRIPT_VISUALIZER)}
                    className="w-full h-full min-h-[320px] glass-panel p-6 rounded-3xl hover:bg-white/10 transition-all border border-white/5 hover:border-teal-500/50 text-center group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] relative overflow-hidden flex flex-col items-center gap-6"
                >
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clapperboard className="w-40 h-40 -rotate-12 text-teal-500" />
                    </div>
                    
                    <div className="p-4 bg-teal-500/20 rounded-2xl text-teal-300 border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white transition-colors relative z-10">
                        <Clapperboard className="w-8 h-8" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-teal-200 transition-colors">Script Visualizer</h3>
                        <p className="text-xs text-slate-400 font-mono">Scene-by-Scene Plates</p>
                    </div>

                    <div className="w-full py-2 mt-auto border-t border-white/5 group-hover:border-teal-500/30 text-[10px] text-teal-400/70 font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        Start <ArrowRight className="w-3 h-3" />
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
                        1. Input Source
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        Link, Topic, or Image.
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
                        2. AI Generation
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        Nano Banana Pro creates assets.
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
                        3. Go Viral
                     </h3>
                     <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                        Download and publish instantly.
                     </p>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Home;
