/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ArticleToInfographic from './ArticleToInfographic';
import ArticleToCarousel from './ArticleToCarousel';
import BlogToBlog from './BlogToBlog';
import YouTubeThumbnail from './YouTubeThumbnail';
import BrollCreator from './BrollCreator';
import ScriptVisualizer from './ScriptVisualizer';
import ViralPostAnalyzer from './ViralPostAnalyzer';
import DraftManager from './DraftManager';
import ScheduledPosts from './ScheduledPosts';
import ContentBundleDrafts from './ContentBundleDrafts';
import ContentCalendar from './ContentCalendar';
import Home from './Home';
import IntroAnimation from './IntroAnimation';
import { ViewMode, ArticleHistoryItem, BlogPostResult, DraftPost, ScheduledPost } from '../types';
import {
    saveDraft, scheduleNewPost, publishPostImmediately
} from '../services/postsService';
import {
    Github, PenTool, FileText, Home as HomeIcon, CreditCard, Share2, Layout, Youtube, Video, LogOut, Clapperboard,
    Command, Search, Sparkles, Zap, TrendingUp, Clock, Star, ChevronRight, X, Settings, Bell, User,
    BarChart3, Calendar, CalendarDays, Palette, Wand2, Layers, Download, Upload, FolderOpen, Plus, ArrowRight,
    Activity, Target, Eye, MousePointer, Heart, MessageSquare, Repeat, BookOpen, Lightbulb, Rocket,
    Crown, Diamond, Award, Flame, Timer, CheckCircle2, AlertCircle, Info, HelpCircle, Keyboard,
    Moon, Sun, Monitor, Maximize2, Minimize2, PanelLeftClose, PanelLeft, Grid3X3, List, LayoutGrid, Archive,
    CalendarCheck, Brain
} from 'lucide-react';

interface DashboardProps {
    onPublishPost: (post: BlogPostResult) => void;
    onLogout: () => void;
}

interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    action: ViewMode;
    shortcut?: string;
}

interface RecentActivity {
    id: string;
    type: 'infographic' | 'carousel' | 'blog' | 'thumbnail' | 'video' | 'script';
    title: string;
    timestamp: Date;
    status: 'completed' | 'in-progress' | 'failed';
}

interface UsageStats {
    totalCreations: number;
    thisWeek: number;
    thisMonth: number;
    streak: number;
    favorites: number;
}

// Dashboard persistence keys
const DASHBOARD_KEYS = {
    CURRENT_VIEW: 'l2s_dashboardView',
    SIDEBAR_COLLAPSED: 'l2s_sidebarCollapsed',
    SHOW_INTRO: 'l2s_showIntro',
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

const Dashboard: React.FC<DashboardProps> = ({ onPublishPost, onLogout }) => {
    // Initialize view state from localStorage for persistence across refreshes
    const [currentView, setCurrentView] = useState<ViewMode>(() =>
        getStoredValue<ViewMode>(DASHBOARD_KEYS.CURRENT_VIEW, ViewMode.HOME)
    );
    // Only show intro if user hasn't seen it before (persisted)
    const [showIntro, setShowIntro] = useState<boolean>(() =>
        getStoredValue<boolean>(DASHBOARD_KEYS.SHOW_INTRO, true)
    );

    // Command Palette State
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [commandSearch, setCommandSearch] = useState('');
    const commandInputRef = useRef<HTMLInputElement>(null);

    // Sidebar State - persisted
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
        getStoredValue<boolean>(DASHBOARD_KEYS.SIDEBAR_COLLAPSED, false)
    );
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Theme State
    const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

    // Persist currentView changes to localStorage
    useEffect(() => {
        setStoredValue(DASHBOARD_KEYS.CURRENT_VIEW, currentView);
    }, [currentView]);

    // Persist sidebarCollapsed changes to localStorage
    useEffect(() => {
        setStoredValue(DASHBOARD_KEYS.SIDEBAR_COLLAPSED, sidebarCollapsed);
    }, [sidebarCollapsed]);

    // Persist showIntro changes to localStorage
    useEffect(() => {
        setStoredValue(DASHBOARD_KEYS.SHOW_INTRO, showIntro);
    }, [showIntro]);
    
    // Lifted History State for Persistence
    const [articleHistory, setArticleHistory] = useState<ArticleHistoryItem[]>([]);
    
    // Recent Activity (mock data for now)
    const [recentActivity] = useState<RecentActivity[]>([
        { id: '1', type: 'infographic', title: 'Tech Trends 2024', timestamp: new Date(Date.now() - 3600000), status: 'completed' },
        { id: '2', type: 'carousel', title: 'Marketing Tips', timestamp: new Date(Date.now() - 7200000), status: 'completed' },
        { id: '3', type: 'blog', title: 'AI in Design', timestamp: new Date(Date.now() - 86400000), status: 'completed' },
        { id: '4', type: 'thumbnail', title: 'Product Launch', timestamp: new Date(Date.now() - 172800000), status: 'completed' },
    ]);
    
    // Usage Stats (mock data)
    const [usageStats] = useState<UsageStats>({
        totalCreations: 147,
        thisWeek: 23,
        thisMonth: 89,
        streak: 7,
        favorites: 12
    });

    // Quick Actions
    const quickActions: QuickAction[] = [
        { id: 'bundle', label: 'Content Bundle', description: 'Infographic + Social Posts', icon: FileText, color: 'emerald', action: ViewMode.ARTICLE_INFOGRAPHIC, shortcut: '⌘1' },
        { id: 'carousel', label: 'Carousel Creator', description: 'LinkedIn & IG Slides', icon: Layout, color: 'sky', action: ViewMode.CAROUSEL_GENERATOR, shortcut: '⌘2' },
        { id: 'blog', label: 'Blog Remix', description: 'AI-Powered Writing', icon: PenTool, color: 'orange', action: ViewMode.BLOG_TO_BLOG, shortcut: '⌘3' },
        { id: 'thumbnail', label: 'Viral Thumbnails', description: 'High CTR Designs', icon: Youtube, color: 'red', action: ViewMode.YOUTUBE_THUMBNAIL, shortcut: '⌘4' },
        { id: 'broll', label: 'B-Roll Creator', description: 'Cinematic Video', icon: Video, color: 'indigo', action: ViewMode.VIDEO_BROLL, shortcut: '⌘5' },
        { id: 'script', label: 'Script Visualizer', description: 'Storyboard Scenes', icon: Clapperboard, color: 'teal', action: ViewMode.VIDEO_SCRIPT_VISUALIZER, shortcut: '⌘6' },
        { id: 'viral', label: 'Viral Analyzer', description: 'Reverse-Engineer Posts', icon: Brain, color: 'pink', action: ViewMode.VIRAL_POST_ANALYZER, shortcut: '⌘7' },
    ];

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Command Palette: Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(prev => !prev);
            }
            
            // Quick navigation shortcuts
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 7) {
                    e.preventDefault();
                    const action = quickActions[num - 1];
                    if (action) setCurrentView(action.action);
                }
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                setShowCommandPalette(false);
                setShowNotifications(false);
                setShowUserMenu(false);
            }
            
            // Home: Cmd/Ctrl + H
            if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
                e.preventDefault();
                setCurrentView(ViewMode.HOME);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [quickActions]);

    // Focus command input when palette opens
    useEffect(() => {
        if (showCommandPalette && commandInputRef.current) {
            commandInputRef.current.focus();
        }
    }, [showCommandPalette]);

    const handleIntroComplete = () => {
        setShowIntro(false);
    };

    const handleNavigate = (mode: ViewMode) => {
        setCurrentView(mode);
        setShowCommandPalette(false);
    };

    const handleAddArticleHistory = (item: ArticleHistoryItem) => {
        setArticleHistory(prev => [item, ...prev]);
    };

    // Draft & Schedule handlers
    const handleSaveDraft = async (post: BlogPostResult) => {
        await saveDraft(post);
    };

    const handleSchedulePost = async (post: BlogPostResult, scheduledDate: Date) => {
        await scheduleNewPost(post, scheduledDate);
    };

    const handleEditDraft = (draft: DraftPost) => {
        // Navigate to blog editor - in a full implementation, this would load the draft
        setCurrentView(ViewMode.BLOG_TO_BLOG);
    };

    const handleEditScheduled = (post: ScheduledPost) => {
        // Navigate to blog editor - in a full implementation, this would load the scheduled post
        setCurrentView(ViewMode.BLOG_TO_BLOG);
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const getActivityIcon = (type: RecentActivity['type']) => {
        switch (type) {
            case 'infographic': return FileText;
            case 'carousel': return Layout;
            case 'blog': return PenTool;
            case 'thumbnail': return Youtube;
            case 'video': return Video;
            case 'script': return Clapperboard;
            default: return FileText;
        }
    };

    const getActivityColor = (type: RecentActivity['type']) => {
        switch (type) {
            case 'infographic': return 'emerald';
            case 'carousel': return 'sky';
            case 'blog': return 'orange';
            case 'thumbnail': return 'red';
            case 'video': return 'indigo';
            case 'script': return 'teal';
            default: return 'slate';
        }
    };

    const filteredActions = quickActions.filter(action => 
        action.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
        action.description.toLowerCase().includes(commandSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen flex bg-slate-950">
            {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

            {/* Command Palette Overlay */}
            {showCommandPalette && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCommandPalette(false)}
                    />
                    <div className="relative w-full max-w-2xl mx-4 animate-in fade-in slide-in-from-top-4 duration-200">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
                                <Search className="w-5 h-5 text-slate-400" />
                                <input
                                    ref={commandInputRef}
                                    type="text"
                                    value={commandSearch}
                                    onChange={(e) => setCommandSearch(e.target.value)}
                                    placeholder="Search tools, actions, or type a command..."
                                    className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-lg"
                                />
                                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
                                    <span className="text-[10px] text-slate-400 font-mono">ESC</span>
                                </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="p-2 max-h-[400px] overflow-y-auto">
                                <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                    Quick Actions
                                </div>
                                {filteredActions.map((action, idx) => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => handleNavigate(action.action)}
                                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group ${idx === 0 ? 'bg-white/5' : ''}`}
                                        >
                                            <div className={`p-2 rounded-lg bg-${action.color}-500/20 text-${action.color}-400 group-hover:bg-${action.color}-500 group-hover:text-white transition-colors`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-white font-medium">{action.label}</div>
                                                <div className="text-xs text-slate-500">{action.description}</div>
                                            </div>
                                            {action.shortcut && (
                                                <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-slate-400">
                                                    {action.shortcut}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                
                                {filteredActions.length === 0 && (
                                    <div className="px-4 py-8 text-center text-slate-500">
                                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No results found</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Footer */}
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> Navigate</span>
                                    <span className="flex items-center gap-1">↵ Select</span>
                                </div>
                                <span>Powered by AI Studio</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} flex-shrink-0 border-r border-white/5 bg-slate-900/50 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="p-4 border-b border-white/5">
                    <button 
                        onClick={() => setCurrentView(ViewMode.HOME)}
                        className="flex items-center gap-3 group w-full"
                    >
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="text-left">
                                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    Link2Social
                                    <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-[9px] font-mono text-violet-300 border border-violet-500/20">
                                        PRO
                                    </span>
                                </h1>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">AI Creative Studio</p>
                            </div>
                        )}
                    </button>
                </div>

                {/* Command Palette Trigger */}
                <div className="p-3">
                    <button
                        onClick={() => setShowCommandPalette(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <Search className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        {!sidebarCollapsed && (
                            <>
                                <span className="flex-1 text-left text-sm text-slate-400 group-hover:text-slate-300">Quick search...</span>
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-mono text-slate-500">
                                    ⌘K
                                </div>
                            </>
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {/* Home */}
                    <button
                        onClick={() => setCurrentView(ViewMode.HOME)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            currentView === ViewMode.HOME
                                ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-violet-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <HomeIcon className="w-5 h-5" />
                        {!sidebarCollapsed && <span className="font-medium">Home</span>}
                    </button>

                    {!sidebarCollapsed && (
                        <div className="pt-4 pb-2 px-3">
                            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Create</span>
                        </div>
                    )}

                    {quickActions.map(action => {
                        const Icon = action.icon;
                        const isActive = currentView === action.action;
                        return (
                            <button
                                key={action.id}
                                onClick={() => setCurrentView(action.action)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                    isActive
                                        ? `bg-${action.color}-500/10 text-${action.color}-300 border border-${action.color}-500/20`
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                title={sidebarCollapsed ? action.label : undefined}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? `text-${action.color}-400` : ''}`} />
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="flex-1 text-left font-medium">{action.label}</span>
                                        {action.shortcut && (
                                            <span className="text-[10px] font-mono text-slate-600">{action.shortcut.replace('⌘', '')}</span>
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}

                    {/* Content Management Section */}
                    {!sidebarCollapsed && (
                        <div className="pt-4 pb-2 px-3">
                            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Content</span>
                        </div>
                    )}

                    {/* Content Calendar - Primary scheduling view */}
                    <button
                        onClick={() => setCurrentView(ViewMode.CONTENT_CALENDAR)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            currentView === ViewMode.CONTENT_CALENDAR
                                ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Content Calendar' : undefined}
                    >
                        <Calendar className={`w-5 h-5 ${currentView === ViewMode.CONTENT_CALENDAR ? 'text-violet-400' : ''}`} />
                        {!sidebarCollapsed && (
                            <span className="flex-1 text-left font-medium">Content Calendar</span>
                        )}
                    </button>

                    {/* Drafts */}
                    <button
                        onClick={() => setCurrentView(ViewMode.DRAFTS)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            currentView === ViewMode.DRAFTS
                                ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Drafts' : undefined}
                    >
                        <FileText className={`w-5 h-5 ${currentView === ViewMode.DRAFTS ? 'text-violet-400' : ''}`} />
                        {!sidebarCollapsed && (
                            <span className="flex-1 text-left font-medium">Drafts</span>
                        )}
                    </button>

                    {/* Scheduled Posts */}
                    <button
                        onClick={() => setCurrentView(ViewMode.SCHEDULED)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            currentView === ViewMode.SCHEDULED
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Scheduled' : undefined}
                    >
                        <CalendarDays className={`w-5 h-5 ${currentView === ViewMode.SCHEDULED ? 'text-emerald-400' : ''}`} />
                        {!sidebarCollapsed && (
                            <span className="flex-1 text-left font-medium">Scheduled</span>
                        )}
                    </button>

                    {/* Content Bundle Drafts */}
                    <button
                        onClick={() => setCurrentView(ViewMode.CONTENT_BUNDLE_DRAFTS)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            currentView === ViewMode.CONTENT_BUNDLE_DRAFTS
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Saved Bundles' : undefined}
                    >
                        <Archive className={`w-5 h-5 ${currentView === ViewMode.CONTENT_BUNDLE_DRAFTS ? 'text-purple-400' : ''}`} />
                        {!sidebarCollapsed && (
                            <span className="flex-1 text-left font-medium">Saved Bundles</span>
                        )}
                    </button>
                </nav>

                {/* Stats Card */}
                {!sidebarCollapsed && (
                    <div className="p-3">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-bold text-white">{usageStats.streak} Day Streak!</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-2xl font-bold text-white">{usageStats.thisWeek}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">This Week</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{usageStats.totalCreations}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">Total</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Collapse Toggle & User */}
                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        </button>
                        
                        {!sidebarCollapsed && (
                            <>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors relative"
                                >
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full"></span>
                                </button>
                                
                                <button
                                    onClick={onLogout}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors ml-auto"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 border-b border-white/5 bg-slate-900/30 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => setCurrentView(ViewMode.HOME)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                Studio
                            </button>
                            {currentView !== ViewMode.HOME && (
                                <>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                    <span className="text-white font-medium">
                                        {quickActions.find(a => a.action === currentView)?.label ||
                                         (currentView === ViewMode.DRAFTS ? 'Drafts' :
                                         currentView === ViewMode.SCHEDULED ? 'Scheduled' :
                                         currentView === ViewMode.CONTENT_BUNDLE_DRAFTS ? 'Saved Bundles' :
                                         currentView === ViewMode.CONTENT_CALENDAR ? 'Content Calendar' :
                                         currentView === ViewMode.VIRAL_POST_ANALYZER ? 'Viral Analyzer' :
                                         'Home')}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* API Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">API Connected</span>
                        </div>

                        {/* Quick Create */}
                        <button
                            onClick={() => setShowCommandPalette(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-[1600px] mx-auto p-6">
                        {currentView === ViewMode.HOME && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Welcome Section */}
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent border border-violet-500/20 p-8">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-5 h-5 text-violet-400" />
                                            <span className="text-sm font-mono text-violet-400">Welcome back, Mike</span>
                                        </div>
                                        <h1 className="text-4xl font-bold text-white mb-2">
                                            What will you create today?
                                        </h1>
                                        <p className="text-slate-400 text-lg max-w-xl">
                                            Your AI-powered creative studio is ready. Generate stunning visuals, engaging content, and viral social media posts in seconds.
                                        </p>
                                        
                                        <div className="flex items-center gap-4 mt-6">
                                            <button
                                                onClick={() => setShowCommandPalette(true)}
                                                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                                            >
                                                <Rocket className="w-5 h-5" />
                                                Start Creating
                                            </button>
                                            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/10">
                                                <BookOpen className="w-5 h-5" />
                                                View Tutorials
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions Grid */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                                        <button className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                            View all <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        {quickActions.map(action => {
                                            const Icon = action.icon;
                                            return (
                                                <button
                                                    key={action.id}
                                                    onClick={() => setCurrentView(action.action)}
                                                    className={`group relative p-6 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-${action.color}-500/30 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-${action.color}-500/10`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl bg-${action.color}-500/20 flex items-center justify-center mb-4 group-hover:bg-${action.color}-500 transition-colors`}>
                                                        <Icon className={`w-6 h-6 text-${action.color}-400 group-hover:text-white transition-colors`} />
                                                    </div>
                                                    <h3 className="font-bold text-white mb-1">{action.label}</h3>
                                                    <p className="text-xs text-slate-500">{action.description}</p>
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowRight className={`w-4 h-4 text-${action.color}-400`} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Stats & Activity Row */}
                                <div className="grid lg:grid-cols-3 gap-6">
                                    {/* Performance Stats */}
                                    <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                                <BarChart3 className="w-5 h-5 text-violet-400" />
                                                Performance Overview
                                            </h2>
                                            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300">
                                                <option>Last 7 days</option>
                                                <option>Last 30 days</option>
                                                <option>Last 90 days</option>
                                            </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="p-4 rounded-xl bg-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Eye className="w-4 h-4 text-blue-400" />
                                                    <span className="text-xs text-slate-500">Views</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">12.4K</div>
                                                <div className="text-xs text-emerald-400">+23% ↑</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Heart className="w-4 h-4 text-red-400" />
                                                    <span className="text-xs text-slate-500">Engagement</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">8.2%</div>
                                                <div className="text-xs text-emerald-400">+5% ↑</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Repeat className="w-4 h-4 text-green-400" />
                                                    <span className="text-xs text-slate-500">Shares</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">342</div>
                                                <div className="text-xs text-emerald-400">+12% ↑</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Target className="w-4 h-4 text-violet-400" />
                                                    <span className="text-xs text-slate-500">CTR</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">4.7%</div>
                                                <div className="text-xs text-emerald-400">+8% ↑</div>
                                            </div>
                                        </div>

                                        {/* Mini Chart Placeholder */}
                                        <div className="h-32 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-white/5 flex items-center justify-center">
                                            <div className="flex items-end gap-1 h-20">
                                                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="w-6 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                                                        style={{ height: `${h}%` }}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                            <Activity className="w-5 h-5 text-violet-400" />
                                            Recent Activity
                                        </h2>
                                        <div className="space-y-3">
                                            {recentActivity.map(activity => {
                                                const Icon = getActivityIcon(activity.type);
                                                const color = getActivityColor(activity.type);
                                                return (
                                                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                                                        <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
                                                            <Icon className={`w-5 h-5 text-${color}-400`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-white truncate">{activity.title}</div>
                                                            <div className="text-xs text-slate-500">{getTimeAgo(activity.timestamp)}</div>
                                                        </div>
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button className="w-full mt-4 py-2 text-sm text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1">
                                            View all activity <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tips & Inspiration */}
                                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-amber-500/20">
                                            <Lightbulb className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Pro Tip of the Day</h3>
                                            <p className="text-slate-400">
                                                Use the <span className="text-amber-400 font-mono">⌘K</span> shortcut to quickly access any tool. 
                                                Combine infographics with carousel posts for 3x more engagement on LinkedIn!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentView === ViewMode.ARTICLE_INFOGRAPHIC && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ArticleToInfographic 
                                    history={articleHistory} 
                                    onAddToHistory={handleAddArticleHistory}
                                />
                            </div>
                        )}
                        {currentView === ViewMode.CAROUSEL_GENERATOR && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ArticleToCarousel />
                            </div>
                        )}
                        {currentView === ViewMode.BLOG_TO_BLOG && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <BlogToBlog
                                    onPublish={onPublishPost}
                                    onSaveDraft={handleSaveDraft}
                                    onSchedule={handleSchedulePost}
                                />
                            </div>
                        )}
                        {currentView === ViewMode.YOUTUBE_THUMBNAIL && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <YouTubeThumbnail />
                            </div>
                        )}
                        {currentView === ViewMode.VIDEO_BROLL && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <BrollCreator />
                            </div>
                        )}
                        {currentView === ViewMode.VIDEO_SCRIPT_VISUALIZER && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ScriptVisualizer />
                            </div>
                        )}
                        {currentView === ViewMode.VIRAL_POST_ANALYZER && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ViralPostAnalyzer />
                            </div>
                        )}
                        {currentView === ViewMode.DRAFTS && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <DraftManager
                                    onEditDraft={handleEditDraft}
                                    onRefresh={() => {}}
                                />
                            </div>
                        )}
                        {currentView === ViewMode.SCHEDULED && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ScheduledPosts
                                    onEditPost={handleEditScheduled}
                                    onRefresh={() => {}}
                                />
                            </div>
                        )}
                        {currentView === ViewMode.CONTENT_BUNDLE_DRAFTS && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ContentBundleDrafts
                                    onRefresh={() => {}}
                                />
                            </div>
                        )}
                        {currentView === ViewMode.CONTENT_CALENDAR && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ContentCalendar
                                    onRefresh={() => {}}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
