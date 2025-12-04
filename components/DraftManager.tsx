/**
 * DraftManager Component
 * Displays all saved drafts and allows editing, scheduling, publishing, or deleting them
 */

import React, { useState, useEffect } from 'react';
import {
    FileText, Calendar, Clock, Edit3, Trash2, Send, Search, Filter, RefreshCw,
    AlertCircle, Loader2, Eye, MoreHorizontal, ChevronRight, X, Check,
    CalendarDays, Sparkles
} from 'lucide-react';
import { DraftPost, BlogPostResult } from '../types';
import {
    fetchDrafts, deleteDraft, publishDraftNow, scheduleDraftPost, updateDraft
} from '../services/postsService';

interface DraftManagerProps {
    onEditDraft: (draft: DraftPost) => void;
    onRefresh?: () => void;
}

const DraftManager: React.FC<DraftManagerProps> = ({ onEditDraft, onRefresh }) => {
    const [drafts, setDrafts] = useState<DraftPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDraft, setSelectedDraft] = useState<DraftPost | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewDraft, setPreviewDraft] = useState<DraftPost | null>(null);

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDrafts();
            setDrafts(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load drafts');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (draft: DraftPost) => {
        if (!confirm(`Are you sure you want to delete "${draft.title}"?`)) return;

        setActionLoading(draft.id);
        try {
            await deleteDraft(draft.id);
            setDrafts(prev => prev.filter(d => d.id !== draft.id));
        } catch (err: any) {
            setError(err.message || 'Failed to delete draft');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePublishNow = async (draft: DraftPost) => {
        if (!confirm(`Publish "${draft.title}" now?`)) return;

        setActionLoading(draft.id);
        try {
            await publishDraftNow(draft.id);
            setDrafts(prev => prev.filter(d => d.id !== draft.id));
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || 'Failed to publish draft');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSchedule = async () => {
        if (!selectedDraft || !scheduleDate || !scheduleTime) return;

        const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}`);
        if (scheduledDate <= new Date()) {
            setError('Scheduled time must be in the future');
            return;
        }

        setActionLoading(selectedDraft.id);
        try {
            await scheduleDraftPost(selectedDraft.id, scheduledDate);
            setDrafts(prev => prev.filter(d => d.id !== selectedDraft.id));
            setShowScheduleModal(false);
            setSelectedDraft(null);
            setScheduleDate('');
            setScheduleTime('');
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || 'Failed to schedule draft');
        } finally {
            setActionLoading(null);
        }
    };

    const openScheduleModal = (draft: DraftPost) => {
        setSelectedDraft(draft);
        // Default to tomorrow at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setScheduleDate(tomorrow.toISOString().split('T')[0]);
        setScheduleTime('09:00');
        setShowScheduleModal(true);
    };

    const openPreview = (draft: DraftPost) => {
        setPreviewDraft(draft);
        setShowPreview(true);
    };

    const filteredDrafts = drafts.filter(draft =>
        draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        draft.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        Draft Posts
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved
                    </p>
                </div>
                <button
                    onClick={loadDrafts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search drafts..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                />
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
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredDrafts.length === 0 && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Drafts Found</h3>
                    <p className="text-slate-500 max-w-md">
                        {searchQuery
                            ? 'No drafts match your search. Try a different query.'
                            : 'Create your first draft in the Blog Remix tool and save it here.'}
                    </p>
                </div>
            )}

            {/* Drafts Grid */}
            {!loading && filteredDrafts.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDrafts.map(draft => (
                        <div
                            key={draft.id}
                            className="group p-5 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-violet-500/30 transition-all"
                        >
                            {/* Title & Preview */}
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">
                                    {draft.title}
                                </h3>
                                {draft.subtitle && (
                                    <p className="text-sm text-slate-400 line-clamp-2">{draft.subtitle}</p>
                                )}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {getTimeAgo(draft.updatedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    {draft.content.split(' ').length} words
                                </span>
                            </div>

                            {/* Content Preview */}
                            <p className="text-sm text-slate-400 line-clamp-3 mb-4">
                                {draft.content.replace(/[#\[\]\*]/g, '').substring(0, 200)}...
                            </p>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => openPreview(draft)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 text-sm transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Preview
                                </button>
                                <button
                                    onClick={() => onEditDraft(draft)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 text-sm transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => openScheduleModal(draft)}
                                    disabled={actionLoading === draft.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-500/20 hover:bg-violet-500/30 rounded-lg text-violet-300 text-sm transition-colors"
                                >
                                    {actionLoading === draft.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CalendarDays className="w-4 h-4" />
                                    )}
                                    Schedule
                                </button>
                                <div className="relative group/menu">
                                    <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-40 p-1 rounded-xl bg-slate-800 border border-white/10 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                                        <button
                                            onClick={() => handlePublishNow(draft)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg"
                                        >
                                            <Send className="w-4 h-4" />
                                            Publish Now
                                        </button>
                                        <button
                                            onClick={() => handleDelete(draft)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && selectedDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
                    <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-violet-400" />
                            Schedule Post
                        </h3>

                        <p className="text-slate-400 text-sm mb-6">
                            Choose when you want "<span className="text-white">{selectedDraft.title}</span>" to be published.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-violet-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Time</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-violet-500/50"
                                />
                            </div>
                        </div>

                        {scheduleDate && scheduleTime && (
                            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
                                <p className="text-sm text-violet-300 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Will publish on {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSchedule}
                                disabled={!scheduleDate || !scheduleTime || actionLoading === selectedDraft.id}
                                className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 rounded-xl text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === selectedDraft.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewDraft && (
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
                            <div className="px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs font-mono inline-block mb-4">
                                DRAFT PREVIEW
                            </div>

                            <h1 className="text-3xl font-bold text-white mb-4">{previewDraft.title}</h1>
                            {previewDraft.subtitle && (
                                <p className="text-xl text-slate-400 mb-6 italic">{previewDraft.subtitle}</p>
                            )}
                            <div className="text-sm text-violet-400 font-mono mb-8">{previewDraft.metadata}</div>

                            <div className="prose prose-invert max-w-none text-slate-300">
                                {previewDraft.content.split('\n').map((line, i) => {
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

export default DraftManager;
