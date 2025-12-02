/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PublishedPost } from '../types';
import { 
  ArrowRight, Clock, User, ChevronLeft, BookOpen, Share2, 
  Sparkles, Search, Tag, TrendingUp, Calendar, X, Quote
} from 'lucide-react';

interface BlogPageProps {
  posts: PublishedPost[];
  onNavigate: (page: 'contact') => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ posts, onNavigate }) => {
  const [activePost, setActivePost] = useState<PublishedPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
  const filteredPosts = useMemo(() => {
    let filtered = posts;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.metadata.includes(selectedCategory));
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.subtitle?.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [posts, selectedCategory, searchQuery]);

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
      <div className="prose prose-lg md:prose-xl prose-invert max-w-none prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-p:text-slate-300 prose-p:leading-loose prose-li:text-slate-300 prose-strong:text-violet-200 font-serif">
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
                  if (line.startsWith('## ')) return <h2 key={i} className="text-3xl mt-16 mb-6 font-sans text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 border-l-4 border-violet-500 pl-4">{line.replace('## ', '')}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-2xl mt-10 mb-4 font-sans text-violet-100/90">{line.replace('### ', '')}</h3>;
                  if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-3 pl-2 marker:text-violet-500">{line.replace('- ', '')}</li>;
                  
                  // Rich Text Parsing
                  const richText = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                    .replace(/<span class="blue">(.*?)<\/span>/g, '<span class="text-violet-400 font-semibold">$1</span>')
                    .replace(/<u>(.*?)<\/u>/g, '<span class="underline decoration-violet-500 decoration-2 underline-offset-4 decoration-skip-ink">$1</span>');

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
        <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 z-[110] transition-all duration-100" style={{ width: `${readingProgress}%` }} />
        
        {/* Nav Overlay */}
        <nav className="sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 transition-all">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <button 
              onClick={() => setActivePost(null)} 
              className="group flex items-center gap-2 text-slate-400 hover:text-white font-sans font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
              <span>Back to Blog</span>
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
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-sans font-bold uppercase tracking-widest text-violet-500">
              <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold font-serif shadow-lg">
                {activePost.metadata.split('|')[0]?.trim().charAt(0) || "M"}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white font-sans">{activePost.metadata.split('|')[0] || "Mike Eckmeyer"}</div>
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
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto" />
            <h3 className="text-2xl font-bold text-white font-sans">Enjoyed this article?</h3>
            <button onClick={() => setActivePost(null)} className="px-8 py-3 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition-colors">
              Read More Articles
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- MAIN BLOG LIST VIEW ---
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-16">
        <div 
          className={`text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Design Insights & Tips</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            The Creative
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Blog</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
            Insights, tutorials, and thoughts on design, creativity, and building brands that stand out.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter */}
      {posts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 mb-12">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === cat 
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25' 
                    : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Blog Grid */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <BookOpen className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white font-sans mb-2">
              {posts.length === 0 ? 'No Articles Yet' : 'No Results Found'}
            </h3>
            <p className="text-slate-500 font-medium max-w-md">
              {posts.length === 0 
                ? 'Check back soon for new articles on design, creativity, and more.'
                : 'Try adjusting your search or filter to find what you\'re looking for.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => {
              const headerImg = post.visuals.find(v => v.id === 'header');
              const isFeatured = index === 0 && selectedCategory === 'All' && !searchQuery;
              
              return (
                <article 
                  key={post.id} 
                  className={`group relative bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all duration-500 cursor-pointer flex flex-col ${
                    isFeatured ? 'md:col-span-2 lg:col-span-2' : ''
                  }`}
                  onClick={() => setActivePost(post)}
                >
                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className={`overflow-hidden relative ${isFeatured ? 'aspect-[21/9]' : 'aspect-[4/3]'} bg-slate-900`}>
                    {headerImg?.imageData ? (
                      <img src={`data:image/png;base64,${headerImg.imageData}`} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
                        <BookOpen className="w-12 h-12 text-violet-500/30" />
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-violet-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                        {post.metadata.split('|')[2]?.trim() || "Article"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 flex flex-col flex-1 relative z-10">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      <Clock className="w-3 h-3" /> {calculateReadTime(post.content)}
                    </div>
                    
                    <h2 className={`font-bold text-white mb-4 leading-tight group-hover:text-violet-300 transition-colors font-sans ${isFeatured ? 'text-2xl md:text-4xl' : 'text-xl'}`}>
                      {post.title}
                    </h2>
                    
                    {post.subtitle && (
                      <p className={`text-slate-400 font-serif leading-relaxed line-clamp-3 mb-6 ${isFeatured ? 'text-lg' : 'text-sm'}`}>
                        {post.subtitle}
                      </p>
                    )}

                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {post.metadata.split('|')[0]?.trim().charAt(0) || "M"}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{post.metadata.split('|')[0] || "Mike Eckmeyer"}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-violet-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        Read Article <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="relative p-12 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl border border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <Quote className="w-10 h-10 text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Want Design Tips in Your Inbox?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Subscribe to get weekly insights on design trends, creative techniques, and business tips.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-6 py-4 bg-slate-900/50 border border-white/10 rounded-full text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
              />
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:shadow-lg transition-all whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;