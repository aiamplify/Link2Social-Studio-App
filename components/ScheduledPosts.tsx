/**
 * ScheduledPosts Component
 * Displays all scheduled posts with countdown timers and management options
 */

import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, Send, Edit3, Trash2, RefreshCw, AlertCircle, Loader2,
    Eye, MoreHorizontal, X, Check, CalendarDays, FileText, ArrowLeft,
    Timer, ChevronRight, Sparkles, Bell
} from 'lucide-react';
import { ScheduledPost } from '../types';
import {
    fetchScheduledPosts, deleteScheduledPost, publishScheduledNow,
    moveScheduledToDraft, reschedulePost, getRelativeTime, formatScheduledDate
} from '../services/postsService';

interface ScheduledPostsProps {
    onEditPost: (post: ScheduledPost) => void;
    onRefresh?: () => void;
}

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ onEditPost, onRefresh }) => {
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);

    // Update relative times every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchScheduledPosts();
            setPosts(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load scheduled posts');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (post: ScheduledPost) => {
        if (!confirm(`Are you sure you want to delete "${post.title}"?`)) return;

        setActionLoading(post.id);
        try {
            await deleteScheduledPost(post.id);
            setPosts(prev => prev.filter(p => p.id !== post.id));
        } catch (err: any) {
            setError(err.message || 'Failed to delete scheduled post');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePublishNow = async (post: ScheduledPost) => {
        if (!confirm(`Publish "${post.title}" now instead of waiting?`)) return;

        setActionLoading(post.id);
        try {
            await publishScheduledNow(post.id);
            setPosts(prev => prev.filter(p => p.id !== post.id));
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || 'Failed to publish post');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMoveToDraft = async (post: ScheduledPost) => {
        if (!confirm(`Move "${post.title}" back to drafts?`)) return;

        setActionLoading(post.id);
        try {
            await moveScheduledToDraft(post.id);
            setPosts(prev => prev.filter(p => p.id !== post.id));
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || 'Failed to move to drafts');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReschedule = async () => {
        if (!selectedPost || !rescheduleDate || !rescheduleTime) return;

        const newDate = new Date(`${rescheduleDate}T${rescheduleTime}`);
        if (newDate <= new Date()) {
            setError('Scheduled time must be in the future');
            return;
        }

        setActionLoading(selectedPost.id);
        try {
            const updated = await reschedulePost(selectedPost.id, newDate);
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? updated : p));
            setShowRescheduleModal(false);
            setSelectedPost(null);
            setRescheduleDate('');
            setRescheduleTime('');
        } catch (err: any) {
            setError(err.message || 'Failed to reschedule post');
        } finally {
            setActionLoading(null);
        }
    };

    const openRescheduleModal = (post: ScheduledPost) => {
        setSelectedPost(post);
        const existingDate = new Date(post.scheduledDate);
        setRescheduleDate(existingDate.toISOString().split('T')[0]);
        setRescheduleTime(existingDate.toTimeString().slice(0, 5));
        setShowRescheduleModal(true);
    };

    const openPreview = (post: ScheduledPost) => {
        setPreviewPost(post);
        setShowPreview(true);
    };

    const isPostDue = (scheduledDate: string) => new Date(scheduledDate) <= new Date();
    const isPostSoon = (scheduledDate: string) => {
        const diff = new Date(scheduledDate).getTime() - new Date().getTime();
        return diff > 0 && diff < 3600000; // Within 1 hour
    };

    // Sort by scheduled date
    const sortedPosts = [...posts].sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        Scheduled Posts
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {posts.length} post{posts.length !== 1 ? 's' : ''} scheduled for publishing
                    </p>
                </div>
                <button
                    onClick={loadPosts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                    Scheduled posts are automatically published at their scheduled time. The system checks every 5 minutes.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && posts.length === 0 && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Scheduled Posts</h3>
                    <p className="text-slate-500 max-w-md">
                        Schedule posts from your drafts to have them automatically published at a specific time.
                    </p>
                </div>
            )}

            {/* Posts Timeline */}
            {!loading && sortedPosts.length > 0 && (
                <div className="space-y-4">
                    {sortedPosts.map((post, index) => {
                        const isDue = isPostDue(post.scheduledDate);
                        const isSoon = isPostSoon(post.scheduledDate);
                        const scheduledDate = new Date(post.scheduledDate);

                        return (
                            <div
                                key={post.id}
                                className={`relative p-5 rounded-2xl border transition-all ${
                                    isDue
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : isSoon
                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                        : 'bg-slate-900/50 border-white/5 hover:border-emerald-500/30'
                                }`}
                            >
                                {/* Timeline Connector */}
                                {index < sortedPosts.length - 1 && (
                                    <div className="absolute left-8 top-full w-0.5 h-4 bg-white/10" />
                                )}

                                <div className="flex items-start gap-4">
                                    {/* Date Badge */}
                                    <div className={`flex-shrink-0 p-3 rounded-xl text-center ${
                                        isDue
                                            ? 'bg-amber-500/20'
                                            : isSoon
                                            ? 'bg-emerald-500/20'
                                            : 'bg-slate-800'
                                    }`}>
                                        <div className={`text-2xl font-bold ${
                                            isDue ? 'text-amber-400' : isSoon ? 'text-emerald-400' : 'text-white'
                                        }`}>
                                            {scheduledDate.getDate()}
                                        </div>
                                        <div className="text-xs text-slate-400 uppercase">
                                            {scheduledDate.toLocaleDateString('en-US', { month: 'short' })}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-white line-clamp-1">
                                                    {post.title}
                                                </h3>
                                                {post.subtitle && (
                                                    <p className="text-sm text-slate-400 line-clamp-1">{post.subtitle}</p>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            {isDue ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                                                    <Timer className="w-3 h-3" />
                                                    Publishing soon...
                                                </div>
                                            ) : isSoon ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
                                                    <Sparkles className="w-3 h-3" />
                                                    Within 1 hour
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Time Info */}
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {scheduledDate.toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Timer className="w-4 h-4" />
                                                {isDue ? 'Due now' : getRelativeTime(post.scheduledDate)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <FileText className="w-4 h-4" />
                                                {post.content.split(' ').length} words
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openPreview(post)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 text-sm transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => openRescheduleModal(post)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 text-sm transition-colors"
                                            >
                                                <CalendarDays className="w-4 h-4" />
                                                Reschedule
                                            </button>
                                            <button
                                                onClick={() => handlePublishNow(post)}
                                                disabled={actionLoading === post.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 text-sm transition-colors"
                                            >
                                                {actionLoading === post.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                Publish Now
                                            </button>
                                            <div className="relative group/menu ml-auto">
                                                <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 w-44 p-1 rounded-xl bg-slate-800 border border-white/10 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                                                    <button
                                                        onClick={() => onEditPost(post)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        Edit Post
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveToDraft(post)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg"
                                                    >
                                                        <ArrowLeft className="w-4 h-4" />
                                                        Move to Drafts
                                                    </button>
                                                    <hr className="my-1 border-white/10" />
                                                    <button
                                                        onClick={() => handleDelete(post)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)} />
                    <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-emerald-400" />
                            Reschedule Post
                        </h3>

                        <p className="text-slate-400 text-sm mb-6">
                            Change the publish date for "<span className="text-white">{selectedPost.title}</span>"
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Time</label>
                                <input
                                    type="time"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50"
                                />
                            </div>
                        </div>

                        {rescheduleDate && rescheduleTime && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                <p className="text-sm text-emerald-300 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Will publish on {new Date(`${rescheduleDate}T${rescheduleTime}`).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRescheduleModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReschedule}
                                disabled={!rescheduleDate || !rescheduleTime || actionLoading === selectedPost.id}
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === selectedPost.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Update Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
                    <div className="relative w-full max-w-4xl my-8 p-8 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg text-slate-400"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono">
                                    SCHEDULED
                                </div>
                                <div className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">
                                    {formatScheduledDate(new Date(previewPost.scheduledDate))}
                                </div>
                            </div>

                            <h1 className="text-3xl font-bold text-white mb-4">{previewPost.title}</h1>
                            {previewPost.subtitle && (
                                <p className="text-xl text-slate-400 mb-6 italic">{previewPost.subtitle}</p>
                            )}
                            <div className="text-sm text-emerald-400 font-mono mb-8">{previewPost.metadata}</div>

                            <div className="prose prose-invert max-w-none text-slate-300">
                                {previewPost.content.split('\n').map((line, i) => {
                                    if (!line.trim()) return <br key={i} />;
                                    if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-white">{line.replace('## ', '')}</h2>;
                                    if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-200">{line.replace('### ', '')}</h3>;
                                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-2">{line.replace('- ', '')}</li>;
                                    if (line.match(/\[\[IMAGE_\d+\]\]/)) return (
                                        <div key={i} className="my-6 p-4 rounded-xl bg-slate-800/50 border border-white/5 text-center text-slate-500 text-sm">
                                            [Image placeholder]
                                        </div>
                                    );
                                    return <p key={i} className="mb-4">{line}</p>;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduledPosts;
