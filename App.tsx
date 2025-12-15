/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

// Session persistence keys
const SESSION_KEYS = {
  IS_AUTHENTICATED: 'l2s_isAuthenticated',
  APP_VIEW: 'l2s_appView',
  CURRENT_PAGE: 'l2s_currentPage',
} as const;

// Helper to safely get from localStorage
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
};

// Helper to safely set localStorage
const setStoredValue = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

// Helper to clear session
const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(SESSION_KEYS.APP_VIEW);
    localStorage.removeItem(SESSION_KEYS.CURRENT_PAGE);
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const App: React.FC = () => {
  // Initialize state from localStorage for session persistence
  const [appView, setAppView] = useState<AppView>(() =>
    getStoredValue<AppView>(SESSION_KEYS.APP_VIEW, 'website')
  );
  const [currentPage, setCurrentPage] = useState<PageType>(() =>
    getStoredValue<PageType>(SESSION_KEYS.CURRENT_PAGE, 'home')
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    getStoredValue<boolean>(SESSION_KEYS.IS_AUTHENTICATED, false)
  );
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Persist appView changes to localStorage
  useEffect(() => {
    setStoredValue(SESSION_KEYS.APP_VIEW, appView);
  }, [appView]);

  // Persist currentPage changes to localStorage
  useEffect(() => {
    setStoredValue(SESSION_KEYS.CURRENT_PAGE, currentPage);
  }, [currentPage]);

  // Persist authentication state to localStorage
  useEffect(() => {
    setStoredValue(SESSION_KEYS.IS_AUTHENTICATED, isAuthenticated);
  }, [isAuthenticated]);

  // On mount, validate session state consistency
  useEffect(() => {
    // If not authenticated but on dashboard, redirect to website
    if (!isAuthenticated && appView === 'dashboard') {
      setAppView('website');
    }
  }, []); // Run only on mount

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

  // Handle logout - clears session and returns to website
  const handleLogout = () => {
    clearSession();
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

  // Navigate to dashboard (when already authenticated)
  const handleDashboardClick = () => {
    setAppView('dashboard');
  };

  // Navigate from dashboard to view blog
  const handleViewBlog = () => {
    setAppView('website');
    setCurrentPage('blog');
  };

  // --- LOGIN VIEW (UNCHANGED) ---
  if (appView === 'login') {
    return <Login onLogin={handleLogin} onCancel={handleCancelLogin} error={loginError} />;
  }

  // --- DASHBOARD VIEW (AI Tools Backend) ---
  if (appView === 'dashboard' && isAuthenticated) {
    return <Dashboard onPublishPost={handlePublishPost} onLogout={handleLogout} onViewBlog={handleViewBlog} />;
  }

  // --- MAIN WEBSITE VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-violet-500/30">
      {/* Navigation */}
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLoginClick={handleLoginClick}
        isAuthenticated={isAuthenticated}
        onDashboardClick={handleDashboardClick}
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
          <BlogPage
            posts={publishedPosts}
            onNavigate={handleNavigate}
            isAuthenticated={isAuthenticated}
            onDashboardClick={handleDashboardClick}
          />
        )}
        
        {currentPage === 'contact' && (
          <ContactPage onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
};

export default App;
