/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Menu, X, Sparkles, LayoutDashboard } from 'lucide-react';

export type PageType = 'home' | 'about' | 'services' | 'portfolio' | 'blog' | 'contact';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onLoginClick: () => void;
  isAuthenticated?: boolean;
  onDashboardClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, onLoginClick, isAuthenticated, onDashboardClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { id: PageType; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'blog', label: 'Blog' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (page: PageType) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-slate-950/95 backdrop-blur-xl border-b border-white/5 py-4' 
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-xl font-serif">M</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-950 flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-slate-950" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white tracking-tight">Mike Eckmeyer</h1>
              <p className="text-xs text-slate-400 font-medium">Creative Designer</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  currentPage === item.id
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentPage === item.id && (
                  <span className="absolute inset-0 bg-white/10 rounded-full border border-white/20" />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={onDashboardClick}
                className="px-4 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 bg-emerald-500/10 rounded-full border border-emerald-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                AI Studio
              </button>
            )}
            <button
              onClick={() => handleNavClick('contact')}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 hover:scale-105"
            >
              Let's Talk
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-xl" />
        <div className="relative h-full flex flex-col items-center justify-center gap-6 p-6">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`text-3xl font-bold transition-all duration-300 ${
                currentPage === item.id
                  ? 'text-white'
                  : 'text-slate-500 hover:text-white'
              }`}
              style={{ 
                transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : '0ms',
                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                opacity: isMobileMenuOpen ? 1 : 0
              }}
            >
              {item.label}
            </button>
          ))}
          {isAuthenticated ? (
            <button
              onClick={() => {
                onDashboardClick?.();
                setIsMobileMenuOpen(false);
              }}
              className="mt-8 px-8 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-lg font-medium flex items-center gap-2"
              style={{
                transitionDelay: isMobileMenuOpen ? '300ms' : '0ms',
                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                opacity: isMobileMenuOpen ? 1 : 0
              }}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="mt-8 px-8 py-3 bg-white/10 border border-white/20 text-white rounded-full text-lg font-medium"
              style={{
                transitionDelay: isMobileMenuOpen ? '300ms' : '0ms',
                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                opacity: isMobileMenuOpen ? 1 : 0
              }}
            >
              AI Studio Login
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navigation;