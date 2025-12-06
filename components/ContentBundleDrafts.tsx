/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { ContentBundleDraft, SocialPost } from '../types';
import { fetchContentBundleDrafts, deleteContentBundleDraft } from '../services/postsService';
import {
    FileText, Clock, Search, Filter, Trash2, Download, Eye, Copy, Check,
    Loader2, AlertCircle, FolderOpen, Image as ImageIcon, Share2, Globe,
    ExternalLink, BookOpen, FileArchive, Linkedin, Twitter, Instagram,
    Facebook, Cloud, AtSign, MessageSquare, X, ChevronDown
} from 'lucide-react';
import ImageViewer from './ImageViewer';

interface ContentBundleDraftsProps {
    onLoadDraft?: (draft: ContentBundleDraft) => void;
    onRefresh?: () => void;
}

// Platform icon mapping
const PLATFORM_ICONS: Record<string, React.ElementType> = {
    'LinkedIn': Linkedin,
    'Twitter': Twitter,
    'X / Twitter': Twitter,
    'Instagram': Instagram,
    'Facebook': Facebook,
    'BlueSky': Cloud,
    'Threads': AtSign,
    'Reddit': MessageSquare
};

const ContentBundleDrafts: React.FC<ContentBundleDraftsProps> = ({ onLoadDraft, onRefresh }) => {
    const [drafts, setDrafts] = useState<ContentBundleDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDraft, setSelectedDraft] = useState<ContentBundleDraft | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchContentBundleDrafts();
            setDrafts(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load drafts');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteContentBundleDraft(id);
            setDrafts(prev => prev.filter(d => d.id !== id));
            setDeleteConfirm(null);
            if (selectedDraft?.id === id) {
                setSelectedDraft(null);
                setShowPreview(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete draft');
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const downloadBundle = async (draft: ContentBundleDraft) => {
        setIsDownloading(draft.id);
        try {
            const zip = new JSZip();
            const timestamp = Date.now();
            const bundleName = draft.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            // Add infographic image
            if (draft.imageData) {
                const imageBytes = Uint8Array.from(atob(draft.imageData), c => c.charCodeAt(0));
                zip.file(`${bundleName}_infographic.png`, imageBytes);
            }

            // Add individual platform captions
            const captionsFolder = zip.folder('captions');
            draft.socialPosts.forEach(post => {
                const filename = `${post.platform.toLowerCase().replace(/[^a-z0-9]/g, '_')}_caption.txt`;
                captionsFolder?.file(filename, post.content);
            });

            // Add all captions combined
            let allCaptions = `Content Bundle - All Social Media Captions\n`;
            allCaptions += `Title: ${draft.title}\n`;
            allCaptions += `Generated: ${new Date(draft.createdAt).toLocaleString()}\n`;
            allCaptions += `Source: ${draft.sourceInput}\n`;
            allCaptions += `Style: ${draft.style}\n`;
            allCaptions += `Platforms: ${draft.platforms.join(', ')}\n`;
            allCaptions += `${'='.repeat(50)}\n\n`;

            draft.socialPosts.forEach(post => {
                allCaptions += `[${post.platform}]\n`;
                allCaptions += `${'-'.repeat(30)}\n`;
                allCaptions += `${post.content}\n\n`;
            });

            if (draft.citations.length > 0) {
                allCaptions += `\n${'='.repeat(50)}\n`;
                allCaptions += `SOURCES:\n`;
                draft.citations.forEach((cite, idx) => {
                    allCaptions += `${idx + 1}. ${cite.title || cite.uri}\n   ${cite.uri}\n`;
                });
            }
            zip.file('all_captions.txt', allCaptions);

            // Add sources/citations as JSON
            if (draft.citations.length > 0) {
                zip.file('sources.json', JSON.stringify(draft.citations, null, 2));
            }

            // Add bundle metadata
            const metadata = {
                id: draft.id,
                title: draft.title,
                createdAt: draft.createdAt,
                updatedAt: draft.updatedAt,
                source: draft.sourceInput,
                inputMode: draft.inputMode,
                style: draft.style,
                platforms: draft.platforms,
                language: draft.language,
                postsCount: draft.socialPosts.length,
                citationsCount: draft.citations.length
            };
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));

            // Generate and download ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${bundleName}_bundle_${timestamp}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Failed to create ZIP:', err);
        } finally {
            setIsDownloading(null);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const filteredDrafts = drafts.filter(draft =>
        draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        draft.sourceInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
        draft.style.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {fullScreenImage && (
                <ImageViewer
                    src={fullScreenImage.src}
                    alt={fullScreenImage.alt}
                    onClose={() => setFullScreenImage(null)}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
                            <FolderOpen className="w-6 h-6 text-white" />
                        </div>
                        Content Bundle Drafts
                    </h1>
                    <p className="text-slate-400 mt-1">Manage your saved content bundles</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search drafts..."
                            className="pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-violet-500/50 w-64"
                        />
                    </div>
                    <button
                        onClick={loadDrafts}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                </div>
            ) : filteredDrafts.length === 0 ? (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                    <FolderOpen className="w-12 h-12 text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">
                        {searchQuery ? 'No matching drafts' : 'No saved bundles yet'}
                    </h3>
                    <p className="text-slate-500 max-w-md">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Create a content bundle and save it to drafts to see it here'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDrafts.map((draft) => (
                        <div
                            key={draft.id}
                            className="group rounded-2xl bg-slate-900/50 border border-white/5 hover:border-violet-500/30 transition-all overflow-hidden"
                        >
                            {/* Preview Image */}
                            {draft.imageData && (
                                <div
                                    className="aspect-video relative overflow-hidden bg-slate-950 cursor-pointer"
                                    onClick={() => setFullScreenImage({
                                        src: `data:image/png;base64,${draft.imageData}`,
                                        alt: draft.title
                                    })}
                                >
                                    <img
                                        src={`data:image/png;base64,${draft.imageData}`}
                                        alt={draft.title}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                        {draft.platforms.slice(0, 3).map((platform, idx) => {
                                            const Icon = PLATFORM_ICONS[platform] || Share2;
                                            return (
                                                <div key={idx} className="w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                                                    <Icon className="w-3 h-3 text-white" />
                                                </div>
                                            );
                                        })}
                                        {draft.platforms.length > 3 && (
                                            <span className="text-[10px] text-white/70">+{draft.platforms.length - 3}</span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-2 right-2">
                                        <span className="bg-black/60 backdrop-blur text-violet-400 text-[10px] px-2 py-1 rounded-full border border-violet-500/30">
                                            {draft.socialPosts.length} posts
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-white truncate mb-1">{draft.title}</h3>
                                <p className="text-xs text-slate-500 truncate mb-3">{draft.sourceInput}</p>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                    <Clock className="w-3 h-3" />
                                    <span>{getTimeAgo(draft.updatedAt)}</span>
                                    <span className="mx-1">•</span>
                                    <span className="px-2 py-0.5 bg-white/5 rounded text-slate-400">{draft.style}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedDraft(draft);
                                            setShowPreview(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => downloadBundle(draft)}
                                        disabled={isDownloading === draft.id}
                                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 transition-colors"
                                        title="Download Bundle"
                                    >
                                        {isDownloading === draft.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileArchive className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(draft.id)}
                                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Delete Confirmation */}
                            {deleteConfirm === draft.id && (
                                <div className="p-4 bg-red-500/10 border-t border-red-500/20">
                                    <p className="text-sm text-red-300 mb-3">Delete this bundle?</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDelete(draft.id)}
                                            className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && selectedDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowPreview(false)}
                    />
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/95 backdrop-blur">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedDraft.title}</h2>
                                <p className="text-sm text-slate-500">{selectedDraft.style} • {selectedDraft.language}</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Infographic */}
                            {selectedDraft.imageData && (
                                <div className="rounded-xl overflow-hidden bg-slate-950 border border-white/5">
                                    <img
                                        src={`data:image/png;base64,${selectedDraft.imageData}`}
                                        alt={selectedDraft.title}
                                        className="w-full h-auto cursor-pointer"
                                        onClick={() => setFullScreenImage({
                                            src: `data:image/png;base64,${selectedDraft.imageData}`,
                                            alt: selectedDraft.title
                                        })}
                                    />
                                </div>
                            )}

                            {/* Social Posts */}
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <Share2 className="w-5 h-5 text-violet-400" />
                                    Social Media Posts ({selectedDraft.socialPosts.length})
                                </h3>
                                <div className="space-y-3">
                                    {selectedDraft.socialPosts.map((post, idx) => {
                                        const Icon = PLATFORM_ICONS[post.platform] || MessageSquare;
                                        return (
                                            <div key={idx} className="p-4 rounded-xl bg-slate-950/50 border border-white/5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-4 h-4 text-violet-400" />
                                                        <span className="text-sm font-bold text-white">{post.platform}</span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {post.content.length} chars
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(post.content, idx)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                                                    >
                                                        {copiedIndex === idx ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-emerald-400" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                Copy
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                    {post.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Citations */}
                            {selectedDraft.citations.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        Sources ({selectedDraft.citations.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDraft.citations.map((cite, idx) => (
                                            <a
                                                key={idx}
                                                href={cite.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Globe className="w-3 h-3" />
                                                <span className="truncate max-w-[200px]">{cite.title || cite.uri}</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => downloadBundle(selectedDraft)}
                                    disabled={isDownloading === selectedDraft.id}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-all"
                                >
                                    {isDownloading === selectedDraft.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating ZIP...
                                        </>
                                    ) : (
                                        <>
                                            <FileArchive className="w-4 h-4" />
                                            Download All (ZIP)
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(selectedDraft.id)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentBundleDrafts;
