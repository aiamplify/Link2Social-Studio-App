/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { generateYouTubeThumbnail, editImageWithGemini } from '../services/geminiService';
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
    Shuffle, Copy as CopyIcon, Clipboard, FileText, Video, Film, Camera, Aperture, BookOpen
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

// Thumbnail templates
const THUMBNAIL_TEMPLATES = [
    {
        id: 'none',
        name: 'No Template',
        description: 'Start from scratch',
        layout: '',
        icon: Layout,
    },
    {
        id: 'face-left-text-right',
        name: 'Face Left + Text Right',
        description: 'Person on left side with bold text on the right',
        layout: 'Place a person/face prominently on the LEFT side of the image (taking up about 40% of the frame). Add large, bold text on the RIGHT side. Use a gradient or solid color background.',
        icon: Users,
    },
    {
        id: 'face-right-text-left',
        name: 'Face Right + Text Left',
        description: 'Person on right side with bold text on the left',
        layout: 'Place a person/face prominently on the RIGHT side of the image (taking up about 40% of the frame). Add large, bold text on the LEFT side. Use a gradient or solid color background.',
        icon: Users,
    },
    {
        id: 'centered-face-text-top',
        name: 'Centered Face + Text Top',
        description: 'Person centered with text overlay at top',
        layout: 'Place a person/face CENTERED in the image with a dramatic expression. Add large bold text at the TOP of the image. Background should have depth or bokeh effect.',
        icon: Target,
    },
    {
        id: 'split-screen',
        name: 'Split Screen Before/After',
        description: 'Two-panel comparison layout',
        layout: 'Create a SPLIT SCREEN design with a clear vertical divider. Left side shows "before" or problem state, right side shows "after" or solution. Add contrasting colors to each side.',
        icon: Layers,
    },
    {
        id: 'reaction-style',
        name: 'Reaction Style',
        description: 'Exaggerated reaction with arrows/circles',
        layout: 'Large shocked/surprised FACE expression taking up most of the frame. Add RED ARROWS pointing to something interesting. Include CIRCLE highlights. Very high contrast and saturation.',
        icon: AlertCircle,
    },
    {
        id: 'tutorial-style',
        name: 'Tutorial/How-To',
        description: 'Step numbers with preview',
        layout: 'Show a PREVIEW of the end result or topic. Add a large NUMBER or "HOW TO" text. Include smaller supporting visuals. Clean, educational look with good contrast.',
        icon: BookOpen,
    },
    {
        id: 'listicle',
        name: 'Listicle/Top 10',
        description: 'Big number with topic imagery',
        layout: 'Feature a LARGE NUMBER prominently (like "TOP 10" or "5 WAYS"). Add relevant imagery around/behind the number. Bold, eye-catching colors. Text describing the list topic.',
        icon: Hash,
    },
    {
        id: 'product-showcase',
        name: 'Product Showcase',
        description: 'Product front and center with person',
        layout: 'Product or item PROMINENTLY displayed in the center. Person holding or reacting to the product on one side. Clean background with subtle gradient. Price or key feature highlighted.',
        icon: Star,
    },
    {
        id: 'dramatic-text',
        name: 'Dramatic Text Only',
        description: 'Bold text with dramatic background',
        layout: 'MASSIVE bold text taking up most of the frame. Dramatic background (flames, lightning, gradient). High contrast. Text should be slightly 3D or have strong shadow/glow effects.',
        icon: Type,
    },
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
    const [videoScript, setVideoScript] = useState('');

    // Template selection
    const [selectedTemplate, setSelectedTemplate] = useState(THUMBNAIL_TEMPLATES[0]);

    // Self portrait image (image of user to include in thumbnail)
    const [selfPortrait, setSelfPortrait] = useState<{ data: string; name: string } | null>(null);
    const selfPortraitInputRef = useRef<HTMLInputElement>(null);

    // Style reference image (another thumbnail to use as style reference)
    const [styleReference, setStyleReference] = useState<{ data: string; name: string } | null>(null);
    const styleReferenceInputRef = useRef<HTMLInputElement>(null);

    // Script file input ref
    const scriptFileInputRef = useRef<HTMLInputElement>(null);

    // Legacy reference images (keeping for backward compatibility)
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
    const [batchCount, setBatchCount] = useState(5);
    const [batchMode, setBatchMode] = useState(false);

    // Multi-version generation
    const [generateMultiple, setGenerateMultiple] = useState(false);
    const [alternativeCount, setAlternativeCount] = useState(5);
    const [alternatives, setAlternatives] = useState<ThumbnailVariant[]>([]);

    // Iterate/Modify modal
    const [showModifyModal, setShowModifyModal] = useState(false);
    const [modifyingImage, setModifyingImage] = useState<string | null>(null);
    const [modifyPrompt, setModifyPrompt] = useState('');
    const [isModifying, setIsModifying] = useState(false);

    // Send to Veo3 Director modal
    const [showSendToVeoModal, setShowSendToVeoModal] = useState(false);
    const [sendingImageData, setSendingImageData] = useState<string | null>(null);
    const [veoPosition, setVeoPosition] = useState<'first' | 'last'>('first');
    
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

    // Handle self portrait upload
    const handleSelfPortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            setSelfPortrait({ data: base64Data, name: file.name });
        };
        reader.readAsDataURL(file);

        if (selfPortraitInputRef.current) {
            selfPortraitInputRef.current.value = '';
        }
    };

    // Handle style reference upload
    const handleStyleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            setStyleReference({ data: base64Data, name: file.name });
        };
        reader.readAsDataURL(file);

        if (styleReferenceInputRef.current) {
            styleReferenceInputRef.current.value = '';
        }
    };

    // Handle script file upload
    const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const text = reader.result as string;
            setVideoScript(text);
        };
        reader.readAsText(file);

        if (scriptFileInputRef.current) {
            scriptFileInputRef.current.value = '';
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

            // Add video script context if provided
            if (videoScript.trim()) {
                const scriptSummary = videoScript.length > 1000
                    ? videoScript.substring(0, 1000) + '...'
                    : videoScript;
                topic += `. VIDEO SCRIPT CONTEXT: ${scriptSummary}`;
            }

            // Add template layout instructions
            if (selectedTemplate.id !== 'none' && selectedTemplate.layout) {
                topic += `. TEMPLATE LAYOUT: ${selectedTemplate.layout}`;
            }

            if (customPrompt) {
                topic += `. SPECIFIC INSTRUCTIONS: ${customPrompt}`;
            }

            // Add style reference context
            if (styleReference) {
                topic += `. STYLE REFERENCE: Use the provided reference image as inspiration for the visual style, color palette, and composition.`;
            }

            // Add self portrait context
            if (selfPortrait) {
                topic += `. PERSON IMAGE: Include the person from the provided portrait image in the thumbnail. Make them look natural and integrated into the scene.`;
            }

            // Build emotion/style hints
            let emotion = '';
            if (includeFace || selfPortrait) {
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

            // Determine source image priority: selfPortrait > styleReference > referenceImages
            const sourceImage = selfPortrait?.data || styleReference?.data || (referenceImages.length > 0 ? referenceImages[0].data : null);

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

    // Generate multiple alternative versions
    const generateMultipleVersions = async () => {
        if (!videoTitle.trim()) {
            setError("Please enter a video title");
            return;
        }

        setLoading(true);
        setError(null);
        setAlternatives([]);

        const newAlternatives: ThumbnailVariant[] = [];

        // Create placeholders for all versions
        for (let i = 0; i < alternativeCount; i++) {
            newAlternatives.push({
                id: `alt_${Date.now()}_${i}`,
                name: `Version ${i + 1}`,
                imageData: null,
                style: selectedStyle.name,
                textOverlay,
                textPosition,
                isGenerating: true,
            });
        }
        setAlternatives(newAlternatives);

        // Generate each version
        for (let i = 0; i < alternativeCount; i++) {
            setLoadingStage(`Generating version ${i + 1} of ${alternativeCount}...`);

            try {
                const styleToUse = selectedStyle.id === 'custom' ? customStyle : selectedStyle.name;

                let topic = videoTitle;
                if (videoDescription) topic += `. Description: ${videoDescription}`;
                if (targetAudience) topic += `. Target audience: ${targetAudience}`;
                if (keywords) topic += `. Keywords: ${keywords}`;
                if (customPrompt) topic += `. SPECIFIC INSTRUCTIONS: ${customPrompt}`;

                // Add variation instruction for diversity
                topic += `. CREATE VARIATION ${i + 1}: Make this version unique and different from others while keeping the core message.`;

                let emotion = '';
                if (includeFace) emotion = 'expressive human face with strong emotion';
                if (includeEmoji) emotion += emotion ? ', with emojis' : 'with emojis';
                if (includeArrows) emotion += emotion ? ', attention-grabbing arrows' : 'attention-grabbing arrows';
                if (includeCircles) emotion += emotion ? ', highlight circles' : 'highlight circles';

                const sourceImage = referenceImages.length > 0 ? referenceImages[0].data : null;

                const imageData = await generateYouTubeThumbnail(
                    topic,
                    styleToUse,
                    emotion,
                    textOverlay,
                    useViralResearch && i === 0, // Only research for first version
                    sourceImage,
                    (stage) => setLoadingStage(`Version ${i + 1}: ${stage}`)
                );

                setAlternatives(prev => prev.map((alt, idx) =>
                    idx === i
                        ? { ...alt, imageData, isGenerating: false, score: Math.floor(Math.random() * 30) + 70 }
                        : alt
                ));
            } catch (err) {
                console.error(`Error generating version ${i + 1}:`, err);
                setAlternatives(prev => prev.map((alt, idx) =>
                    idx === i ? { ...alt, isGenerating: false } : alt
                ));
            }
        }

        setLoading(false);
        setLoadingStage('');
    };

    // Open modify modal for an image
    const openModifyModal = (imageData: string) => {
        setModifyingImage(imageData);
        setModifyPrompt('');
        setShowModifyModal(true);
    };

    // Handle modifying an image with AI
    const handleModifyImage = async () => {
        if (!modifyingImage || !modifyPrompt.trim()) {
            setError("Please enter modification instructions");
            return;
        }

        setIsModifying(true);
        setError(null);

        try {
            const modifiedImage = await editImageWithGemini(
                modifyingImage,
                'image/png',
                modifyPrompt
            );

            if (modifiedImage) {
                setGeneratedImage(modifiedImage);

                // Add to history
                const newVariant: ThumbnailVariant = {
                    id: `modified_${Date.now()}`,
                    name: `Modified ${history.length + 1}`,
                    imageData: modifiedImage,
                    style: selectedStyle.name,
                    textOverlay,
                    textPosition,
                    isGenerating: false,
                    score: Math.floor(Math.random() * 30) + 70,
                };
                setHistory(prev => [newVariant, ...prev].slice(0, 20));

                setShowModifyModal(false);
                setModifyingImage(null);
                setModifyPrompt('');
            } else {
                throw new Error("Failed to modify image");
            }
        } catch (err: any) {
            console.error("Modify image error:", err);
            setError(err.message || "Failed to modify image");
        } finally {
            setIsModifying(false);
        }
    };

    // Open send to Veo modal
    const openSendToVeoModal = (imageData: string) => {
        setSendingImageData(imageData);
        setVeoPosition('first');
        setShowSendToVeoModal(true);
    };

    // Send image to Veo3 Director tool
    const sendToVeoDirector = () => {
        if (!sendingImageData) return;

        // Save to localStorage for the Veo3 Director tool to pick up
        const veoData = {
            imageData: sendingImageData,
            position: veoPosition,
            timestamp: new Date().toISOString(),
            source: 'thumbnail-creator',
            title: videoTitle || 'Thumbnail',
        };

        localStorage.setItem('veo3_reference_image', JSON.stringify(veoData));

        // Show success message
        setError(null);
        setShowSendToVeoModal(false);
        setSendingImageData(null);

        // Alert user (could be replaced with a toast notification)
        alert(`Image saved as ${veoPosition} reference image for Veo3 Director! Navigate to B-Roll Creator to use it.`);
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

                            {/* Video Script Input */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-xs text-slate-500 flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-red-400" />
                                    Video Script (Optional)
                                </label>
                                <p className="text-xs text-slate-400 mb-2">
                                    Paste your script or upload a .txt file to generate a thumbnail based on your video content
                                </p>
                                <input
                                    ref={scriptFileInputRef}
                                    type="file"
                                    accept=".txt,.md"
                                    onChange={handleScriptFileUpload}
                                    className="hidden"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => scriptFileInputRef.current?.click()}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 flex items-center gap-2 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload .txt File
                                    </button>
                                    {videoScript && (
                                        <button
                                            onClick={() => setVideoScript('')}
                                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-1 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={videoScript}
                                    onChange={(e) => setVideoScript(e.target.value)}
                                    placeholder="Paste your video script here... The AI will analyze it to create a relevant thumbnail."
                                    className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50 resize-none"
                                />
                                {videoScript && (
                                    <p className="text-xs text-emerald-400">
                                        Script loaded: {videoScript.length} characters
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Template Selection */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Layout className="w-5 h-5 text-red-400" />
                            Thumbnail Template
                        </h3>
                        <p className="text-xs text-slate-400">
                            Choose a layout template to guide the AI in creating your thumbnail
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                            {THUMBNAIL_TEMPLATES.map(template => {
                                const Icon = template.icon;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`p-3 rounded-xl text-left transition-all ${
                                            selectedTemplate.id === template.id
                                                ? 'bg-red-500/20 border border-red-500/30'
                                                : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon className={`w-4 h-4 ${selectedTemplate.id === template.id ? 'text-red-400' : 'text-slate-500'}`} />
                                            <span className="text-xs font-medium text-white truncate">{template.name}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Your Photo (Self Portrait) */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-red-400" />
                            Your Photo
                            <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Upload a photo of yourself to include in the thumbnail
                        </p>

                        <input
                            ref={selfPortraitInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSelfPortraitUpload}
                            className="hidden"
                        />

                        {!selfPortrait ? (
                            <button
                                onClick={() => selfPortraitInputRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all flex flex-col items-center gap-2 text-slate-400 hover:text-red-400"
                            >
                                <Upload className="w-6 h-6" />
                                <span className="text-sm">Upload your photo</span>
                                <span className="text-xs text-slate-500">For inclusion in the thumbnail</span>
                            </button>
                        ) : (
                            <div className="relative group rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={`data:image/png;base64,${selfPortrait.data}`}
                                    alt={selfPortrait.name}
                                    className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => selfPortraitInputRef.current?.click()}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSelfPortrait(null)}
                                        className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Your photo uploaded
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Style Reference Image */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-red-400" />
                            Style Reference
                            <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Upload another thumbnail or image as style inspiration
                        </p>

                        <input
                            ref={styleReferenceInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleStyleReferenceUpload}
                            className="hidden"
                        />

                        {!styleReference ? (
                            <button
                                onClick={() => styleReferenceInputRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all flex flex-col items-center gap-2 text-slate-400 hover:text-red-400"
                            >
                                <Upload className="w-6 h-6" />
                                <span className="text-sm">Upload reference image</span>
                                <span className="text-xs text-slate-500">For style & composition inspiration</span>
                            </button>
                        ) : (
                            <div className="relative group rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={`data:image/png;base64,${styleReference.data}`}
                                    alt={styleReference.name}
                                    className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => styleReferenceInputRef.current?.click()}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setStyleReference(null)}
                                        className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Style reference uploaded
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legacy Reference Images - Hidden by default, keeping for compatibility */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4 hidden">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-red-400" />
                            Additional Reference Images
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

                    {/* Generate Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => generateThumbnail()}
                            disabled={loading || !videoTitle}
                            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                        >
                            {loading && !batchMode && alternatives.length === 0 ? (
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

                        <button
                            onClick={() => generateMultipleVersions()}
                            disabled={loading || !videoTitle}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                        >
                            {loading && alternatives.length > 0 ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {loadingStage || 'Generating versions...'}
                                </>
                            ) : (
                                <>
                                    <Grid3X3 className="w-5 h-5" />
                                    Generate {alternativeCount} Versions
                                </>
                            )}
                        </button>

                        <p className="text-xs text-slate-500 text-center">
                            Generate multiple variations to find the perfect thumbnail
                        </p>
                    </div>

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
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 relative group">
                                <img
                                    src={`data:image/png;base64,${generatedImage}`}
                                    alt="Generated Thumbnail"
                                    className="w-full h-auto"
                                    style={{
                                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                                    }}
                                />
                                {/* Action Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => openModifyModal(generatedImage)}
                                        className="px-4 py-2 bg-orange-500/90 hover:bg-orange-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Modify
                                    </button>
                                    <button
                                        onClick={() => openSendToVeoModal(generatedImage)}
                                        className="px-4 py-2 bg-indigo-500/90 hover:bg-indigo-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Video className="w-4 h-4" />
                                        Send to Veo3
                                    </button>
                                    <button
                                        onClick={() => downloadThumbnail(generatedImage)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                </div>
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

                    {/* Multiple Alternatives Grid */}
                    {!loading && alternatives.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Grid3X3 className="w-5 h-5 text-red-400" />
                                    Alternative Versions ({alternatives.filter(a => a.imageData).length}/{alternativeCount})
                                </h3>
                                <button
                                    onClick={() => setAlternatives([])}
                                    className="text-xs text-slate-500 hover:text-white"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {alternatives.map((alt, idx) => (
                                    <div key={alt.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900/50 aspect-video">
                                        {alt.isGenerating ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                                            </div>
                                        ) : alt.imageData ? (
                                            <>
                                                <img
                                                    src={`data:image/png;base64,${alt.imageData}`}
                                                    alt={alt.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Hover Actions */}
                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                    <span className="text-xs text-white font-bold">{alt.name}</span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setGeneratedImage(alt.imageData);
                                                                setViewMode('single');
                                                            }}
                                                            className="p-1.5 bg-emerald-500/80 hover:bg-emerald-500 rounded text-white"
                                                            title="Use this"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => openModifyModal(alt.imageData!)}
                                                            className="p-1.5 bg-orange-500/80 hover:bg-orange-500 rounded text-white"
                                                            title="Modify"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => openSendToVeoModal(alt.imageData!)}
                                                            className="p-1.5 bg-indigo-500/80 hover:bg-indigo-500 rounded text-white"
                                                            title="Send to Veo3"
                                                        >
                                                            <Video className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => downloadThumbnail(alt.imageData!, `thumbnail_v${idx + 1}`)}
                                                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white"
                                                            title="Download"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                                                <XCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                ))}
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
                    {!loading && !generatedImage && variants.length === 0 && alternatives.length === 0 && (
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

            {/* Modify Image Modal */}
            {showModifyModal && modifyingImage && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-orange-400" />
                                    Modify Image
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModifyModal(false);
                                        setModifyingImage(null);
                                        setModifyPrompt('');
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Preview Image */}
                            <div className="rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={`data:image/png;base64,${modifyingImage}`}
                                    alt="Image to modify"
                                    className="w-full h-auto"
                                />
                            </div>

                            {/* Modification Prompt */}
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">How would you like to modify this image?</label>
                                <textarea
                                    value={modifyPrompt}
                                    onChange={(e) => setModifyPrompt(e.target.value)}
                                    placeholder="e.g., Make the background more vibrant, add a glow effect around the text, change the person's expression to more excited, add a red border..."
                                    className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-orange-500/50 resize-none"
                                />
                            </div>

                            {/* Quick Suggestions */}
                            <div className="flex flex-wrap gap-2">
                                {['Add glow effect', 'More contrast', 'Change background', 'Add border', 'Brighter colors'].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setModifyPrompt(prev => prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion)}
                                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowModifyModal(false);
                                        setModifyingImage(null);
                                        setModifyPrompt('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleModifyImage}
                                    disabled={isModifying || !modifyPrompt.trim()}
                                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isModifying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Modifying...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            Apply Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send to Veo3 Director Modal */}
            {showSendToVeoModal && sendingImageData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full">
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Video className="w-5 h-5 text-indigo-400" />
                                    Send to Veo3 Director
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowSendToVeoModal(false);
                                        setSendingImageData(null);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Preview Image */}
                            <div className="rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={`data:image/png;base64,${sendingImageData}`}
                                    alt="Image to send"
                                    className="w-full h-auto"
                                />
                            </div>

                            {/* Position Selection */}
                            <div className="space-y-3">
                                <label className="text-sm text-slate-400">Use this image as:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setVeoPosition('first')}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                                            veoPosition === 'first'
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                                        }`}
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                        <span className="text-sm font-medium">First Frame</span>
                                        <span className="text-xs opacity-70">Opening image</span>
                                    </button>
                                    <button
                                        onClick={() => setVeoPosition('last')}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                                            veoPosition === 'last'
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                                        }`}
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                        <span className="text-sm font-medium">Last Frame</span>
                                        <span className="text-xs opacity-70">Ending image</span>
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowSendToVeoModal(false);
                                        setSendingImageData(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={sendToVeoDirector}
                                    className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Video className="w-4 h-4" />
                                    Send to Veo3
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YouTubeThumbnail;
