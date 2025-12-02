/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import HeroSection from './HeroSection';
import { 
  ArrowRight, Star, Quote, Palette, Globe, Share2, 
  Package, CheckCircle, Sparkles, Play, Users, Award
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'about' | 'services' | 'portfolio' | 'contact' | 'blog') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const services = [
    {
      icon: Palette,
      title: 'Brand Identity',
      description: 'Complete brand systems that tell your unique story',
      color: 'violet',
    },
    {
      icon: Share2,
      title: 'Social Media',
      description: 'Scroll-stopping content that drives engagement',
      color: 'fuchsia',
    },
    {
      icon: Globe,
      title: 'Web Design',
      description: 'Modern websites that convert visitors to customers',
      color: 'cyan',
    },
    {
      icon: Package,
      title: 'Packaging',
      description: 'Product packaging that stands out on shelves',
      color: 'emerald',
    },
  ];

  const testimonials = [
    {
      quote: "Mike transformed our brand completely. The new identity has helped us stand out in a crowded market and connect with our audience on a deeper level.",
      author: "Sarah Chen",
      role: "CEO, TechStart Inc.",
      rating: 5,
    },
    {
      quote: "Working with Mike was an absolute pleasure. He understood our vision immediately and delivered designs that exceeded our expectations.",
      author: "James Wilson",
      role: "Founder, Bean & Brew",
      rating: 5,
    },
    {
      quote: "The social media graphics Mike created for us increased our engagement by 300%. His creativity and attention to detail are unmatched.",
      author: "Emily Rodriguez",
      role: "Marketing Director, Luxe Beauty",
      rating: 5,
    },
  ];

  const clients = [
    'TechStart', 'Bean & Brew', 'Luxe Beauty', 'FitPulse', 
    'Pure Glow', 'DataFlow', 'Vogue Street', 'Golden Fork'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection onNavigate={onNavigate} />

      {/* Trusted By Section */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-slate-500 uppercase tracking-widest mb-8">
            Trusted by innovative brands
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {clients.map((client, index) => (
              <div 
                key={index}
                className="text-xl md:text-2xl font-bold text-slate-700 hover:text-slate-500 transition-colors cursor-default"
              >
                {client}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">What I Do</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Design Services That
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"> Deliver Results</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              From brand identity to social media, I create visual solutions that help businesses grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {services.map((service, index) => (
              <div
                key={index}
                className="group p-8 bg-slate-900/50 rounded-3xl border border-white/5 hover:border-violet-500/30 transition-all duration-500 cursor-pointer"
                onClick={() => onNavigate('services')}
              >
                <div className={`w-14 h-14 bg-${service.color}-500/10 border border-${service.color}-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className={`w-7 h-7 text-${service.color}-400`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-slate-400 text-sm">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate('services')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/20 text-white rounded-full font-semibold hover:bg-white/10 transition-all duration-300"
            >
              View All Services
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Work Preview */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
                <Award className="w-4 h-4 text-fuchsia-400" />
                <span className="text-sm font-medium text-fuchsia-300">Featured Work</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Recent Projects
              </h2>
            </div>
            <button
              onClick={() => onNavigate('portfolio')}
              className="inline-flex items-center gap-2 text-violet-400 font-semibold hover:text-violet-300 transition-colors"
            >
              View All Work
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Luxe Beauty Brand', category: 'Branding', color: 'violet' },
              { title: 'TechStart Campaign', category: 'Social Media', color: 'fuchsia' },
              { title: 'Artisan Coffee Web', category: 'Web Design', color: 'amber' },
            ].map((project, index) => (
              <div
                key={index}
                className="group relative aspect-[4/3] bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all duration-500 cursor-pointer"
                onClick={() => onNavigate('portfolio')}
              >
                {/* Placeholder */}
                <div className={`absolute inset-0 bg-gradient-to-br from-${project.color}-500/20 to-${project.color}-500/5`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-20 h-20 bg-${project.color}-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <span className={`inline-block px-3 py-1 bg-${project.color}-500 text-white text-xs font-bold rounded-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
                    {project.category}
                  </span>
                  <h3 className="text-xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    {project.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-500/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Client Love</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              What Clients Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-slate-900/50 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all duration-300"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-slate-700 mb-4" />
                <p className="text-slate-300 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{testimonial.author}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative p-12 md:p-20 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent rounded-[3rem] border border-white/10 text-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.2),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.15),transparent_50%)]" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Currently Available for Projects</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Ready to Transform
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Your Brand?</span>
              </h2>

              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Let's create something extraordinary together. Book a free consultation 
                and let's discuss how I can help bring your vision to life.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => onNavigate('contact')}
                  className="px-10 py-5 bg-white text-slate-900 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  Start a Project
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('portfolio')}
                  className="px-10 py-5 bg-white/5 border border-white/20 text-white rounded-full text-lg font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="font-bold text-white">Mike Eckmeyer</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <button onClick={() => onNavigate('about')} className="text-slate-400 hover:text-white transition-colors">About</button>
              <button onClick={() => onNavigate('services')} className="text-slate-400 hover:text-white transition-colors">Services</button>
              <button onClick={() => onNavigate('portfolio')} className="text-slate-400 hover:text-white transition-colors">Portfolio</button>
              <button onClick={() => onNavigate('blog')} className="text-slate-400 hover:text-white transition-colors">Blog</button>
              <button onClick={() => onNavigate('contact')} className="text-slate-400 hover:text-white transition-colors">Contact</button>
            </div>

            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Mike Eckmeyer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;