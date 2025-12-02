/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play, Sparkles, Star, Zap, Palette, PenTool, Layers } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (page: 'portfolio' | 'contact' | 'services') => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Floating elements data
  const floatingElements = [
    { icon: Palette, color: 'violet', delay: 0, x: 10, y: 20 },
    { icon: PenTool, color: 'fuchsia', delay: 0.5, x: 85, y: 15 },
    { icon: Layers, color: 'emerald', delay: 1, x: 90, y: 70 },
    { icon: Star, color: 'amber', delay: 1.5, x: 5, y: 75 },
    { icon: Zap, color: 'cyan', delay: 2, x: 75, y: 85 },
  ];

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
            left: `${20 + mousePosition.x * 10}%`,
            top: `${10 + mousePosition.y * 10}%`,
            transform: `translate(-50%, -50%)`,
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[100px] transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
            right: `${10 + mousePosition.x * 5}%`,
            bottom: `${20 + mousePosition.y * 5}%`,
            transform: `translate(50%, 50%)`,
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[80px] transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
            left: '60%',
            top: '60%',
            transform: `translate(-50%, -50%)`,
          }}
        />

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating Elements */}
        {floatingElements.map((el, index) => (
          <div
            key={index}
            className={`absolute transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              transitionDelay: `${el.delay}s`,
              animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
              animationDelay: `${el.delay}s`,
            }}
          >
            <div className={`p-3 rounded-2xl bg-${el.color}-500/10 border border-${el.color}-500/20 backdrop-blur-sm`}>
              <el.icon className={`w-6 h-6 text-${el.color}-400`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-slate-300">Award-Winning Creative Designer</span>
        </div>

        {/* Main Heading */}
        <h1 
          className={`text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] mb-8 transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-white">Transforming Ideas</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
            Into Visual Magic
          </span>
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          I'm Mike Eckmeyer, a graphic designer helping small and medium-sized businesses 
          create stunning visuals that captivate audiences and drive results.
        </p>

        {/* CTA Buttons */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-1000 delay-600 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <button
            onClick={() => onNavigate('portfolio')}
            className="group relative px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full text-lg font-semibold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/25 hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              View My Work
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button
            onClick={() => onNavigate('contact')}
            className="group px-8 py-4 bg-white/5 border border-white/20 text-white rounded-full text-lg font-semibold hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Let's Collaborate
          </button>
        </div>

        {/* Stats */}
        <div 
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto transition-all duration-1000 delay-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {[
            { value: '150+', label: 'Projects Completed' },
            { value: '50+', label: 'Happy Clients' },
            { value: '8+', label: 'Years Experience' },
            { value: '25+', label: 'Awards Won' },
          ].map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-slate-500 font-medium">Scroll to explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-slate-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;