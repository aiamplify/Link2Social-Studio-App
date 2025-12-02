/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { generateBlogFromVideo } from '../services/geminiService';
import { BlogPostResult } from '../types';
import { Youtube, Loader2, AlertCircle, FileText, Download, Copy, Check, Image as ImageIcon, Sparkles, Globe, Palette } from 'lucide-react';
import ImageViewer from './ImageViewer';

const LANGUAGES = [
  { label: "English (US)", value: "English" },
  { label: "Spanish (Mexico)", value: "Spanish" },
  { label: "French (France)", value: "French" },
  { label: "German (Germany)", value: "German" },
  { label: "Portuguese (Brazil)", value: "Portuguese" },
  { label: "Japanese (Japan)", value: "Japanese" },
];

const VISUAL_STYLES = [
    "Modern Digital Art",
    "Photorealistic"
];

const YouTubeToBlog: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlogPostResult | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
        setError("Please provide a valid YouTube URL.");
        return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
        const data = await generateBlogFromVideo(urlInput, selectedStyle, selectedLanguage, (stage) => setLoadingStage(stage));
        setResult(data);
    } catch (err: any) {
        setError(err.message || "Failed to generate blog post.");
    } finally {
        setLoading(false);
    }
  };

  const copyContent = () => {
      if (result?.content) {
          navigator.clipboard.writeText(`# ${result.title}\n\n${result.content}`);
          setCopiedContent(true);
          setTimeout(() => setCopiedContent(false), 2000);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 mb-20">
      
      {fullScreenImage && (
          <ImageViewer 
            src={fullScreenImage.src} 
            alt={fullScreenImage.alt} 
            onClose={() => setFullScreenImage(null)} 
          />
      )}

      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-orange-200 to-slate-500 font-sans">
          Video 2 <span className="text-red-500">Blog</span>.
        </h2>
        <p className="text-slate-400 text-lg font-light tracking-wide">
          Transform YouTube videos into comprehensive, illustrated articles.
        </p>
      </div>

      {/* Input Section */}
      <div className="glass-panel rounded-3xl p-6 md:p-10 space-y-8 relative z-10">
         <form onSubmit={handleGenerate} className="space-y-8">
            <div className="space-y-4">
                <label className="text-xs text-red-400 font-mono tracking-wider flex items-center gap-2">
                    <Youtube className="w-4 h-4" /> YOUTUBE_URL
                </label>
                <div className="relative">
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-5 text-lg text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 font-mono transition-all shadow-inner"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                     <label className="text-xs text-red-400 font-mono tracking-wider flex items-center gap-2">
                        <Palette className="w-4 h-4" /> VISUAL_STYLE
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {VISUAL_STYLES.map(style => (
                            <button
                                key={style}
                                type="button"
                                onClick={() => setSelectedStyle(style)}
                                className={`py-3 px-2 rounded-xl font-mono text-xs transition-all border text-center ${
                                    selectedStyle === style 
                                    ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                    : 'bg-slate-900/50 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                     <label className="text-xs text-red-400 font-mono tracking-wider flex items-center gap-2">
                        <Globe className="w-4 h-4" /> LANGUAGE
                    </label>
                     <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 font-mono appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.value} value={lang.value} className="bg-slate-900 text-slate-300">
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || !urlInput.trim()}
                className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-mono text-base tracking-wider hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] group"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                {loading ? "PROCESSING VIDEO..." : "CREATE BLOG POST"}
            </button>
         </form>
      </div>

      {error && (
        <div className="glass-panel border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in font-mono text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
             <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             </div>
             <p className="text-red-300 font-mono animate-pulse uppercase tracking-wider">{loadingStage}</p>
        </div>
      )}

      {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 grid lg:grid-cols-12 gap-8">
              
              {/* Header Image Section - Side (Desktop) or Top (Mobile) */}
              {result.imageData && (
                  <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4">
                       <div className="glass-panel p-1.5 rounded-2xl">
                           <div className="bg-slate-950 rounded-xl overflow-hidden relative group aspect-video">
                                <img 
                                    src={`data:image/png;base64,${result.imageData}`} 
                                    alt="Blog Header" 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => setFullScreenImage({src: `data:image/png;base64,${result.imageData!}`, alt: result.title})}
                                        className="p-2 bg-white/20 backdrop-blur hover:bg-white/30 rounded-lg text-white"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={`data:image/png;base64,${result.imageData}`}
                                        download="header-image.png"
                                        className="p-2 bg-emerald-500/80 backdrop-blur hover:bg-emerald-500 rounded-lg text-white"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                           </div>
                       </div>
                       <p className="text-xs text-slate-500 font-mono text-center">
                           Generated by Nano Banana Pro
                       </p>
                  </div>
              )}

              {/* Blog Content Section */}
              <div className={`${result.imageData ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                  <div className="glass-panel rounded-3xl overflow-hidden">
                      <div className="border-b border-white/5 bg-slate-950/50 px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-20">
                          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                              <FileText className="w-4 h-4 text-red-400" /> BLOG_DRAFT
                          </h3>
                          <button 
                            onClick={copyContent}
                            className="text-xs flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-300 transition-colors font-mono border border-white/5"
                          >
                              {copiedContent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedContent ? "Copied" : "Copy Markdown"}
                          </button>
                      </div>
                      <div className="p-8 md:p-10 bg-slate-900/30">
                          <h1 className="text-3xl font-bold text-white mb-6 font-sans">{result.title}</h1>
                          <div className="prose prose-invert prose-slate max-w-none font-sans prose-headings:font-bold prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-red-400 prose-code:text-red-300 prose-code:bg-red-900/20 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10">
                              {result.content.split('\n').map((line, i) => (
                                  <p key={i} className="whitespace-pre-wrap">{line}</p>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default YouTubeToBlog;