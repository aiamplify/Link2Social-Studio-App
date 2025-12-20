/**
 * Content Calendar - Visual Social Media Scheduling
 *
 * A comprehensive calendar view for managing scheduled social media posts
 * with drag-and-drop, month/week/day views, and platform filtering.
 * Supports all 8 Blotato platforms: Twitter, Facebook, Instagram, LinkedIn, BlueSky, Threads, TikTok, YouTube
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, Grid3X3, List, LayoutGrid,
    Clock, Twitter, Linkedin, Instagram, Eye, Edit3, Trash2, Copy, RefreshCw, ExternalLink,
    AlertCircle, CheckCircle2, Loader2, MoreHorizontal, X, GripVertical, CalendarDays,
    TrendingUp, BarChart3, Target, Zap, Image, Video, FileText, Share2, ChevronDown,
    Facebook, Youtube, MessageCircle, Radio
} from 'lucide-react';
import {
    CalendarPost, SocialPlatform, CalendarPostStatus, CalendarDay, CalendarWeek, ALL_PLATFORMS
} from '../types';
import {
    fetchCalendarPostsForMonth,
    fetchCalendarPostsInRange,
    deleteCalendarPost,
    reschedulePost,
    retryFailedPost,
    computeStatsFromPosts,
    getPlatformColor,
    getPlatformName,
    getStatusColor,
    formatScheduledDateTime,
    getTimeUntilPost,
    groupPostsByDate
} from '../services/calendarService';
import { rescheduleBlotatoPost } from '../services/blotatoService';

interface ContentCalendarProps {
    onRefresh?: () => void;
}

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const ContentCalendar: React.FC<ContentCalendarProps> = ({ onRefresh }) => {
    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [posts, setPosts] = useState<CalendarPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<CalendarPostStatus | 'all'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Selection and modals
    const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
    const [showPostDetails, setShowPostDetails] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');

    // Drag and drop
    const [draggedPost, setDraggedPost] = useState<CalendarPost | null>(null);
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState<{
        total: number;
        scheduled: number;
        posted: number;
        failed: number;
        byPlatform: Record<SocialPlatform, number>;
    } | null>(null);

    // Cache ref to avoid redundant fetches
    const cacheRef = useRef<{
        key: string;
        posts: CalendarPost[];
        stats: typeof stats;
        timestamp: number;
    } | null>(null);

    // Debounce timer ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Generate cache key for current view
    const getCacheKey = useCallback(() => {
        return `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}-${viewMode}`;
    }, [currentDate, viewMode]);

    // Load posts for current view with caching and debouncing
    const loadPosts = useCallback(async (forceRefresh = false) => {
        // Clear any pending debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const cacheKey = getCacheKey();
        const now = Date.now();
        const CACHE_TTL = 30000; // 30 second cache

        // Check cache first (unless force refresh)
        if (!forceRefresh && cacheRef.current) {
            if (cacheRef.current.key === cacheKey && now - cacheRef.current.timestamp < CACHE_TTL) {
                setPosts(cacheRef.current.posts);
                setStats(cacheRef.current.stats);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            let startDate: Date;
            let endDate: Date;

            if (viewMode === 'month') {
                // Get full month range including overflow days
                const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                // Adjust to get full weeks
                startDate = new Date(firstDayOfMonth);
                startDate.setDate(startDate.getDate() - startDate.getDay());

                endDate = new Date(lastDayOfMonth);
                endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
                endDate.setHours(23, 59, 59, 999);
            } else if (viewMode === 'week') {
                startDate = new Date(currentDate);
                startDate.setDate(currentDate.getDate() - currentDate.getDay());
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
            } else {
                // Day view
                startDate = new Date(currentDate);
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(currentDate);
                endDate.setHours(23, 59, 59, 999);
            }

            // Fetch posts once, then compute stats from the fetched data (avoids double network request)
            const fetchedPosts = await fetchCalendarPostsInRange(startDate, endDate);
            const monthStats = computeStatsFromPosts(fetchedPosts);

            setPosts(fetchedPosts);
            setStats(monthStats);

            // Update cache
            cacheRef.current = {
                key: cacheKey,
                posts: fetchedPosts,
                stats: monthStats,
                timestamp: now
            };
        } catch (err) {
            console.error('Error loading calendar posts:', err);
            setError(err instanceof Error ? err.message : 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, [currentDate, viewMode, getCacheKey]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    // Memoize filtered posts for performance
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
            if (statusFilter !== 'all' && post.status !== statusFilter) return false;
            return true;
        });
    }, [posts, platformFilter, statusFilter]);

    // Memoize grouped posts for performance
    const postsByDate = useMemo(() => groupPostsByDate(filteredPosts), [filteredPosts]);

    // Generate calendar grid - memoized to avoid recalculation on every render
    const calendarDays = useMemo(() => {
        const weeks: CalendarDay[][] = [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);

        // Start from the Sunday before the first day of the month
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentWeek: CalendarDay[] = [];

        // Generate 6 weeks (42 days) to cover all possible month layouts
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dateKey = date.toISOString().split('T')[0];
            const dayPosts = postsByDate.get(dateKey) || [];

            currentWeek.push({
                date: new Date(date),
                posts: dayPosts,
                isCurrentMonth: date.getMonth() === month,
                isToday: date.getTime() === today.getTime()
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        return weeks;
    }, [currentDate, postsByDate]);

    // Navigation
    const navigatePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setDate(newDate.getDate() - 1);
        }
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Post actions
    const handleDeletePost = async (post: CalendarPost) => {
        if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

        try {
            await deleteCalendarPost(post.id);
            await loadPosts();
            setShowPostDetails(false);
            setSelectedPost(null);
        } catch (err) {
            console.error('Error deleting post:', err);
            alert('Failed to delete post');
        }
    };

    const handleReschedule = async () => {
        if (!selectedPost || !rescheduleDate || !rescheduleTime) return;

        try {
            const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
            await reschedulePost(selectedPost.id, newDateTime);
            await loadPosts();
            setShowRescheduleModal(false);
            setShowPostDetails(false);
            setSelectedPost(null);
            setRescheduleDate('');
            setRescheduleTime('');
        } catch (err) {
            console.error('Error rescheduling post:', err);
            alert('Failed to reschedule post');
        }
    };

    const handleRetryPost = async (post: CalendarPost) => {
        try {
            await retryFailedPost(post.id);
            await loadPosts();
        } catch (err) {
            console.error('Error retrying post:', err);
            alert('Failed to retry post');
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, post: CalendarPost) => {
        setDraggedPost(post);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', post.id);
    };

    const handleDragOver = (e: React.DragEvent, dateKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDate(dateKey);
    };

    const handleDragLeave = () => {
        setDragOverDate(null);
    };

    const handleDrop = async (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        setDragOverDate(null);

        if (!draggedPost) return;

        // Keep the same time, just change the date
        const originalDate = new Date(draggedPost.scheduledAt);
        const newDateTime = new Date(date);
        newDateTime.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);

        try {
            await reschedulePost(draggedPost.id, newDateTime);
            await loadPosts();
        } catch (err) {
            console.error('Error moving post:', err);
            alert('Failed to move post');
        }

        setDraggedPost(null);
    };

    // Get platform icon - supports all 8 Blotato platforms
    const getPlatformIcon = (platform: SocialPlatform, size: string = "w-3 h-3") => {
        switch (platform) {
            case 'twitter':
                return <Twitter className={size} />;
            case 'facebook':
                return <Facebook className={size} />;
            case 'instagram':
                return <Instagram className={size} />;
            case 'linkedin':
                return <Linkedin className={size} />;
            case 'bluesky':
                return <Radio className={size} />;
            case 'threads':
                return <MessageCircle className={size} />;
            case 'tiktok':
                return <Video className={size} />;
            case 'youtube':
                return <Youtube className={size} />;
            default:
                return <Share2 className={size} />;
        }
    };

    // Get status icon
    const getStatusIcon = (status: CalendarPostStatus) => {
        switch (status) {
            case 'scheduled':
                return <Clock className="w-3 h-3" />;
            case 'posting':
                return <Loader2 className="w-3 h-3 animate-spin" />;
            case 'posted':
                return <CheckCircle2 className="w-3 h-3" />;
            case 'failed':
                return <AlertCircle className="w-3 h-3" />;
        }
    };

    // Render post card for calendar cell
    const renderPostCard = (post: CalendarPost, compact: boolean = false) => {
        const platformColor = getPlatformColor(post.platform);
        const statusColor = getStatusColor(post.status);

        if (compact) {
            return (
                <div
                    key={post.id}
                    draggable={post.status === 'scheduled'}
                    onDragStart={(e) => handleDragStart(e, post)}
                    onClick={() => {
                        setSelectedPost(post);
                        setShowPostDetails(true);
                    }}
                    className={`
                        group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer
                        bg-${platformColor}-500/20 hover:bg-${platformColor}-500/30
                        border border-${platformColor}-500/30 hover:border-${platformColor}-500/50
                        transition-all
                        ${post.status === 'scheduled' ? 'cursor-grab active:cursor-grabbing' : ''}
                        ${draggedPost?.id === post.id ? 'opacity-50' : ''}
                    `}
                >
                    <span className={`text-${platformColor}-400`}>
                        {getPlatformIcon(post.platform)}
                    </span>
                    <span className="truncate flex-1 text-white/80">{post.title}</span>
                    <span className={`text-${statusColor}-400`}>
                        {getStatusIcon(post.status)}
                    </span>
                </div>
            );
        }

        return (
            <div
                key={post.id}
                draggable={post.status === 'scheduled'}
                onDragStart={(e) => handleDragStart(e, post)}
                onClick={() => {
                    setSelectedPost(post);
                    setShowPostDetails(true);
                }}
                className={`
                    group p-3 rounded-xl cursor-pointer
                    bg-slate-800/50 hover:bg-slate-800
                    border border-white/5 hover:border-${platformColor}-500/30
                    transition-all
                    ${post.status === 'scheduled' ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${draggedPost?.id === post.id ? 'opacity-50' : ''}
                `}
            >
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${platformColor}-500/20`}>
                        <span className={`text-${platformColor}-400`}>
                            {getPlatformIcon(post.platform)}
                        </span>
                        <span className={`text-xs text-${platformColor}-300`}>
                            {getPlatformName(post.platform)}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-${statusColor}-500/20`}>
                        <span className={`text-${statusColor}-400`}>
                            {getStatusIcon(post.status)}
                        </span>
                        <span className={`text-xs text-${statusColor}-300 capitalize`}>
                            {post.status}
                        </span>
                    </div>
                </div>

                <h4 className="font-medium text-white mb-1 line-clamp-1">{post.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{post.content}</p>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        {new Date(post.scheduledAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </span>
                    {post.images.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-500">
                            <Image className="w-3 h-3" />
                            <span className="text-xs">{post.images.length}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render calendar cell
    const renderCalendarCell = (day: CalendarDay) => {
        const dateKey = day.date.toISOString().split('T')[0];
        const isDropTarget = dragOverDate === dateKey;
        const dayPosts = day.posts.slice(0, 3);
        const remainingCount = day.posts.length - 3;

        return (
            <div
                key={dateKey}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day.date)}
                className={`
                    min-h-[120px] p-2 border-r border-b border-white/5
                    ${!day.isCurrentMonth ? 'bg-slate-900/30' : 'bg-slate-900/50'}
                    ${day.isToday ? 'bg-violet-500/10 border-violet-500/20' : ''}
                    ${isDropTarget ? 'bg-violet-500/20 border-violet-500/50' : ''}
                    transition-colors
                `}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className={`
                        text-sm font-medium
                        ${day.isToday ? 'w-7 h-7 flex items-center justify-center rounded-full bg-violet-500 text-white' : ''}
                        ${!day.isCurrentMonth ? 'text-slate-600' : 'text-slate-300'}
                    `}>
                        {day.date.getDate()}
                    </span>
                    {day.posts.length > 0 && (
                        <span className="text-xs text-slate-500">{day.posts.length}</span>
                    )}
                </div>

                <div className="space-y-1">
                    {dayPosts.map(post => renderPostCard(post, true))}
                    {remainingCount > 0 && (
                        <button className="w-full text-xs text-slate-400 hover:text-white py-1 transition-colors">
                            +{remainingCount} more
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Render week view
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];

            days.push({
                date,
                posts: postsByDate.get(dateKey) || [],
                isCurrentMonth: true,
                isToday: date.getTime() === today.getTime()
            });
        }

        return (
            <div className="grid grid-cols-7 gap-4">
                {days.map(day => {
                    const dateKey = day.date.toISOString().split('T')[0];
                    const isDropTarget = dragOverDate === dateKey;

                    return (
                        <div
                            key={dateKey}
                            onDragOver={(e) => handleDragOver(e, dateKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day.date)}
                            className={`
                                min-h-[400px] p-3 rounded-xl
                                bg-slate-900/50 border border-white/5
                                ${day.isToday ? 'border-violet-500/30 bg-violet-500/5' : ''}
                                ${isDropTarget ? 'border-violet-500 bg-violet-500/10' : ''}
                                transition-colors
                            `}
                        >
                            <div className="text-center mb-3 pb-3 border-b border-white/5">
                                <div className="text-xs text-slate-500 uppercase">
                                    {WEEKDAYS[day.date.getDay()]}
                                </div>
                                <div className={`
                                    text-2xl font-bold
                                    ${day.isToday ? 'text-violet-400' : 'text-white'}
                                `}>
                                    {day.date.getDate()}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {day.posts.map(post => renderPostCard(post))}
                                {day.posts.length === 0 && (
                                    <div className="text-center text-slate-600 text-sm py-8">
                                        No posts scheduled
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render day view with time slots
    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayPosts = filteredPosts.filter(post => {
            const postDate = new Date(post.scheduledAt);
            return (
                postDate.getFullYear() === currentDate.getFullYear() &&
                postDate.getMonth() === currentDate.getMonth() &&
                postDate.getDate() === currentDate.getDate()
            );
        });

        // Group posts by hour
        const postsByHour = new Map<number, CalendarPost[]>();
        dayPosts.forEach(post => {
            const hour = new Date(post.scheduledAt).getHours();
            const existing = postsByHour.get(hour) || [];
            postsByHour.set(hour, [...existing, post]);
        });

        return (
            <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
                <div className="text-center p-4 border-b border-white/5">
                    <div className="text-sm text-slate-500">
                        {WEEKDAYS[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {dayPosts.length} posts scheduled
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                    {hours.map(hour => {
                        const hourPosts = postsByHour.get(hour) || [];
                        const timeLabel = new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            hour12: true
                        });

                        return (
                            <div
                                key={hour}
                                className="flex border-b border-white/5 last:border-0"
                            >
                                <div className="w-20 flex-shrink-0 p-3 text-right text-sm text-slate-500 border-r border-white/5">
                                    {timeLabel}
                                </div>
                                <div className="flex-1 p-2 min-h-[60px]">
                                    <div className="space-y-2">
                                        {hourPosts.map(post => renderPostCard(post))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                            <CalendarIcon className="w-6 h-6 text-violet-400" />
                        </div>
                        Content Calendar
                    </h1>
                    <p className="text-slate-400 mt-1">Schedule and manage your social media posts</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                            ${showFilters
                                ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }
                        `}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>

                    <button
                        onClick={() => loadPosts(true)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                        title="Refresh calendar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <CalendarDays className="w-4 h-4" />
                            Total Posts
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                            <Clock className="w-4 h-4" />
                            Scheduled
                        </div>
                        <div className="text-2xl font-bold text-amber-300">{stats.scheduled}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Posted
                        </div>
                        <div className="text-2xl font-bold text-emerald-300">{stats.posted}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                            <AlertCircle className="w-4 h-4" />
                            Failed
                        </div>
                        <div className="text-2xl font-bold text-red-300">{stats.failed}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Platform:</span>
                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value as SocialPlatform | 'all')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm"
                        >
                            <option value="all">All Platforms</option>
                            {ALL_PLATFORMS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as CalendarPostStatus | 'all')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="posting">Posting</option>
                            <option value="posted">Posted</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {(platformFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setPlatformFilter('all');
                                setStatusFilter('all');
                            }}
                            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                <div className="flex items-center gap-2">
                    <button
                        onClick={navigatePrevious}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={navigateNext}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition-colors"
                    >
                        Today
                    </button>
                </div>

                <h2 className="text-xl font-bold text-white">
                    {viewMode === 'day'
                        ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
                        : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    }
                </h2>

                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            viewMode === 'month'
                                ? 'bg-violet-500 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            viewMode === 'week'
                                ? 'bg-violet-500 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            viewMode === 'day'
                                ? 'bg-violet-500 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Day
                    </button>
                </div>
            </div>

            {/* Calendar Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={loadPosts}
                        className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : viewMode === 'month' ? (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 bg-slate-900/70">
                        {WEEKDAYS.map(day => (
                            <div
                                key={day}
                                className="p-3 text-center text-sm font-medium text-slate-400 border-r border-b border-white/5 last:border-r-0"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.flat().map(day => renderCalendarCell(day))}
                    </div>
                </div>
            ) : viewMode === 'week' ? (
                renderWeekView()
            ) : (
                renderDayView()
            )}

            {/* Post Details Modal */}
            {showPostDetails && selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => {
                            setShowPostDetails(false);
                            setSelectedPost(null);
                        }}
                    />
                    <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-${getPlatformColor(selectedPost.platform)}-500/20`}>
                                        {getPlatformIcon(selectedPost.platform)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{selectedPost.title}</h3>
                                        <p className="text-sm text-slate-400">
                                            {getPlatformName(selectedPost.platform)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowPostDetails(false);
                                        setSelectedPost(null);
                                    }}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Status badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${getStatusColor(selectedPost.status)}-500/20 mb-4`}>
                                {getStatusIcon(selectedPost.status)}
                                <span className={`text-sm text-${getStatusColor(selectedPost.status)}-300 capitalize`}>
                                    {selectedPost.status}
                                </span>
                            </div>

                            {/* Error message */}
                            {selectedPost.errorMessage && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                                    <p className="text-sm text-red-400">{selectedPost.errorMessage}</p>
                                </div>
                            )}

                            {/* Scheduled time */}
                            <div className="flex items-center gap-2 text-slate-400 mb-4">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                    {formatScheduledDateTime(selectedPost.scheduledAt)}
                                </span>
                                <span className="text-xs text-slate-500">
                                    ({getTimeUntilPost(selectedPost.scheduledAt)})
                                </span>
                            </div>

                            {/* Content */}
                            <div className="p-4 rounded-xl bg-slate-800/50 mb-4">
                                <p className="text-white whitespace-pre-wrap">{selectedPost.content}</p>
                            </div>

                            {/* Images */}
                            {selectedPost.images.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm text-slate-400 mb-2">Attached Images ({selectedPost.images.length})</p>
                                    <div className="flex gap-2 overflow-x-auto">
                                        {selectedPost.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Image ${idx + 1}`}
                                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Post URL */}
                            {selectedPost.postUrl && (
                                <a
                                    href={selectedPost.postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm mb-4 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on {getPlatformName(selectedPost.platform)}
                                </a>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                {selectedPost.status === 'scheduled' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const date = new Date(selectedPost.scheduledAt);
                                                setRescheduleDate(date.toISOString().split('T')[0]);
                                                setRescheduleTime(date.toTimeString().slice(0, 5));
                                                setShowRescheduleModal(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                                        >
                                            <Clock className="w-4 h-4" />
                                            Reschedule
                                        </button>
                                        <button
                                            onClick={() => handleDeletePost(selectedPost)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}

                                {selectedPost.status === 'failed' && (
                                    <>
                                        <button
                                            onClick={() => handleRetryPost(selectedPost)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Retry Post
                                        </button>
                                        <button
                                            onClick={() => handleDeletePost(selectedPost)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}

                                {selectedPost.status === 'posted' && (
                                    <button
                                        onClick={() => handleDeletePost(selectedPost)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove from Calendar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowRescheduleModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Reschedule Post</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Time</label>
                                <input
                                    type="time"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowRescheduleModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReschedule}
                                disabled={!rescheduleDate || !rescheduleTime}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                            >
                                Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentCalendar;
