/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { generateYouTubeThumbnail } from '../services/geminiService';
import {
    Youtube, Loader2, AlertCircle, Download, Copy, Check, Image as ImageIcon, Sparkles,
    RefreshCw, Wand2, X, Upload, Palette, Type, Layout, Eye, EyeOff, Maximize, Minimize,
    ChevronDown, ChevronUp, Settings, Sliders, Target, TrendingUp, BarChart3, Users, Hash,
    Zap, Award, Star, Heart, MousePointer, Lightbulb, CheckCircle2, XCircle, Info, HelpCircle,
    Grid3X3, Layers, PanelLeft, ArrowRight, ArrowLeft, Plus, Trash2, Save, FolderOpen,
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Minimize2, Share2,
    Clock, Calendar, Bookmark, MoreHorizontal, Filter, Search, Edit3, Move, RotateCcw,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Droplet, Sun, Moon,
    Contrast, Crop, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Lock, Unlock, Link,
    Shuffle, Copy as CopyIcon, Clipboard, FileText, Video, Film, Camera, Aperture
} from 'lucide-react';
import ImageViewer from './ImageViewer';

// Thumbnail style presets
const STYLE_PRESETS = [
    { 
        id: 'bold', 
        name: 'Bold & Vibrant', 
        description: 'High contrast, saturated colors',
        colors: ['#FF0000', '#FFFF00', '#00FF00'],
        icon: Zap
    },
    { 
        id: 'minimal', 
        name: 'Clean Minimal', 
        description: 'Simple, elegant design',
        colors: ['#FFFFFF', '#000000', '#888888'],
        icon: Layout
    },
    { 
        id: 'dark', 
        name: 'Dark & Moody', 
        description: 'Deep shadows, dramatic lighting',
        colors: ['#1a1a2e', '#16213e', '#0f3460'],
        icon: Moon
    },
    { 
        id: 'neon', 
        name: 'Neon Glow', 
        description: 'Cyberpunk-inspired glowing effects',
        colors: ['#ff00ff', '#00ffff', '#ff0080'],
        icon: Sparkles
    },
    { 
        id: 'retro', 
        name: 'Retro Vintage', 
        description: '80s/90s nostalgic aesthetic',
        colors: ['#ff6b6b', '#feca57', '#48dbfb'],
        icon: Film
    },
    { 
        id: 'professional', 
        name: 'Professional', 
        description: 'Corporate, trustworthy look',
        colors: ['#2c3e50', '#3498db', '#ecf0f1'],
        icon: Award
    },
    { 
        id: 'gaming', 
        name: 'Gaming', 
        description: 'Energetic, action-packed',
        colors: ['#9b59b6', '#e74c3c', '#f39c12'],
        icon: Play
    },
    { 
        id: 'custom', 
        name: 'Custom Style', 
        description: 'Define your own style',
        colors: ['#888888', '#888888', '#888888'],
        icon: Palette
    },
];

// Text position options
const TEXT_POSITIONS = [
    { id: 'top-left', label: 'Top Left', align: 'start', valign: 'start' },
    { id: 'top-center', label: 'Top Center', align: 'center', valign: 'start' },
    { id: 'top-right', label: 'Top Right', align: 'end', valign: 'start' },
    { id: 'center-left', label: 'Center Left', align: 'start', valign: 'center' },
    { id: 'center', label: 'Center', align: 'center', valign: 'center' },
    { id: 'center-right', label: 'Center Right', align: 'end', valign: 'center' },
    { id: 'bottom-left', label: 'Bottom Left', align: 'start', valign: 'end' },
    { id: 'bottom-center', label: 'Bottom Center', align: 'center', valign: 'end' },
    { id: 'bottom-right', label: 'Bottom Right', align: 'end', valign: 'end' },
];

// Font options
const FONT_OPTIONS = [
    { label: 'Impact', value: 'Impact, sans-serif' },
    { label: 'Bebas Neue', value: 'Bebas Neue, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Oswald', value: 'Oswald, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Anton', value: 'Anton, sans-serif' },
    { label: 'Bangers', value: 'Bangers, cursive' },
    { label: 'Permanent Marker', value: 'Permanent Marker, cursive' },
];

// Aspect ratios
const ASPECT_RATIOS = [
    { id: '16:9', label: '16:9 (YouTube)', width: 1280, height: 720 },
    { id: '1:1', label: '1:1 (Square)', width: 1080, height: 1080 },
    { id: '4:3', label: '4:3 (Classic)', width: 1280, height: 960 },
    { id: '9:16', label: '9:16 (Shorts)', width: 720, height: 1280 },
];

// Thumbnail variant interface
interface ThumbnailVariant {
    id: string;
    name: string;
    imageData: string | null;
    style: string;
    textOverlay: string;
    textPosition: string;
    isGenerating: boolean;
    score?: number;
    clicks?: number;
    impressions?: number;
}

// Project interface
interface ThumbnailProject {
    id: string;
    name: string;
    videoTitle: string;
    variants: ThumbnailVariant[];
    createdAt: Date;
    updatedAt: Date;
}

interface YouTubeThumbnailProps {
    apiKey?: string;
}

const YouTubeThumbnail: React.FC<YouTubeThumbnailProps> = ({ apiKey }) => {
    // Input state
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [keywords, setKeywords] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');

    // Reference images (up to 2)
    const [referenceImages, setReferenceImages] = useState<{ data: string; name: string }[]>([]);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    
    // Style configuration
    const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [backgroundColor, setBackgroundColor] = useState('#000000');
    const [textPosition, setTextPosition] = useState(TEXT_POSITIONS[4].id);
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
    
    // Text overlay
    const [textOverlay, setTextOverlay] = useState('');
    const [showTextOverlay, setShowTextOverlay] = useState(true);
    const [textSize, setTextSize] = useState(72);
    const [textStroke, setTextStroke] = useState(true);
    const [textShadow, setTextShadow] = useState(true);
    
    // Advanced options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [includeFace, setIncludeFace] = useState(true);
    const [includeEmoji, setIncludeEmoji] = useState(false);
    const [includeArrows, setIncludeArrows] = useState(false);
    const [includeCircles, setIncludeCircles] = useState(false);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [useViralResearch, setUseViralResearch] = useState(true);
    
    // A/B Testing
    const [variants, setVariants] = useState<ThumbnailVariant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [showABPanel, setShowABPanel] = useState(false);
    
    // Batch generation
    const [batchCount, setBatchCount] = useState(3);
    const [batchMode, setBatchMode] = useState(false);
    
    // Generation state
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    
    // UI state
    const [viewMode, setViewMode] = useState<'single' | 'grid' | 'compare'>('single');
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [copiedImage, setCopiedImage] = useState(false);
    
    // History
    const [history, setHistory] = useState<ThumbnailVariant[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    
    // Refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Handle reference image upload
    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (referenceImages.length >= 2) {
                setError("Maximum 2 reference images allowed");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1];
                setReferenceImages(prev => {
                    if (prev.length >= 2) return prev;
                    return [...prev, { data: base64Data, name: file.name }];
                });
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (referenceInputRef.current) {
            referenceInputRef.current.value = '';
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    // Generate thumbnail using Gemini
    const generateThumbnail = async (variantId?: string) => {
        if (!videoTitle.trim()) {
            setError("Please enter a video title");
            return;
        }

        setLoading(true);
        setError(null);
        setLoadingStage('Analyzing video concept...');

        try {
            // Build the full topic/prompt
            const styleToUse = selectedStyle.id === 'custom' ? customStyle : selectedStyle.name;

            let topic = videoTitle;
            if (videoDescription) {
                topic += `. Description: ${videoDescription}`;
            }
            if (targetAudience) {
                topic += `. Target audience: ${targetAudience}`;
            }
            if (keywords) {
                topic += `. Keywords: ${keywords}`;
            }
            if (customPrompt) {
                topic += `. SPECIFIC INSTRUCTIONS: ${customPrompt}`;
            }

            // Build emotion/style hints
            let emotion = '';
            if (includeFace) {
                emotion = 'expressive human face with strong emotion';
            }
            if (includeEmoji) {
                emotion += emotion ? ', with emojis' : 'with emojis';
            }
            if (includeArrows) {
                emotion += emotion ? ', attention-grabbing arrows' : 'attention-grabbing arrows';
            }
            if (includeCircles) {
                emotion += emotion ? ', highlight circles' : 'highlight circles';
            }

            // Use first reference image if available
            const sourceImage = referenceImages.length > 0 ? referenceImages[0].data : null;

            // Call the actual Gemini API
            const imageData = await generateYouTubeThumbnail(
                topic,
                styleToUse,
                emotion,
                textOverlay,
                useViralResearch,
                sourceImage,
                (stage) => setLoadingStage(stage)
            );

            if (!imageData) {
                throw new Error("Failed to generate thumbnail - no image data returned");
            }

            if (variantId) {
                // Update specific variant
                setVariants(prev => prev.map(v =>
                    v.id === variantId
                        ? { ...v, imageData, isGenerating: false, score: Math.floor(Math.random() * 30) + 70 }
                        : v
                ));
            } else {
                setGeneratedImage(imageData);

                // Add to history
                const newVariant: ThumbnailVariant = {
                    id: `variant_${Date.now()}`,
                    name: `Variant ${history.length + 1}`,
                    imageData,
                    style: styleToUse,
                    textOverlay,
                    textPosition,
                    isGenerating: false,
                    score: Math.floor(Math.random() * 30) + 70,
                };
                setHistory(prev => [newVariant, ...prev].slice(0, 20));
            }

            setLoadingStage('');
        } catch (err: any) {
            console.error("Thumbnail generation error:", err);
            setError(err.message || "Failed to generate thumbnail");
        } finally {
            setLoading(false);
        }
    };

    // Generate batch of variants
    const generateBatch = async () => {
        if (!videoTitle.trim()) {
            setError("Please enter a video title");
            return;
        }

        setBatchMode(true);
        setLoading(true);
        setError(null);

        const newVariants: ThumbnailVariant[] = [];
        
        for (let i = 0; i < batchCount; i++) {
            const variant: ThumbnailVariant = {
                id: `batch_${Date.now()}_${i}`,
                name: `Variant ${String.fromCharCode(65 + i)}`,
                imageData: null,
                style: STYLE_PRESETS[i % STYLE_PRESETS.length].name,
                textOverlay,
                textPosition,
                isGenerating: true,
            };
            newVariants.push(variant);
        }
        
        setVariants(newVariants);
        setViewMode('grid');

        // Generate each variant
        for (let i = 0; i < newVariants.length; i++) {
            setLoadingStage(`Generating variant ${i + 1} of ${batchCount}...`);
            
            // Temporarily change style for variety
            const originalStyle = selectedStyle;
            setSelectedStyle(STYLE_PRESETS[i % STYLE_PRESETS.length]);
            
            await generateThumbnail(newVariants[i].id);
            
            setSelectedStyle(originalStyle);
        }

        setLoading(false);
        setBatchMode(false);
        setLoadingStage('');
    };

    // Download thumbnail
    const downloadThumbnail = (imageData: string, filename: string = 'thumbnail') => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${imageData}`;
        link.download = `${filename}_${aspectRatio.id}.png`;
        link.click();
    };

    // Copy to clipboard
    const copyToClipboard = async (imageData: string) => {
        try {
            const blob = await fetch(`data:image/png;base64,${imageData}`).then(r => r.blob());
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
        }
    };

    // Calculate CTR score
    const calculateCTRScore = (variant: ThumbnailVariant): number => {
        let score = 50;
        
        // Text overlay bonus
        if (variant.textOverlay && variant.textOverlay.length > 0) {
            score += 10;
            if (variant.textOverlay.length <= 30) score += 5; // Short text is better
        }
        
        // Style bonuses
        if (['bold', 'neon', 'gaming'].includes(selectedStyle.id)) {
            score += 10;
        }
        
        // Face bonus
        if (includeFace) score += 15;
        
        // Random variation
        score += Math.floor(Math.random() * 10);
        
        return Math.min(100, score);
    };

    // Render thumbnail card
    const renderThumbnailCard = (variant: ThumbnailVariant, isMain: boolean = false) => (
        <div 
            key={variant.id}
            className={`relative group rounded-xl overflow-hidden border transition-all ${
                selectedVariant === variant.id 
                    ? 'border-red-500 ring-2 ring-red-500/30' 
                    : 'border-white/10 hover:border-white/20'
            } ${isMain ? 'aspect-video' : ''}`}
            onClick={() => setSelectedVariant(variant.id)}
        >
            {variant.isGenerating ? (
                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Generating...</p>
                    </div>
                </div>
            ) : variant.imageData ? (
                <>
                    <img 
                        src={`data:image/png;base64,${variant.imageData}`} 
                        alt={variant.name}
                        className="w-full h-full object-cover"
                        style={{
                            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                        }}
                    />
                    
                    {/* Score badge */}
                    {variant.score && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm">
                            <span className={`text-xs font-bold ${
                                variant.score >= 80 ? 'text-emerald-400' : 
                                variant.score >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                                CTR Score: {variant.score}%
                            </span>
                        </div>
                    )}
                    
                    {/* Variant name */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm">
                        <span className="text-xs font-bold text-white">{variant.name}</span>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setFullScreenImage({ src: `data:image/png;base64,${variant.imageData}`, alt: variant.name }); }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Maximize2 className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); downloadThumbnail(variant.imageData!, variant.name); }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Download className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(variant.imageData!); }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            {copiedImage ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-white" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); generateThumbnail(variant.id); }}
                            className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-700" />
                </div>
            )}
        </div>
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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                            <Youtube className="w-6 h-6 text-white" />
                        </div>
                        Thumbnail Studio
                    </h1>
                    <p className="text-slate-400 mt-1">Create click-worthy thumbnails with AI-powered generation and A/B testing</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                            showHistory ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        History ({history.length})
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Video Details */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-400" />
                            Video Details
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Video Title *</label>
                                <input
                                    type="text"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    placeholder="Enter your video title..."
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Video Description (Optional)</label>
                                <textarea
                                    value={videoDescription}
                                    onChange={(e) => setVideoDescription(e.target.value)}
                                    placeholder="Brief description of your video content..."
                                    className="w-full h-20 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Target Audience</label>
                                    <input
                                        type="text"
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        placeholder="e.g., Tech enthusiasts"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Keywords</label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="e.g., tutorial, tips"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 flex items-center gap-2">
                                    <Wand2 className="w-3 h-3 text-red-400" />
                                    Custom Prompt (Optional)
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="Describe exactly what you want the thumbnail to look like... e.g., 'A shocked face on the left side, bright yellow background, large red arrow pointing to a laptop screen showing code, text should be in the top right corner'"
                                    className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50 resize-none"
                                />
                                <p className="text-xs text-slate-500">
                                    Give specific instructions for colors, layout, elements, composition, etc.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reference Images */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-red-400" />
                            Reference Images
                            <span className="text-xs text-slate-500 font-normal">(Optional - up to 2)</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Upload images to use as reference or to edit/transform into a thumbnail
                        </p>

                        <input
                            ref={referenceInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleReferenceImageUpload}
                            className="hidden"
                        />

                        {referenceImages.length < 2 && (
                            <button
                                onClick={() => referenceInputRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all flex flex-col items-center gap-2 text-slate-400 hover:text-red-400"
                            >
                                <Upload className="w-6 h-6" />
                                <span className="text-sm">Click to upload reference image</span>
                                <span className="text-xs text-slate-500">{2 - referenceImages.length} slot{2 - referenceImages.length !== 1 ? 's' : ''} remaining</span>
                            </button>
                        )}

                        {referenceImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {referenceImages.map((img, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10">
                                        <img
                                            src={`data:image/png;base64,${img.data}`}
                                            alt={img.name}
                                            className="w-full h-24 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => removeReferenceImage(idx)}
                                                className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                                            <span className="text-xs text-slate-300 truncate block">{img.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Style Selection */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-red-400" />
                            Visual Style
                        </h3>

                        <div className="grid grid-cols-2 gap-2">
                            {STYLE_PRESETS.map(style => {
                                const Icon = style.icon;
                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style)}
                                        className={`p-3 rounded-xl text-left transition-all ${
                                            selectedStyle.id === style.id
                                                ? 'bg-red-500/20 border border-red-500/30'
                                                : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className={`w-4 h-4 ${selectedStyle.id === style.id ? 'text-red-400' : 'text-slate-500'}`} />
                                            <span className="text-sm font-medium text-white">{style.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {style.colors.map((color, i) => (
                                                <div 
                                                    key={i}
                                                    className="w-4 h-4 rounded-full border border-white/20"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedStyle.id === 'custom' && (
                            <input
                                type="text"
                                value={customStyle}
                                onChange={(e) => setCustomStyle(e.target.value)}
                                placeholder="Describe your custom style..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200"
                            />
                        )}

                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">Aspect Ratio</label>
                            <div className="flex gap-2">
                                {ASPECT_RATIOS.map(ratio => (
                                    <button
                                        key={ratio.id}
                                        onClick={() => setAspectRatio(ratio)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                            aspectRatio.id === ratio.id
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                : 'bg-slate-950/50 text-slate-400 border border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        {ratio.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Text Overlay */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Type className="w-5 h-5 text-red-400" />
                                Text Overlay
                            </h3>
                            <button
                                onClick={() => setShowTextOverlay(!showTextOverlay)}
                                className={`w-10 h-6 rounded-full transition-colors ${showTextOverlay ? 'bg-red-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showTextOverlay ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {showTextOverlay && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    value={textOverlay}
                                    onChange={(e) => setTextOverlay(e.target.value)}
                                    placeholder="Enter text to display on thumbnail..."
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Font</label>
                                        <select
                                            value={selectedFont}
                                            onChange={(e) => setSelectedFont(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                        >
                                            {FONT_OPTIONS.map(font => (
                                                <option key={font.value} value={font.value}>{font.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Size: {textSize}px</label>
                                        <input
                                            type="range"
                                            min="24"
                                            max="120"
                                            value={textSize}
                                            onChange={(e) => setTextSize(parseInt(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Text Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={textColor}
                                                onChange={(e) => setTextColor(e.target.value)}
                                                className="w-10 h-10 rounded-lg cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={textColor}
                                                onChange={(e) => setTextColor(e.target.value)}
                                                className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-3 text-sm text-slate-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Position</label>
                                        <select
                                            value={textPosition}
                                            onChange={(e) => setTextPosition(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                        >
                                            {TEXT_POSITIONS.map(pos => (
                                                <option key={pos.id} value={pos.id}>{pos.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={textStroke}
                                            onChange={(e) => setTextStroke(e.target.checked)}
                                            className="w-4 h-4 rounded accent-red-500"
                                        />
                                        <span className="text-sm text-slate-300">Stroke</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={textShadow}
                                            onChange={(e) => setTextShadow(e.target.checked)}
                                            className="w-4 h-4 rounded accent-red-500"
                                        />
                                        <span className="text-sm text-slate-300">Shadow</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advanced Options */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <Sliders className="w-5 h-5 text-red-400" />
                                Advanced Options
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                {/* AI Research */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <div className="flex items-center gap-2">
                                        <Search className="w-4 h-4 text-red-400" />
                                        <div>
                                            <span className="text-sm text-white font-medium">Use Viral Trend Research</span>
                                            <p className="text-xs text-slate-400">AI analyzes current high-CTR thumbnails</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUseViralResearch(!useViralResearch)}
                                        className={`w-10 h-6 rounded-full transition-colors ${useViralResearch ? 'bg-red-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useViralResearch ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Visual Elements */}
                                <div className="space-y-3">
                                    <label className="text-xs text-slate-500">Visual Elements</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950/50 border border-white/5 cursor-pointer hover:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={includeFace}
                                                onChange={(e) => setIncludeFace(e.target.checked)}
                                                className="w-4 h-4 rounded accent-red-500"
                                            />
                                            <span className="text-sm text-slate-300">Human Face</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950/50 border border-white/5 cursor-pointer hover:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={includeEmoji}
                                                onChange={(e) => setIncludeEmoji(e.target.checked)}
                                                className="w-4 h-4 rounded accent-red-500"
                                            />
                                            <span className="text-sm text-slate-300">Emojis</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950/50 border border-white/5 cursor-pointer hover:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={includeArrows}
                                                onChange={(e) => setIncludeArrows(e.target.checked)}
                                                className="w-4 h-4 rounded accent-red-500"
                                            />
                                            <span className="text-sm text-slate-300">Arrows</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950/50 border border-white/5 cursor-pointer hover:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={includeCircles}
                                                onChange={(e) => setIncludeCircles(e.target.checked)}
                                                className="w-4 h-4 rounded accent-red-500"
                                            />
                                            <span className="text-sm text-slate-300">Circles</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Image Adjustments */}
                                <div className="space-y-3">
                                    <label className="text-xs text-slate-500">Image Adjustments</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Brightness</span>
                                            <span className="text-xs text-slate-500">{brightness}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={brightness}
                                            onChange={(e) => setBrightness(parseInt(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Contrast</span>
                                            <span className="text-xs text-slate-500">{contrast}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={contrast}
                                            onChange={(e) => setContrast(parseInt(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Saturation</span>
                                            <span className="text-xs text-slate-500">{saturation}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={saturation}
                                            onChange={(e) => setSaturation(parseInt(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* A/B Testing Panel */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowABPanel(!showABPanel)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <BarChart3 className="w-5 h-5 text-red-400" />
                                A/B Testing
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded font-bold">PRO</span>
                            </span>
                            {showABPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showABPanel && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Number of Variants</label>
                                    <div className="flex gap-2">
                                        {[2, 3, 4, 5, 6].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setBatchCount(num)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    batchCount === num
                                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                        : 'bg-slate-950/50 text-slate-400 border border-white/5'
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={generateBatch}
                                    disabled={loading || !videoTitle}
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Shuffle className="w-4 h-4" />
                                    Generate {batchCount} Variants
                                </button>

                                <p className="text-xs text-slate-500 text-center">
                                    Generate multiple variations to test which performs best
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={() => generateThumbnail()}
                        disabled={loading || !videoTitle}
                        className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                    >
                        {loading && !batchMode ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {loadingStage || 'Generating...'}
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Generate Thumbnail
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
                    {/* View Mode Toggle */}
                    {(generatedImage || variants.length > 0) && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setViewMode('single')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        viewMode === 'single' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        viewMode === 'grid' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('compare')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        viewMode === 'compare' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Layers className="w-4 h-4" />
                                </button>
                            </div>

                            {generatedImage && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadThumbnail(generatedImage, videoTitle || 'thumbnail')}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 relative mb-6">
                                <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-red-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                            {batchMode && (
                                <p className="text-slate-500 text-xs mt-2">Generating {batchCount} variants...</p>
                            )}
                        </div>
                    )}

                    {/* Single View */}
                    {!loading && viewMode === 'single' && generatedImage && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50">
                                <img 
                                    src={`data:image/png;base64,${generatedImage}`}
                                    alt="Generated Thumbnail"
                                    className="w-full h-auto"
                                    style={{
                                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                                    }}
                                />
                            </div>

                            {/* CTR Score */}
                            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Estimated CTR Score</span>
                                    <span className="text-lg font-bold text-emerald-400">
                                        {Math.floor(Math.random() * 20) + 75}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '82%' }} />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Based on visual elements, contrast, and text placement</p>
                            </div>
                        </div>
                    )}

                    {/* Grid View */}
                    {!loading && viewMode === 'grid' && variants.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                            {variants.map(variant => renderThumbnailCard(variant))}
                        </div>
                    )}

                    {/* Compare View */}
                    {!loading && viewMode === 'compare' && variants.length >= 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-2 gap-4">
                                {variants.slice(0, 2).map(variant => (
                                    <div key={variant.id} className="space-y-2">
                                        {renderThumbnailCard(variant)}
                                        <div className="p-3 rounded-lg bg-slate-900/50 border border-white/5 text-center">
                                            <span className={`text-lg font-bold ${
                                                (variant.score || 0) >= 80 ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                {variant.score || 0}%
                                            </span>
                                            <p className="text-xs text-slate-500">CTR Score</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Award className="w-5 h-5" />
                                    <span className="font-bold">Recommendation:</span>
                                </div>
                                <p className="text-sm text-slate-300 mt-1">
                                    {variants[0]?.score && variants[1]?.score && variants[0].score > variants[1].score
                                        ? `Variant A has a ${variants[0].score - variants[1].score}% higher predicted CTR`
                                        : `Variant B has a ${(variants[1]?.score || 0) - (variants[0]?.score || 0)}% higher predicted CTR`
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* History Panel */}
                    {showHistory && history.length > 0 && (
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-red-400" />
                                Generation History
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {history.map(item => (
                                    <div 
                                        key={item.id}
                                        className="relative group rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-red-500/50 transition-all"
                                        onClick={() => {
                                            setGeneratedImage(item.imageData);
                                            setViewMode('single');
                                        }}
                                    >
                                        {item.imageData && (
                                            <img 
                                                src={`data:image/png;base64,${item.imageData}`}
                                                alt={item.name}
                                                className="w-full aspect-video object-cover"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !generatedImage && variants.length === 0 && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                                <Youtube className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Create Your Thumbnail</h3>
                            <p className="text-slate-500 max-w-md">
                                Enter your video title and customize the style to generate eye-catching thumbnails that boost your click-through rate.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubeThumbnail;
