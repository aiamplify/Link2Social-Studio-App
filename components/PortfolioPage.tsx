/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ArrowRight, Filter, Grid, Rows, Sparkles, Eye, Heart, Share2 } from 'lucide-react';

interface PortfolioPageProps {
  onNavigate: (page: 'contact') => void;
}

interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  description: string;
  client: string;
  year: string;
  tags: string[];
  color: string;
  stats: { views: string; likes: string };
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const categories = ['All', 'Branding', 'Social Media', 'Web Design', 'Packaging', 'Print'];

  const portfolioItems: PortfolioItem[] = [
    {
      id: 1,
      title: 'Luxe Beauty Brand Identity',
      category: 'Branding',
      description: 'Complete brand identity for a premium beauty brand including logo, packaging, and marketing materials. The design captures elegance and sophistication while maintaining approachability.',
      client: 'Luxe Beauty Co.',
      year: '2024',
      tags: ['Logo Design', 'Brand Guidelines', 'Packaging'],
      color: 'violet',
      stats: { views: '2.4K', likes: '186' },
    },
    {
      id: 2,
      title: 'TechStart Social Campaign',
      category: 'Social Media',
      description: 'A comprehensive social media campaign for a tech startup launch, featuring animated posts, story templates, and engagement-driving content.',
      client: 'TechStart Inc.',
      year: '2024',
      tags: ['Social Graphics', 'Animation', 'Campaign'],
      color: 'fuchsia',
      stats: { views: '5.1K', likes: '342' },
    },
    {
      id: 3,
      title: 'Artisan Coffee Website',
      category: 'Web Design',
      description: 'Modern e-commerce website design for an artisan coffee roaster, featuring immersive product photography and seamless user experience.',
      client: 'Bean & Brew',
      year: '2023',
      tags: ['UI/UX', 'E-commerce', 'Responsive'],
      color: 'amber',
      stats: { views: '3.8K', likes: '267' },
    },
    {
      id: 4,
      title: 'Organic Skincare Packaging',
      category: 'Packaging',
      description: 'Sustainable packaging design for an organic skincare line, using eco-friendly materials and minimalist aesthetics.',
      client: 'Pure Glow',
      year: '2024',
      tags: ['Packaging', 'Sustainable', 'Product Design'],
      color: 'emerald',
      stats: { views: '1.9K', likes: '145' },
    },
    {
      id: 5,
      title: 'Fitness App Branding',
      category: 'Branding',
      description: 'Dynamic brand identity for a fitness application, featuring energetic colors and motivational design elements.',
      client: 'FitPulse',
      year: '2023',
      tags: ['App Design', 'Logo', 'UI Kit'],
      color: 'cyan',
      stats: { views: '4.2K', likes: '298' },
    },
    {
      id: 6,
      title: 'Restaurant Menu Design',
      category: 'Print',
      description: 'Elegant menu design for an upscale restaurant, featuring custom typography and food photography integration.',
      client: 'The Golden Fork',
      year: '2024',
      tags: ['Print Design', 'Typography', 'Layout'],
      color: 'rose',
      stats: { views: '1.5K', likes: '112' },
    },
    {
      id: 7,
      title: 'Fashion Brand Social Kit',
      category: 'Social Media',
      description: 'Complete social media kit for a fashion brand including templates for posts, stories, and highlights.',
      client: 'Vogue Street',
      year: '2024',
      tags: ['Templates', 'Fashion', 'Instagram'],
      color: 'violet',
      stats: { views: '6.7K', likes: '489' },
    },
    {
      id: 8,
      title: 'SaaS Dashboard Design',
      category: 'Web Design',
      description: 'Clean and intuitive dashboard design for a SaaS analytics platform with data visualization components.',
      client: 'DataFlow',
      year: '2023',
      tags: ['Dashboard', 'UI/UX', 'Data Viz'],
      color: 'cyan',
      stats: { views: '3.2K', likes: '234' },
    },
  ];

  const filteredItems = selectedCategory === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === selectedCategory);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
      violet: { bg: 'bg-violet-500', border: 'border-violet-500/30', text: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-500/5' },
      fuchsia: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', gradient: 'from-fuchsia-500/20 to-fuchsia-500/5' },
      cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500/30', text: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-500/5' },
      emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500/30', text: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
      amber: { bg: 'bg-amber-500', border: 'border-amber-500/30', text: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5' },
      rose: { bg: 'bg-rose-500', border: 'border-rose-500/30', text: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-500/5' },
    };
    return colors[color] || colors.violet;
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <div 
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Featured Work</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Creative Portfolio
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Showcase</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            A curated collection of my best work across branding, web design, social media, and more.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-white text-slate-900'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-full">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-full transition-all ${
                viewMode === 'masonry' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rows className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
          {filteredItems.map((item, index) => {
            const colors = getColorClasses(item.color);
            return (
              <div
                key={item.id}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                  viewMode === 'masonry' && index % 3 === 0 ? 'md:row-span-2' : ''
                }`}
                onClick={() => setSelectedProject(item)}
                onMouseEnter={() => setHoveredProject(item.id)}
                onMouseLeave={() => setHoveredProject(null)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}`} />
                
                {/* Placeholder Image Area */}
                <div className={`relative aspect-[4/3] ${viewMode === 'masonry' && index % 3 === 0 ? 'md:aspect-[4/5]' : ''} bg-slate-900/50 border border-white/5 group-hover:border-white/20 transition-all duration-500`}>
                  {/* Placeholder Pattern */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-24 h-24 ${colors.bg} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 ${colors.bg} text-white text-xs font-bold rounded-full`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="absolute top-4 right-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Eye className="w-3 h-3" /> {item.stats.views}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Heart className="w-3 h-3" /> {item.stats.likes}
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-xl font-bold text-white mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                      {item.client} • {item.year}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Project Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedProject(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Project Image */}
            <div className={`aspect-video bg-gradient-to-br ${getColorClasses(selectedProject.color).gradient} flex items-center justify-center`}>
              <div className={`w-32 h-32 ${getColorClasses(selectedProject.color).bg} rounded-3xl opacity-30`} />
            </div>

            {/* Project Details */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 ${getColorClasses(selectedProject.color).bg} text-white text-xs font-bold rounded-full`}>
                  {selectedProject.category}
                </span>
                <span className="text-slate-500 text-sm">{selectedProject.year}</span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">{selectedProject.title}</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">{selectedProject.description}</p>

              <div className="flex flex-wrap gap-2 mb-8">
                {selectedProject.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div>
                  <p className="text-sm text-slate-500">Client</p>
                  <p className="text-white font-medium">{selectedProject.client}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="px-6 py-3 bg-white text-slate-900 rounded-full font-semibold hover:shadow-lg transition-all flex items-center gap-2">
                    View Live <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="relative p-12 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl border border-white/10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(139,92,246,0.15),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Like What You See?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Let's create something amazing together. I'm always excited to take on new challenges.
            </p>
            <button
              onClick={() => onNavigate('contact')}
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto"
            >
              Start a Project
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PortfolioPage;