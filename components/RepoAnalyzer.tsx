/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { fetchRepoFileTree } from '../services/githubService';
import { generateInfographic } from '../services/geminiService';
import { RepoFileTree, ViewMode, RepoHistoryItem } from '../types';
import { AlertCircle, Loader2, Layers, Box, Download, Sparkles, Command, Palette, Globe, Clock, Maximize, KeyRound } from 'lucide-react';
import { LoadingState } from './LoadingState';
import ImageViewer from './ImageViewer';

interface RepoAnalyzerProps {
  onNavigate: (mode: ViewMode, data?: any) => void;
  history: RepoHistoryItem[];
  onAddToHistory: (item: RepoHistoryItem) => void;
}

const FLOW_STYLES = [
    "Modern Data Flow",
    "Hand-Drawn Blueprint",
    "Corporate Minimal",
    "Neon Cyberpunk",
    "Custom"
];

const LANGUAGES = [
  { label: "English (US)", value: "English" },
  { label: "Arabic (Egypt)", value: "Arabic" },
  { label: "German (Germany)", value: "German" },
  { label: "Spanish (Mexico)", value: "Spanish" },
  { label: "French (France)", value: "French" },
  { label: "Hindi (India)", value: "Hindi" },
  { label: "Indonesian (Indonesia)", value: "Indonesian" },
  { label: "Italian (Italy)", value: "Italian" },
  { label: "Japanese (Japan)", value: "Japanese" },
  { label: "Korean (South Korea)", value: "Korean" },
  { label: "Portuguese (Brazil)", value: "Portuguese" },
  { label: "Russian (Russia)", value: "Russian" },
  { label: "Ukrainian (Ukraine)", value: "Ukrainian" },
  { label: "Vietnamese (Vietnam)", value: "Vietnamese" },
  { label: "Chinese (China)", value: "Chinese" },
];

const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({ onNavigate, history, onAddToHistory }) => {
  const [repoInput, setRepoInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(FLOW_STYLES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
  const [customStyle, setCustomStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');
  
  // Infographic State
  const [infographicData, setInfographicData] = useState<string | null>(null);
  const [infographic3DData, setInfographic3DData] = useState<string | null>(null);
  const [generating3D, setGenerating3D] = useState(false);
  const [currentFileTree, setCurrentFileTree] = useState<RepoFileTree[] | null>(null);
  const [currentRepoName, setCurrentRepoName] = useState<string>('');
  
  // Viewer State
  const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);

  const parseRepoInput = (input: string): { owner: string, repo: string } | null => {
    const cleanInput = input.trim().replace(/\/$/, '');
    try {
      const url = new URL(cleanInput);
      if (url.hostname === 'github.com') {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
      }
    } catch (e) { }
    const parts = cleanInput.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const addToHistory = (repoName: string, imageData: string, is3D: boolean, style: string) => {
     const newItem: RepoHistoryItem = {
         id: Date.now().toString(),
         repoName,
         imageData,
         is3D,
         style,
         date: new Date()
     };
     onAddToHistory(newItem);
  };

  const handleApiError = (err: any) => {
      if (err.message && err.message.includes("Requested entity was not found")) {
          // This specific error often implies a Free Tier key is trying to access a Paid Model.
          // We trigger the window reload to re-open the key selection.
          const confirmSwitch = window.confirm(
              "BILLING REQUIRED: The current API key does not have access to these models.\n\n" +
              "This feature requires a paid Google Cloud Project. Please switch to a valid paid API Key."
          );
          if (confirmSwitch) {
              window.location.reload();
          }
      }
      setError(err.message || 'An unexpected error occurred during analysis.');
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfographicData(null);
    setInfographic3DData(null);
    setCurrentFileTree(null);

    const repoDetails = parseRepoInput(repoInput);
    if (!repoDetails) {
      setError('Invalid format. Use "owner/repo" or a full GitHub URL.');
      return;
    }

    setLoading(true);
    setCurrentRepoName(repoDetails.repo);
    try {
      setLoadingStage('CONNECTING TO GITHUB');
      const fileTree = await fetchRepoFileTree(repoDetails.owner, repoDetails.repo);

      if (fileTree.length === 0) throw new Error('No relevant code files found in this repository.');
      setCurrentFileTree(fileTree);

      setLoadingStage('ANALYZING STRUCTURE & GENERATING');
      
      const styleToUse = selectedStyle === 'Custom' ? customStyle : selectedStyle;

      const infographicBase64 = await generateInfographic(repoDetails.repo, fileTree, styleToUse, false, selectedLanguage);
      
      if (infographicBase64) {
        setInfographicData(infographicBase64);
        addToHistory(repoDetails.repo, infographicBase64, false, styleToUse);
      } else {
          throw new Error("Failed to generate visual.");
      }

    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleGenerate3D = async () => {
    if (!currentFileTree || !currentRepoName) return;
    setGenerating3D(true);
    try {
      // Pass the same selected style to the 3D generator
      const styleToUse = selectedStyle === 'Custom' ? customStyle : selectedStyle;
      const data = await generateInfographic(currentRepoName, currentFileTree, styleToUse, true, selectedLanguage);
      if (data) {
          setInfographic3DData(data);
          addToHistory(currentRepoName, data, true, styleToUse);
      }
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setGenerating3D(false);
    }
  };

  const loadFromHistory = (item: RepoHistoryItem) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentRepoName(item.repoName);
      // Since history items don't store the full file tree (too large), we just show the image.
      // If user wants to generate 3D from history of a 2D, they'd need to re-fetch.
      // For simplicity, we display the historical image in the appropriate slot.
      if (item.is3D) {
          setInfographic3DData(item.imageData);
      } else {
          setInfographicData(item.imageData);
          setInfographic3DData(null); // Clear 3D if loading a 2D history item to avoid confusion
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 mb-20">
      
      {fullScreenImage && (
          <ImageViewer 
            src={fullScreenImage.src} 
            alt={fullScreenImage.alt} 
            onClose={() => setFullScreenImage(null)} 
          />
      )}

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 font-sans leading-tight">
          Codebase <span className="text-violet-400">Intelligence</span>.
        </h2>
        <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide">
          Turn any repository into a fully analyzed, interactive architectural blueprint.
        </p>
      </div>

      {/* Input Section */}
      <div className="max-w-xl mx-auto relative z-10">
        <form onSubmit={handleAnalyze} className="glass-panel rounded-2xl p-2 transition-all focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:border-violet-500/50">
          <div className="flex items-center">
             <div className="pl-3 text-slate-500">
                <Command className="w-5 h-5" />
             </div>
             <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repository"
                className="w-full bg-transparent border-none text-white placeholder:text-slate-600 focus:ring-0 text-lg px-4 py-2 font-mono"
              />
              <div className="pr-2">
                <button
                type="submit"
                disabled={loading || !repoInput.trim()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10 font-mono text-sm"
                >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "RUN_ANALYSIS"}
                </button>
             </div>
          </div>

          {/* Controls: Style and Language */}
          <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1 space-y-3">
             {/* Style Selector */}
             <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                 <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-wider shrink-0">
                     <Palette className="w-3 h-3" /> Style:
                 </div>
                 <div className="flex gap-2">
                     {FLOW_STYLES.map(style => (
                         <button
                            key={style}
                            type="button"
                            onClick={() => setSelectedStyle(style)}
                            className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-all whitespace-nowrap ${
                                selectedStyle === style 
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
                            }`}
                         >
                             {style}
                         </button>
                     ))}
                 </div>
             </div>
             
             {/* Language Selector & Custom Style Input */}
             <div className="flex flex-wrap gap-3">
               <div className="flex items-center gap-2 bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 shrink-0 min-w-0 max-w-full">
                  <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent border-none text-xs text-slate-300 focus:ring-0 p-0 font-mono cursor-pointer min-w-0 flex-1 truncate"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value} className="bg-slate-900 text-slate-300">
                        {lang.label}
                      </option>
                    ))}
                  </select>
               </div>

               {selectedStyle === 'Custom' && (
                   <input 
                      type="text" 
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      placeholder="Custom style..."
                      className="flex-1 min-w-[120px] bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 font-mono transition-all"
                   />
               )}
             </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto p-4 glass-panel border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2 font-mono text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p className="flex-1">{error}</p>
          {error.includes("Required") && (
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold transition-colors flex items-center gap-1"
              >
                 <KeyRound className="w-3 h-3" /> SWITCH KEY
              </button>
          )}
        </div>
      )}

      {loading && (
        <LoadingState message={loadingStage} type="repo" />
      )}

      {/* Results Section */}
      {infographicData && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 2D Infographic Card */}
              <div className="glass-panel rounded-3xl p-1.5">
                 <div className="px-4 py-3 flex flex-wrap items-center justify-between border-b border-white/5 mb-1.5 gap-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-violet-400" /> Flow_Diagram
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setFullScreenImage({src: `data:image/png;base64,${infographicData}`, alt: `${currentRepoName} 2D`})}
                        className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-mono p-1.5 rounded-lg hover:bg-white/10"
                        title="Full Screen"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                      <a href={`data:image/png;base64,${infographicData}`} download={`${currentRepoName}-infographic-2d.png`} className="text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-mono bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/10 font-semibold">
                        <Download className="w-3 h-3" /> Save PNG
                      </a>
                    </div>
                </div>
                <div className="rounded-2xl overflow-hidden bg-[#eef8fe] relative group border border-slate-200/10">
                    {selectedStyle === "Neon Cyberpunk" && <div className="absolute inset-0 bg-slate-950 pointer-events-none mix-blend-multiply" />}
                    <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <img src={`data:image/png;base64,${infographicData}`} alt="Repository Flow Diagram" className="w-full h-auto object-cover transition-opacity relative z-10" />
                </div>
              </div>

              {/* 3D Infographic Card */}
              <div className="glass-panel rounded-3xl p-1.5 flex flex-col">
                 <div className="px-4 py-3 flex flex-wrap items-center justify-between border-b border-white/5 mb-1.5 shrink-0 gap-2">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-mono uppercase tracking-wider">
                      <Box className="w-4 h-4 text-fuchsia-400" /> Holographic_Model
                    </h3>
                    {infographic3DData && (
                      <div className="flex items-center gap-2 animate-in fade-in">
                        <button 
                            onClick={() => setFullScreenImage({src: `data:image/png;base64,${infographic3DData}`, alt: `${currentRepoName} 3D`})}
                            className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-mono p-1.5 rounded-lg hover:bg-white/10"
                            title="Full Screen"
                        >
                            <Maximize className="w-4 h-4" />
                        </button>
                        <a href={`data:image/png;base64,${infographic3DData}`} download={`${currentRepoName}-infographic-3d.png`} className="text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-mono bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/10 font-semibold">
                          <Download className="w-3 h-3" /> Save PNG
                        </a>
                      </div>
                    )}
                </div>
                
                <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950/30 relative flex items-center justify-center min-h-[300px] group">
                  {infographic3DData ? (
                      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                         <img src={`data:image/png;base64,${infographic3DData}`} alt="Repository 3D Flow Diagram" className="w-full h-full object-cover animate-in fade-in transition-opacity relative z-20" />
                      </div>
                  ) : generating3D ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center animate-in fade-in">
                         <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500/50" />
                         <p className="text-fuchsia-300/50 font-mono text-xs animate-pulse">RENDERING HOLOGRAPHIC MODEL...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                        <p className="text-slate-500 font-mono text-xs">Render tabletop perspective?</p>
                        <button 
                          onClick={handleGenerate3D}
                          className="px-5 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-xl font-semibold transition-all flex items-center gap-2 font-mono text-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          GENERATE_MODEL
                        </button>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
          <div className="pt-12 border-t border-white/5 animate-in fade-in">
              <div className="flex items-center gap-2 mb-6 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <h3 className="text-sm font-mono uppercase tracking-wider">Recent Blueprints</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {history.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="group bg-slate-900/50 border border-white/5 hover:border-violet-500/50 rounded-xl overflow-hidden text-left transition-all hover:shadow-neon-violet"
                      >
                          <div className="aspect-video relative overflow-hidden bg-slate-950">
                              <img src={`data:image/png;base64,${item.imageData}`} alt={item.repoName} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                              {item.is3D && (
                                  <div className="absolute top-2 right-2 bg-fuchsia-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">3D</div>
                              )}
                          </div>
                          <div className="p-3">
                              <p className="text-xs font-bold text-white truncate font-mono">{item.repoName}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{item.style}</p>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default RepoAnalyzer;
