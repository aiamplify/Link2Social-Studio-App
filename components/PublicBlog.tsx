
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo } from 'react';
import { PublishedPost } from '../types';
import { LogIn, ArrowRight, X, Clock, User, Tag, ChevronLeft, BookOpen, Share2, Sparkles, Search } from 'lucide-react';

interface PublicBlogProps {
  posts: PublishedPost[];
  onLoginClick: () => void;
}

const PublicBlog: React.FC<PublicBlogProps> = ({ posts, onLoginClick }) => {
  const [activePost, setActivePost] = useState<PublishedPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [readingProgress, setReadingProgress] = useState(0);

  // Extract unique categories from posts
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    posts.forEach(p => {
        const c = p.metadata.split('|')[2]?.trim();
        if (c) cats.add(c);
    });
    return Array.from(cats);
  }, [posts]);

  // Filter posts
  const filteredPosts = selectedCategory === 'All' 
    ? posts 
    : posts.filter(p => p.metadata.includes(selectedCategory));

  // Scroll listener for reading progress
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setReadingProgress(progress);
  };

  const calculateReadTime = (content: string) => {
      const wordsPerMinute = 200;
      const words = content.trim().split(/\s+/).length;
      const time = Math.ceil(words / wordsPerMinute);
      return `${time} min read`;
  };

  // Helper to render markdown content for the blog
  const renderMarkdown = (content: string, visuals: any[]) => {
      const parts = content.split(/(\[\[IMAGE_\d+\]\])/g);
      
      return (
          <div className="prose prose-lg md:prose-xl prose-invert max-w-none prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-p:text-slate-300 prose-p:leading-loose prose-li:text-slate-300 prose-strong:text-orange-200 font-serif">
              {parts.map((part, idx) => {
                  const match = part.match(/\[\[IMAGE_(\d+)\]\]/);
                  if (match) {
                      const imgIndex = parseInt(match[1]);
                      const visual = visuals.find(v => v.id === `image_${imgIndex}`);
                      
                      if (visual && visual.imageData) {
                          return (
                              <figure key={idx} className="my-12 group relative rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-slate-950">
                                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                                   <img src={`data:image/png;base64,${visual.imageData}`} alt={visual.caption} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" />
                                   <figcaption className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-white/90 italic font-sans z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                       {visual.caption}
                                   </figcaption>
                              </figure>
                          );
                      }
                      return null;
                  } else {
                      return (
                          <span key={idx}>
                             {part.split('\n').map((line, i) => {
                                 if (!line.trim()) return <br key={i}/>;
                                 if (line.startsWith('# ')) return null; 
                                 if (line.startsWith('## ')) return <h2 key={i} className="text-3xl mt-16 mb-6 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 border-l-4 border-orange-500 pl-4">{line.replace('## ', '')}</h2>;
                                 if (line.startsWith('### ')) return <h3 key={i} className="text-2xl mt-10 mb-4 font-sans text-orange-100/90">{line.replace('### ', '')}</h3>;
                                 if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-3 pl-2 marker:text-orange-500">{line.replace('- ', '')}</li>;
                                 
                                 // Rich Text Parsing for Blue Text and Underline
                                 const richText = line
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                                    .replace(/<span class="blue">(.*?)<\/span>/g, '<span class="text-blue-400 font-semibold">$1</span>')
                                    .replace(/<u>(.*?)<\/u>/g, '<span class="underline decoration-orange-500 decoration-2 underline-offset-4 decoration-skip-ink">$1</span>');

                                 return <p key={i} className="mb-8 text-lg opacity-90" dangerouslySetInnerHTML={{ __html: richText }} />;
                             })}
                          </span>
                      );
                  }
              })}
          </div>
      );
  };

  // --- ARTICLE READING VIEW ---
  if (activePost) {
      const headerImg = activePost.visuals.find(v => v.id === 'header');
      return (
          <div className="fixed inset-0 bg-slate-950 text-slate-200 z-[100] overflow-y-auto scroll-smooth" onScroll={handleScroll}>
               {/* Reading Progress Bar */}
               <div className="fixed top-0 left-0 h-1 bg-orange-500 z-[110] transition-all duration-100" style={{ width: `${readingProgress}%` }} />
               
               {/* Nav Overlay */}
              <nav className="sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 transition-all">
                  <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                      <button 
                        onClick={() => setActivePost(null)} 
                        className="group flex items-center gap-2 text-slate-400 hover:text-white font-sans font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                      >
                          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
                          <span>Back</span>
                      </button>
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors" title="Share">
                            <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                  </div>
              </nav>
              
              <main className="max-w-3xl mx-auto px-6 py-12">
                  <header className="mb-12 text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-sans font-bold uppercase tracking-widest text-orange-500">
                           <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                              {activePost.metadata.split('|')[2] || "Article"}
                           </span>
                           <span className="flex items-center gap-1 text-slate-500">
                               <Clock className="w-3 h-3" /> {calculateReadTime(activePost.content)}
                           </span>
                      </div>
                      
                      <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-white leading-[1.1] tracking-tight">
                          {activePost.title}
                      </h1>
                      
                      {activePost.subtitle && (
                          <p className="text-xl md:text-2xl text-slate-400 font-serif italic max-w-2xl mx-auto leading-relaxed">
                              {activePost.subtitle}
                          </p>
                      )}

                      <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5 w-fit mx-auto px-8">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-bold font-serif shadow-lg">
                                {activePost.metadata.split('|')[0]?.trim().charAt(0) || "A"}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-white font-sans">{activePost.metadata.split('|')[0] || "Admin"}</div>
                                <div className="text-xs text-slate-500 font-sans">{activePost.publishDate}</div>
                            </div>
                      </div>
                  </header>

                  {headerImg?.imageData && (
                      <div className="mb-16 -mx-6 md:-mx-12 lg:-mx-20 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 group relative">
                          <img src={`data:image/png;base64,${headerImg.imageData}`} className="w-full h-auto object-cover" alt="Header" />
                      </div>
                  )}

                  <div className="pb-32 animate-in fade-in duration-1000 delay-300">
                      {renderMarkdown(activePost.content, activePost.visuals)}
                  </div>

                   {/* Footer CTA */}
                  <div className="border-t border-white/10 pt-12 mt-12 text-center space-y-6">
                      <Sparkles className="w-8 h-8 text-orange-400 mx-auto" />
                      <h3 className="text-2xl font-bold text-white font-sans">Enjoyed this article?</h3>
                      <button onClick={() => setActivePost(null)} className="px-8 py-3 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition-colors">
                          Read More Articles
                      </button>
                  </div>
              </main>
          </div>
      );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-orange-500/30">
      
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setSelectedCategory('All'); window.scrollTo(0,0); }}>
                  <div className="w-10 h-10 bg-gradient-to-br from-white to-slate-400 text-slate-950 flex items-center justify-center rounded-xl font-bold font-serif shadow-lg shadow-white/10 group-hover:scale-105 transition-transform">T</div>
                  <span className="font-bold text-xl tracking-tight text-white group-hover:text-orange-200 transition-colors">Tech Insights</span>
              </div>
              <button 
                  onClick={onLoginClick}
                  className="group px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-sm font-medium border border-white/5 hover:border-white/20 transition-all flex items-center gap-2"
              >
                  <LogIn className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" /> 
                  <span className="hidden sm:inline">Admin Login</span>
              </button>
          </div>
      </nav>

      {/* Hero Section - PRESERVED EXACTLY AS REQUESTED */}
      <header className="py-20 md:py-32 px-6 bg-slate-950 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950 to-slate-950 pointer-events-none"></div>
          <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
              <div className="inline-block px-4 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  Future Trends & Analysis
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                  Navigating the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">Digital Frontier</span>.
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-serif leading-relaxed">
                  In-depth articles exploring the intersection of technology, creativity, and human progress.
              </p>
          </div>
      </header>

      {/* Filter Bar */}
      {posts.length > 0 && (
          <div className="sticky top-[73px] z-30 bg-slate-950/95 backdrop-blur-sm border-b border-white/5 py-4 overflow-x-auto no-scrollbar">
              <div className="max-w-7xl mx-auto px-6 flex items-center gap-2">
                  {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                            selectedCategory === cat 
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Blog Grid */}
      <main className="max-w-7xl mx-auto px-6 py-16 min-h-[60vh]">
          {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95">
                  <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                      <Search className="w-10 h-10 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-white font-sans mb-2">No Articles Found</h3>
                  <p className="text-slate-500 font-medium">Try adjusting your filters or check back later.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
                  {/* Featured Post Logic: First post spans 2 cols if on large screen */}
                  {filteredPosts.map((post, index) => {
                      const headerImg = post.visuals.find(v => v.id === 'header');
                      const isFeatured = index === 0 && selectedCategory === 'All';
                      
                      return (
                          <article 
                            key={post.id} 
                            className={`group relative bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all duration-500 cursor-pointer flex flex-col ${isFeatured ? 'md:col-span-2 lg:col-span-2' : ''}`}
                            onClick={() => setActivePost(post)}
                          >
                              {/* Hover Glow Effect */}
                              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                              <div className={`overflow-hidden relative ${isFeatured ? 'aspect-[21/9]' : 'aspect-[4/3]'} bg-slate-900`}>
                                  {headerImg?.imageData ? (
                                      <img src={`data:image/png;base64,${headerImg.imageData}`} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-800">
                                          <BookOpen className="w-12 h-12 opacity-20" />
                                      </div>
                                  )}
                                  
                                  {/* Badge */}
                                  <div className="absolute top-4 left-4">
                                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                                          {post.metadata.split('|')[2]?.trim() || "Article"}
                                      </span>
                                  </div>
                              </div>

                              <div className="p-6 md:p-8 flex flex-col flex-1 relative z-10">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                      <Clock className="w-3 h-3" /> {calculateReadTime(post.content)}
                                  </div>
                                  
                                  <h2 className={`font-bold text-white mb-4 leading-tight group-hover:text-orange-300 transition-colors font-sans ${isFeatured ? 'text-2xl md:text-4xl' : 'text-xl'}`}>
                                      {post.title}
                                  </h2>
                                  
                                  {post.subtitle && (
                                      <p className={`text-slate-400 font-serif leading-relaxed line-clamp-3 mb-6 ${isFeatured ? 'text-lg' : 'text-sm'}`}>
                                          {post.subtitle}
                                      </p>
                                  )}

                                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                             {post.metadata.split('|')[0]?.trim().charAt(0) || "A"}
                                          </div>
                                          <span className="text-xs text-slate-400 font-medium">{post.metadata.split('|')[0] || "Admin"}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 text-orange-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                          Read Article <ArrowRight className="w-3 h-3" />
                                      </div>
                                  </div>
                              </div>
                          </article>
                      );
                  })}
              </div>
          )}
      </main>

      <footer className="bg-slate-950 border-t border-white/5 text-slate-500 py-16 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
                   <div className="w-8 h-8 bg-slate-800 flex items-center justify-center rounded-lg font-bold font-serif text-slate-400">T</div>
                   <span className="font-bold text-lg text-slate-300">Tech Insights</span>
              </div>
              <div className="flex gap-8 text-sm font-medium">
                  <a href="#" className="hover:text-white transition-colors">Privacy</a>
                  <a href="#" className="hover:text-white transition-colors">Terms</a>
                  <a href="#" className="hover:text-white transition-colors">RSS</a>
              </div>
              <div className="text-sm opacity-50">© {new Date().getFullYear()} Tech Insights.</div>
          </div>
      </footer>
    </div>
  );
};

export default PublicBlog;
