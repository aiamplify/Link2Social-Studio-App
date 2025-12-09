/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { generateArticleInfographic } from '../services/geminiService';
import { saveContentBundleDraft } from '../services/postsService';
import { postToTwitter, postToLinkedIn, postToInstagram, PostResult } from '../services/socialMediaService';
import { exportToGoogleSheets, GoogleSheetsExportResult } from '../services/googleSheetsService';
import { Citation, ArticleHistoryItem, SocialPost, ContentBundleResult } from '../types';
import {
    Link, Loader2, Download, Sparkles, AlertCircle, Palette, Globe, ExternalLink, BookOpen, Clock,
    Maximize, Copy, Check, Linkedin, Twitter, Instagram, Share2, MessageSquare,
    Type, AlignLeft, Zap, Settings, Sliders, Grid3X3, LayoutTemplate, Wand2, RefreshCw, Save,
    FolderOpen, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Lock, Unlock, Layers,
    Image as ImageIcon, FileText, Hash, TrendingUp, Target, Users, Calendar, Send, Archive,
    Bookmark, Star, Heart, MoreHorizontal, Filter, SortAsc, Search, X, Upload, Paintbrush,
    Ratio, Monitor, Smartphone, Tablet, PanelLeft, BarChart3, PieChart, Activity, FileArchive,
    Sheet
} from 'lucide-react';
import { LoadingState } from './LoadingState';
import ImageViewer from './ImageViewer';
import SchedulePostModal from './SchedulePostModal';
import { SocialPlatform } from '../types';

interface ArticleToInfographicProps {
    history: ArticleHistoryItem[];
    onAddToHistory: (item: ArticleHistoryItem) => void;
}

// Enhanced Style Presets with previews
const STYLE_PRESETS = [
    { id: 'modern', name: "Modern Editorial", description: "Clean, professional magazine style", colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'] },
    { id: 'playful', name: "Fun & Playful", description: "Vibrant colors, rounded shapes", colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'] },
    { id: 'minimal', name: "Clean Minimalist", description: "Lots of whitespace, elegant", colors: ['#ffffff', '#f8f9fa', '#e9ecef', '#212529'] },
    { id: 'dark', name: "Dark Mode Tech", description: "Dark background, neon accents", colors: ['#0a0a0a', '#1a1a2e', '#00ff88', '#00d4ff'] },
    { id: 'corporate', name: "Corporate Professional", description: "Business-ready, trustworthy", colors: ['#1e3a5f', '#3d5a80', '#98c1d9', '#e0fbfc'] },
    { id: 'gradient', name: "Gradient Flow", description: "Smooth color transitions", colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'] },
    { id: 'retro', name: "Retro Vintage", description: "Nostalgic, warm tones", colors: ['#d4a373', '#faedcd', '#e9edc9', '#ccd5ae'] },
    { id: 'custom', name: "Custom Style", description: "Define your own style", colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'] },
];

// Platform configurations - Twitter, LinkedIn, Instagram only
const PLATFORMS = [
    { id: 'Twitter', label: 'X / Twitter', icon: Twitter, charLimit: 280, hashtagLimit: 3, bestTime: '12pm-3pm' },
    { id: 'LinkedIn', label: 'LinkedIn', icon: Linkedin, charLimit: 3000, hashtagLimit: 5, bestTime: '9am-12pm' },
    { id: 'Instagram', label: 'Instagram', icon: Instagram, charLimit: 2200, hashtagLimit: 30, bestTime: '11am-1pm' },
];

const LANGUAGES = [
    { label: "English (US)", value: "English", flag: "🇺🇸" },
    { label: "Arabic (Egypt)", value: "Arabic", flag: "🇪🇬" },
    { label: "German (Germany)", value: "German", flag: "🇩🇪" },
    { label: "Spanish (Mexico)", value: "Spanish", flag: "🇲🇽" },
    { label: "French (France)", value: "French", flag: "🇫🇷" },
    { label: "Hindi (India)", value: "Hindi", flag: "🇮🇳" },
    { label: "Indonesian", value: "Indonesian", flag: "🇮🇩" },
    { label: "Italian (Italy)", value: "Italian", flag: "🇮🇹" },
    { label: "Japanese (Japan)", value: "Japanese", flag: "🇯🇵" },
    { label: "Korean (South Korea)", value: "Korean", flag: "🇰🇷" },
    { label: "Portuguese (Brazil)", value: "Portuguese", flag: "🇧🇷" },
    { label: "Russian (Russia)", value: "Russian", flag: "🇷🇺" },
    { label: "Ukrainian", value: "Ukrainian", flag: "🇺🇦" },
    { label: "Vietnamese", value: "Vietnamese", flag: "🇻🇳" },
    { label: "Chinese (China)", value: "Chinese", flag: "🇨🇳" },
];

// Output format options
const OUTPUT_FORMATS = [
    { id: 'square', label: 'Square (1:1)', ratio: '1:1', icon: Grid3X3, platforms: ['Instagram', 'Facebook'] },
    { id: 'portrait', label: 'Portrait (4:5)', ratio: '4:5', icon: Smartphone, platforms: ['Instagram', 'Pinterest'] },
    { id: 'landscape', label: 'Landscape (16:9)', ratio: '16:9', icon: Monitor, platforms: ['LinkedIn', 'Twitter', 'YouTube'] },
    { id: 'story', label: 'Story (9:16)', ratio: '9:16', icon: Smartphone, platforms: ['Instagram', 'TikTok', 'Snapchat'] },
];

// Tone options for content
const TONE_OPTIONS = [
    { id: 'professional', label: 'Professional', icon: Target },
    { id: 'casual', label: 'Casual & Friendly', icon: Heart },
    { id: 'educational', label: 'Educational', icon: BookOpen },
    { id: 'persuasive', label: 'Persuasive', icon: TrendingUp },
    { id: 'humorous', label: 'Humorous', icon: Sparkles },
    { id: 'inspirational', label: 'Inspirational', icon: Star },
];

const ArticleToInfographic: React.FC<ArticleToInfographicProps> = ({ history, onAddToHistory }) => {
    // Input State
    const [inputMode, setInputMode] = useState<'url' | 'prompt' | 'upload'>('url');
    const [inputValue, setInputValue] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    
    // Style Configuration
    const [selectedPreset, setSelectedPreset] = useState(STYLE_PRESETS[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Twitter', 'LinkedIn', 'Instagram']);
    const [outputFormat, setOutputFormat] = useState(OUTPUT_FORMATS[2]); // Default landscape
    const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0]);
    
    // Advanced Options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [includeHashtags, setIncludeHashtags] = useState(true);
    const [includeEmojis, setIncludeEmojis] = useState(true);
    const [includeCTA, setIncludeCTA] = useState(true);
    const [ctaText, setCtaText] = useState('Learn more →');
    const [brandColors, setBrandColors] = useState<string[]>([]);
    const [watermarkText, setWatermarkText] = useState('');
    
    // Generation State
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Results State
    const [imageData, setImageData] = useState<string | null>(null);
    const [citations, setCitations] = useState<Citation[]>([]);
    const [generatedPosts, setGeneratedPosts] = useState<SocialPost[]>([]);
    const [copiedPostIndex, setCopiedPostIndex] = useState<number | null>(null);
    
    // UI State
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'history' | 'templates'>('create');
    const [historyFilter, setHistoryFilter] = useState('');
    const [showStylePicker, setShowStylePicker] = useState(false);

    // Save/Download State
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Posting State
    const [isPosting, setIsPosting] = useState(false);
    const [postingPlatform, setPostingPlatform] = useState<string | null>(null);
    const [postResults, setPostResults] = useState<{platform: string, success: boolean, message: string}[]>([]);

    // Google Sheets Export State
    const [isExportingToSheets, setIsExportingToSheets] = useState(false);
    const [exportingPlatform, setExportingPlatform] = useState<string | null>(null);
    const [sheetsExportResults, setSheetsExportResults] = useState<{platform: string, success: boolean, message: string, driveUrl?: string}[]>([]);

    // Schedule Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        );
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedPostIndex(index);
        setTimeout(() => setCopiedPostIndex(null), 2000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setInputValue(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const addToHistory = (input: string, image: string, cites: Citation[], posts: SocialPost[]) => {
        let title = input;
        if (inputMode === 'url') {
            try { title = new URL(input).hostname; } catch(e) {}
        } else {
            title = input.length > 30 ? input.substring(0, 30) + '...' : input;
        }
        
        const newItem: ArticleHistoryItem = {
            id: Date.now().toString(),
            title: title,
            url: inputMode === 'url' ? input : 'Text Prompt',
            imageData: image,
            citations: cites,
            socialPosts: posts,
            date: new Date()
        };
        onAddToHistory(newItem);
    };

    const loadFromHistory = (item: ArticleHistoryItem) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (item.url === 'Text Prompt') {
            setInputMode('prompt');
            setInputValue(item.title);
        } else {
            setInputMode('url');
            setInputValue(item.url);
        }
        
        setImageData(item.imageData);
        setCitations(item.citations);
        setGeneratedPosts(item.socialPosts || []);
        setActiveTab('create');
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) {
            setError(inputMode === 'url' ? "Please provide a valid URL." : "Please enter a topic or text.");
            return;
        }
        
        setLoading(true);
        setError(null);
        setImageData(null);
        setCitations([]);
        setGeneratedPosts([]);
        setLoadingStage('INITIALIZING...');

        try {
            const styleToUse = selectedPreset.id === 'custom' ? customStyle : selectedPreset.name;
            const { imageData: resultImage, citations: resultCitations, socialPosts: resultPosts } = await generateArticleInfographic(
                inputValue,
                inputMode === 'url' ? 'url' : 'prompt',
                styleToUse, 
                selectedPlatforms,
                (stage) => setLoadingStage(stage), 
                selectedLanguage
            );
            
            if (resultImage) {
                setImageData(resultImage);
                setCitations(resultCitations);
                setGeneratedPosts(resultPosts);
                addToHistory(inputValue, resultImage, resultCitations, resultPosts);
            } else {
                throw new Error("Failed to generate infographic content.");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
            setLoadingStage('');
        }
    };

    const downloadImage = (format: 'png' | 'jpg' | 'webp') => {
        if (!imageData) return;
        const link = document.createElement('a');
        link.href = `data:image/${format};base64,${imageData}`;
        link.download = `infographic-${Date.now()}.${format}`;
        link.click();
    };

    // Download all captions as a text file
    const downloadCaptions = () => {
        if (generatedPosts.length === 0) return;

        let content = `Content Bundle - Social Media Captions\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Source: ${inputValue}\n`;
        content += `${'='.repeat(50)}\n\n`;

        generatedPosts.forEach((post, idx) => {
            content += `[${post.platform}]\n`;
            content += `${'-'.repeat(30)}\n`;
            content += `${post.content}\n\n`;
        });

        if (citations.length > 0) {
            content += `\n${'='.repeat(50)}\n`;
            content += `SOURCES:\n`;
            citations.forEach((cite, idx) => {
                content += `${idx + 1}. ${cite.title || cite.uri}\n   ${cite.uri}\n`;
            });
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `captions-${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // Download everything as a ZIP file
    const downloadBundle = async () => {
        if (!imageData && generatedPosts.length === 0) return;

        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const timestamp = Date.now();
            const bundleName = inputMode === 'url'
                ? (() => { try { return new URL(inputValue).hostname.replace(/\./g, '_'); } catch { return 'bundle'; } })()
                : 'content_bundle';

            // Add infographic image
            if (imageData) {
                const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
                zip.file(`${bundleName}_infographic.png`, imageBytes);
            }

            // Add individual platform captions
            const captionsFolder = zip.folder('captions');
            generatedPosts.forEach(post => {
                const filename = `${post.platform.toLowerCase().replace(/[^a-z0-9]/g, '_')}_caption.txt`;
                captionsFolder?.file(filename, post.content);
            });

            // Add all captions combined
            let allCaptions = `Content Bundle - All Social Media Captions\n`;
            allCaptions += `Generated: ${new Date().toLocaleString()}\n`;
            allCaptions += `Source: ${inputValue}\n`;
            allCaptions += `Style: ${selectedPreset.name}\n`;
            allCaptions += `Platforms: ${selectedPlatforms.join(', ')}\n`;
            allCaptions += `${'='.repeat(50)}\n\n`;

            generatedPosts.forEach(post => {
                allCaptions += `[${post.platform}]\n`;
                allCaptions += `${'-'.repeat(30)}\n`;
                allCaptions += `${post.content}\n\n`;
            });

            if (citations.length > 0) {
                allCaptions += `\n${'='.repeat(50)}\n`;
                allCaptions += `SOURCES:\n`;
                citations.forEach((cite, idx) => {
                    allCaptions += `${idx + 1}. ${cite.title || cite.uri}\n   ${cite.uri}\n`;
                });
            }
            zip.file('all_captions.txt', allCaptions);

            // Add sources/citations as JSON
            if (citations.length > 0) {
                zip.file('sources.json', JSON.stringify(citations, null, 2));
            }

            // Add bundle metadata
            const metadata = {
                generatedAt: new Date().toISOString(),
                source: inputValue,
                inputMode: inputMode,
                style: selectedPreset.name,
                platforms: selectedPlatforms,
                language: selectedLanguage,
                postsCount: generatedPosts.length,
                citationsCount: citations.length
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
            setIsDownloading(false);
        }
    };

    // Save to drafts
    const handleSaveToDrafts = async () => {
        if (!imageData && generatedPosts.length === 0) return;

        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const bundle: ContentBundleResult = {
                imageData,
                citations,
                socialPosts: generatedPosts,
                sourceInput: inputValue,
                inputMode,
                style: selectedPreset.name,
                platforms: selectedPlatforms,
                language: selectedLanguage
            };

            await saveContentBundleDraft(bundle);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save draft');
        } finally {
            setIsSaving(false);
        }
    };

    // Post to individual platform
    const handlePostToPlatform = async (platform: string, content: string) => {
        if (!imageData) return;

        setIsPosting(true);
        setPostingPlatform(platform);

        try {
            // Pass the infographic image
            const images = [imageData];

            let postResult: PostResult;

            switch (platform.toLowerCase()) {
                case 'x / twitter':
                case 'twitter':
                    postResult = await postToTwitter(content, images);
                    break;
                case 'linkedin':
                    postResult = await postToLinkedIn(content, images);
                    break;
                case 'instagram':
                    postResult = await postToInstagram(content, images);
                    break;
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }

            setPostResults(prev => [...prev, {
                platform,
                success: postResult.success,
                message: postResult.message
            }]);
        } catch (err: any) {
            setPostResults(prev => [...prev, {
                platform,
                success: false,
                message: err.message || 'Failed to post'
            }]);
        } finally {
            setIsPosting(false);
            setPostingPlatform(null);
        }
    };

    // Post to all platforms
    const handlePostToAllPlatforms = async () => {
        if (generatedPosts.length === 0) return;

        setPostResults([]); // Clear previous results
        for (const post of generatedPosts) {
            await handlePostToPlatform(post.platform, post.content);
        }
    };

    // Export single post to Google Sheets
    const handleExportToSheets = async (platform: string, content: string) => {
        if (!imageData) return;

        setIsExportingToSheets(true);
        setExportingPlatform(platform);

        try {
            // Extract hashtags from content
            const hashtagMatch = content.match(/#\w+/g);
            const hashtags = hashtagMatch ? hashtagMatch.join(' ') : '';
            const captionWithoutHashtags = content.replace(/#\w+\s*/g, '').trim();

            // Create title from source input
            let title = inputValue;
            if (inputMode === 'url') {
                try { title = new URL(inputValue).hostname; } catch(e) {}
            } else {
                title = inputValue.length > 50 ? inputValue.substring(0, 50) + '...' : inputValue;
            }

            const result = await exportToGoogleSheets({
                title: `${platform} - ${title}`,
                caption: captionWithoutHashtags,
                hashtags,
                platform,
                imageBase64: imageData,
                status: 'Posted',
            });

            setSheetsExportResults(prev => [...prev, {
                platform,
                success: result.success,
                message: result.message,
                driveUrl: result.driveFileUrl,
            }]);
        } catch (err: any) {
            setSheetsExportResults(prev => [...prev, {
                platform,
                success: false,
                message: err.message || 'Failed to export to Google Sheets',
            }]);
        } finally {
            setIsExportingToSheets(false);
            setExportingPlatform(null);
        }
    };

    // Export all posts to Google Sheets
    const handleExportAllToSheets = async () => {
        if (generatedPosts.length === 0 || !imageData) return;

        setSheetsExportResults([]); // Clear previous results
        for (const post of generatedPosts) {
            await handleExportToSheets(post.platform, post.content);
        }
    };

    const filteredHistory = history.filter(item => 
        item.title.toLowerCase().includes(historyFilter.toLowerCase()) ||
        item.url.toLowerCase().includes(historyFilter.toLowerCase())
    );

    return (
        <div className="space-y-8">
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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        Content Bundle Creator
                    </h1>
                    <p className="text-slate-400 mt-1">Generate infographics and social posts from any content</p>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'create' 
                                ? 'bg-emerald-500 text-white' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Create
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'history' 
                                ? 'bg-emerald-500 text-white' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        History ({history.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'templates' 
                                ? 'bg-emerald-500 text-white' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <LayoutTemplate className="w-4 h-4 inline mr-2" />
                        Templates
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {activeTab === 'create' && (
                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Column - Configuration */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Input Section */}
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Link className="w-5 h-5 text-emerald-400" />
                                    Content Source
                                </h3>
                            </div>

                            {/* Input Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl">
                                <button
                                    onClick={() => setInputMode('url')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        inputMode === 'url' 
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                            : 'text-slate-500 hover:text-white'
                                    }`}
                                >
                                    <Link className="w-4 h-4" /> URL
                                </button>
                                <button
                                    onClick={() => setInputMode('prompt')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        inputMode === 'prompt' 
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                            : 'text-slate-500 hover:text-white'
                                    }`}
                                >
                                    <Type className="w-4 h-4" /> Topic
                                </button>
                                <button
                                    onClick={() => setInputMode('upload')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        inputMode === 'upload' 
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                            : 'text-slate-500 hover:text-white'
                                    }`}
                                >
                                    <Upload className="w-4 h-4" /> Upload
                                </button>
                            </div>

                            {/* Input Field */}
                            {inputMode === 'url' && (
                                <input
                                    type="url"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="https://example.com/article"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                />
                            )}
                            
                            {inputMode === 'prompt' && (
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Describe a topic or paste text content..."
                                    className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                                />
                            )}
                            
                            {inputMode === 'upload' && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl bg-slate-950/30 hover:bg-white/5 hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                                >
                                    {uploadedFile ? (
                                        <>
                                            <FileText className="w-8 h-8 text-emerald-400" />
                                            <span className="text-sm text-white font-medium">{uploadedFile.name}</span>
                                            <span className="text-xs text-slate-500">Click to change</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-slate-500" />
                                            <span className="text-sm text-slate-400">Drop file or click to upload</span>
                                            <span className="text-xs text-slate-600">.txt, .md, .doc supported</span>
                                        </>
                                    )}
                                    <input 
                                        ref={fileInputRef} 
                                        type="file" 
                                        accept=".txt,.md,.doc,.docx" 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Style Selection */}
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-emerald-400" />
                                    Visual Style
                                </h3>
                                <button
                                    onClick={() => setShowStylePicker(!showStylePicker)}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                >
                                    {showStylePicker ? 'Hide' : 'Show all'} 
                                    {showStylePicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            </div>

                            {/* Selected Style Preview */}
                            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-1">
                                        {selectedPreset.colors.map((color, i) => (
                                            <div 
                                                key={i} 
                                                className="w-6 h-6 rounded-full border-2 border-slate-900"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{selectedPreset.name}</div>
                                        <div className="text-xs text-slate-500">{selectedPreset.description}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Style Grid */}
                            {showStylePicker && (
                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                                    {STYLE_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setSelectedPreset(preset)}
                                            className={`p-3 rounded-xl text-left transition-all ${
                                                selectedPreset.id === preset.id
                                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                                    : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div className="flex gap-1 mb-2">
                                                {preset.colors.map((color, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="w-4 h-4 rounded-full"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="text-sm text-white font-medium">{preset.name}</div>
                                            <div className="text-[10px] text-slate-500">{preset.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedPreset.id === 'custom' && (
                                <input
                                    type="text"
                                    value={customStyle}
                                    onChange={(e) => setCustomStyle(e.target.value)}
                                    placeholder="Describe your custom style..."
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50"
                                />
                            )}
                        </div>

                        {/* Platform Selection */}
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-emerald-400" />
                                Target Platforms
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-2">
                                {PLATFORMS.map(p => {
                                    const Icon = p.icon;
                                    const isSelected = selectedPlatforms.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id)}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all border ${
                                                isSelected 
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                                                    : 'bg-slate-950/50 border-white/5 text-slate-500 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'bg-emerald-500/20' : 'bg-transparent'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                                            </div>
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Language & Format */}
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                Language & Format
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 mb-2 block">Output Language</label>
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.value} value={lang.value}>
                                                {lang.flag} {lang.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-xs text-slate-500 mb-2 block">Content Tone</label>
                                    <select
                                        value={selectedTone.id}
                                        onChange={(e) => setSelectedTone(TONE_OPTIONS.find(t => t.id === e.target.value) || TONE_OPTIONS[0])}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        {TONE_OPTIONS.map((tone) => (
                                            <option key={tone.id} value={tone.id}>
                                                {tone.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between text-white"
                            >
                                <span className="flex items-center gap-2 font-bold">
                                    <Sliders className="w-5 h-5 text-emerald-400" />
                                    Advanced Options
                                </span>
                                {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            
                            {showAdvanced && (
                                <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Include Hashtags</span>
                                        <button
                                            onClick={() => setIncludeHashtags(!includeHashtags)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeHashtags ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeHashtags ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Include Emojis</span>
                                        <button
                                            onClick={() => setIncludeEmojis(!includeEmojis)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeEmojis ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeEmojis ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Include Call-to-Action</span>
                                        <button
                                            onClick={() => setIncludeCTA(!includeCTA)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeCTA ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeCTA ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    {includeCTA && (
                                        <input
                                            type="text"
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            placeholder="Call-to-action text..."
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                        />
                                    )}
                                    
                                    <div>
                                        <label className="text-xs text-slate-500 mb-2 block">Watermark Text (optional)</label>
                                        <input
                                            type="text"
                                            value={watermarkText}
                                            onChange={(e) => setWatermarkText(e.target.value)}
                                            placeholder="@yourbrand"
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !inputValue.trim()}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {loadingStage || 'Generating...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Content Bundle
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Results */}
                    <div className="lg:col-span-7 space-y-6">
                        {loading && (
                            <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 relative mb-6">
                                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="text-emerald-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                                <p className="text-slate-500 text-xs mt-2">This usually takes 30-60 seconds</p>
                            </div>
                        )}

                        {imageData && !loading && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Infographic Preview */}
                                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <ImageIcon className="w-5 h-5 text-emerald-400" />
                                            Generated Infographic
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setFullScreenImage({src: `data:image/png;base64,${imageData}`, alt: "Infographic"})}
                                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                                title="Full Screen"
                                            >
                                                <Maximize className="w-4 h-4" />
                                            </button>
                                            <div className="relative group">
                                                <button className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-sm font-medium transition-colors">
                                                    <Download className="w-4 h-4" />
                                                    Download
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                    <button onClick={() => downloadImage('png')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 rounded-t-xl">PNG (High Quality)</button>
                                                    <button onClick={() => downloadImage('jpg')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5">JPG (Smaller Size)</button>
                                                    <button onClick={() => downloadImage('webp')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 rounded-b-xl">WebP (Web Optimized)</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-xl overflow-hidden bg-slate-950 border border-white/5">
                                        <img 
                                            src={`data:image/png;base64,${imageData}`} 
                                            alt="Generated Infographic" 
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </div>

                                {/* Social Posts */}
                                {generatedPosts.length > 0 && (
                                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <Share2 className="w-5 h-5 text-emerald-400" />
                                                Social Media Posts
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handlePostToAllPlatforms}
                                                    disabled={isPosting || !imageData}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                                >
                                                    {isPosting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Posting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-4 h-4" />
                                                            Post to All
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={handleExportAllToSheets}
                                                    disabled={isExportingToSheets || !imageData}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                                >
                                                    {isExportingToSheets ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Exporting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sheet className="w-4 h-4" />
                                                            Send to Google Sheets
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setShowScheduleModal(true)}
                                                    disabled={!imageData}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Schedule to Calendar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Post Results */}
                                        {postResults.length > 0 && (
                                            <div className="mb-4 space-y-2">
                                                {postResults.map((result, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                                                            result.success
                                                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                        }`}
                                                    >
                                                        {result.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                        <span className="font-medium">{result.platform}:</span>
                                                        <span>{result.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Google Sheets Export Results */}
                                        {sheetsExportResults.length > 0 && (
                                            <div className="mb-4 space-y-2">
                                                {sheetsExportResults.map((result, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg flex items-center justify-between text-sm ${
                                                            result.success
                                                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {result.success ? <Sheet className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                            <span className="font-medium">{result.platform}:</span>
                                                            <span>{result.message}</span>
                                                        </div>
                                                        {result.success && result.driveUrl && (
                                                            <a
                                                                href={result.driveUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-xs text-green-300 hover:text-green-200 underline"
                                                            >
                                                                View in Drive <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {generatedPosts.map((post, idx) => {
                                                const platform = PLATFORMS.find(p => p.id === post.platform);
                                                const Icon = platform?.icon || MessageSquare;
                                                const isCurrentlyPosting = isPosting && postingPlatform === post.platform;
                                                const isCurrentlyExporting = isExportingToSheets && exportingPlatform === post.platform;
                                                return (
                                                    <div key={idx} className="p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-emerald-500/30 transition-colors">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="w-4 h-4 text-emerald-400" />
                                                                <span className="text-sm font-bold text-white">{post.platform}</span>
                                                                {platform && (
                                                                    <span className="text-[10px] text-slate-500">
                                                                        {post.content.length}/{platform.charLimit} chars
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => copyToClipboard(post.content, idx)}
                                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                                                                >
                                                                    {copiedPostIndex === idx ? (
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
                                                                <button
                                                                    onClick={() => handleExportToSheets(post.platform, post.content)}
                                                                    disabled={isExportingToSheets || !imageData}
                                                                    className="flex items-center gap-1 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                                    title="Send to Google Sheets"
                                                                >
                                                                    {isCurrentlyExporting ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                            Sending...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Sheet className="w-3 h-3" />
                                                                            Sheets
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePostToPlatform(post.platform, post.content)}
                                                                    disabled={isPosting || !imageData}
                                                                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    {isCurrentlyPosting ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                            Posting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Send className="w-3 h-3" />
                                                                            Post
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                            {post.content}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Citations */}
                                {citations.length > 0 && (
                                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                        <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            Sources ({citations.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {citations.map((cite, idx) => (
                                                <a
                                                    key={idx}
                                                    href={cite.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Globe className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px]">{cite.title || cite.uri}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Bar - Save & Download */}
                                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-800/50 border border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Archive className="w-5 h-5 text-emerald-400" />
                                            Save & Export
                                        </h3>
                                        {saveSuccess && (
                                            <span className="flex items-center gap-2 text-emerald-400 text-sm animate-in fade-in">
                                                <Check className="w-4 h-4" />
                                                Saved to drafts!
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        {/* Save to Drafts */}
                                        <button
                                            onClick={handleSaveToDrafts}
                                            disabled={isSaving || (!imageData && generatedPosts.length === 0)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Save to Drafts
                                                </>
                                            )}
                                        </button>

                                        {/* Download Bundle (ZIP) */}
                                        <button
                                            onClick={downloadBundle}
                                            disabled={isDownloading || (!imageData && generatedPosts.length === 0)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloading ? (
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

                                        {/* Download Captions Only */}
                                        <button
                                            onClick={downloadCaptions}
                                            disabled={generatedPosts.length === 0}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Download Captions
                                        </button>
                                    </div>

                                    <p className="text-xs text-slate-500 mt-3">
                                        ZIP includes: infographic image, individual platform captions, combined captions, sources, and metadata
                                    </p>
                                </div>
                            </div>
                        )}

                        {!imageData && !loading && (
                            <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <Sparkles className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Ready to Create</h3>
                                <p className="text-slate-500 max-w-md">
                                    Enter a URL, topic, or upload content to generate a stunning infographic and social media posts.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                value={historyFilter}
                                onChange={(e) => setHistoryFilter(e.target.value)}
                                placeholder="Search history..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <button className="p-3 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                            <Filter className="w-5 h-5" />
                        </button>
                        <button className="p-3 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                            <SortAsc className="w-5 h-5" />
                        </button>
                    </div>

                    {filteredHistory.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredHistory.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => loadFromHistory(item)}
                                    className="group bg-slate-900/50 border border-white/5 hover:border-emerald-500/30 rounded-xl overflow-hidden text-left transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                >
                                    <div className="aspect-video relative overflow-hidden bg-slate-950">
                                        <img 
                                            src={`data:image/png;base64,${item.imageData}`} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                        {item.socialPosts?.length > 0 && (
                                            <div className="absolute bottom-2 right-2">
                                                <span className="bg-black/60 backdrop-blur text-emerald-400 text-[10px] px-2 py-1 rounded-full border border-emerald-500/30">
                                                    +{item.socialPosts.length} posts
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(item.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <Clock className="w-12 h-12 text-slate-600 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">No History Yet</h3>
                            <p className="text-slate-500">Your generated content will appear here</p>
                        </div>
                    )}
                </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                    <LayoutTemplate className="w-12 h-12 text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Templates Coming Soon</h3>
                    <p className="text-slate-500 max-w-md">
                        Save your favorite configurations as templates for quick access. This feature is under development.
                    </p>
                </div>
            )}

            {/* Schedule Post Modal */}
            <SchedulePostModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSuccess={() => {
                    setShowScheduleModal(false);
                }}
                title={inputMode === 'url' ? (() => { try { return new URL(inputValue).hostname; } catch { return 'Content Bundle'; } })() : inputValue.slice(0, 50)}
                content={generatedPosts}
                images={imageData ? [`data:image/png;base64,${imageData}`] : []}
                hashtags={[]}
                sourceType="content_bundle"
                postType="image"
                preSelectedPlatforms={selectedPlatforms.map(p => p.toLowerCase() as SocialPlatform)}
                allowMultiplePlatforms={true}
            />
        </div>
    );
};

export default ArticleToInfographic;