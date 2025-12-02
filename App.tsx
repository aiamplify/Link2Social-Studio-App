/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Navigation, { PageType } from './components/Navigation';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ServicesPage from './components/ServicesPage';
import PortfolioPage from './components/PortfolioPage';
import BlogPage from './components/BlogPage';
import ContactPage from './components/ContactPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { PublishedPost, BlogPostResult } from './types';

type AppView = 'website' | 'login' | 'dashboard';

const App: React.FC = () => {
  const [appView, setAppView] = useState<AppView>('website');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Handle login - UNCHANGED from original
  const handleLogin = (u: string, p: string) => {
    if (u === 'admin' && p === 'admin') {
      setIsAuthenticated(true);
      setLoginError(null);
      setAppView('dashboard');
    } else {
      setLoginError("Invalid credentials");
    }
  };

  // Handle publish post - UNCHANGED from original
  const handlePublishPost = (post: BlogPostResult) => {
    const newPost: PublishedPost = {
      ...post,
      id: Date.now().toString(),
      publishDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };
    setPublishedPosts(prev => [newPost, ...prev]);
  };

  // Handle logout - UNCHANGED from original
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAppView('website');
    setCurrentPage('home');
  };

  // Navigate to login
  const handleLoginClick = () => {
    setAppView('login');
  };

  // Navigate back to website from login
  const handleCancelLogin = () => {
    setAppView('website');
  };

  // Navigate between pages
  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- LOGIN VIEW (UNCHANGED) ---
  if (appView === 'login') {
    return <Login onLogin={handleLogin} onCancel={handleCancelLogin} error={loginError} />;
  }

  // --- DASHBOARD VIEW (UNCHANGED - AI Tools Backend) ---
  if (appView === 'dashboard' && isAuthenticated) {
    return <Dashboard onPublishPost={handlePublishPost} onLogout={handleLogout} />;
  }

  // --- MAIN WEBSITE VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-violet-500/30">
      {/* Navigation */}
      <Navigation 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        onLoginClick={handleLoginClick}
      />

      {/* Page Content */}
      <main className="animate-in fade-in duration-500">
        {currentPage === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}
        
        {currentPage === 'about' && (
          <AboutPage onNavigate={handleNavigate} />
        )}
        
        {currentPage === 'services' && (
          <ServicesPage onNavigate={handleNavigate} />
        )}
        
        {currentPage === 'portfolio' && (
          <PortfolioPage onNavigate={handleNavigate} />
        )}
        
        {currentPage === 'blog' && (
          <BlogPage posts={publishedPosts} onNavigate={handleNavigate} />
        )}
        
        {currentPage === 'contact' && (
          <ContactPage onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
};

export default App;
