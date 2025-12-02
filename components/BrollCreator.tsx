/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
    Film, Loader2, AlertCircle, Download, Copy, Check, Image as ImageIcon, Sparkles, 
    RefreshCw, Wand2, X, Upload, Palette, Type, Layout, Eye, EyeOff, Maximize, Minimize,
    ChevronDown, ChevronUp, Settings, Sliders, Target, TrendingUp, BarChart3, Users, Hash,
    Zap, Award, Star, Heart, MousePointer, Lightbulb, CheckCircle2, XCircle, Info, HelpCircle,
    Grid3X3, Layers, PanelLeft, ArrowRight, ArrowLeft, Plus, Trash2, Save, FolderOpen,
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Minimize2, Share2,
    Clock, Calendar, Bookmark, MoreHorizontal, Filter, Search, Edit3, Move, RotateCcw,
    Video, Camera, Aperture, Clapperboard, Scissors, Music, FileVideo, MonitorPlay,
    GripVertical, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Lock, Unlock, Link,
    Shuffle, Copy as CopyIcon, Clipboard, FileText, Timer, Rewind, FastForward
} from 'lucide-react';
import ImageViewer from './ImageViewer';

// Scene types
const SCENE_TYPES = [
    { id: 'establishing', name: 'Establishing Shot', description: 'Wide shot to set the scene', icon: MonitorPlay },
    { id: 'action', name: 'Action Shot', description: 'Dynamic movement and activity', icon: Zap },
    { id: 'detail', name: 'Detail/Close-up', description: 'Focus on specific elements', icon: ZoomIn },
    { id: 'transition', name: 'Transition', description: 'Smooth scene changes', icon: Shuffle },
    { id: 'atmosphere', name: 'Atmosphere', description: 'Mood and ambiance shots', icon: Sparkles },
    { id: 'reaction', name: 'Reaction Shot', description: 'Emotional responses', icon: Heart },
    { id: 'cutaway', name: 'Cutaway', description: 'Related but different subject', icon: Scissors },
    { id: 'montage', name: 'Montage', description: 'Series of quick shots', icon: Grid3X3 },
];

// Visual styles
const VISUAL_STYLES = [
    { id: 'cinematic', name: 'Cinematic', description: 'Film-like quality', colors: ['#1a1a2e', '#16213e', '#e94560'] },
    { id: 'documentary', name: 'Documentary', description: 'Realistic, authentic', colors: ['#2d3436', '#636e72', '#dfe6e9'] },
    { id: 'corporate', name: 'Corporate', description: 'Professional, clean', colors: ['#0984e3', '#74b9ff', '#ffffff'] },
    { id: 'vintage', name: 'Vintage', description: 'Retro, nostalgic', colors: ['#d4a574', '#c9a959', '#8b7355'] },
    { id: 'modern', name: 'Modern', description: 'Contemporary, sleek', colors: ['#2d3436', '#00cec9', '#fd79a8'] },
    { id: 'dramatic', name: 'Dramatic', description: 'High contrast, intense', colors: ['#000000', '#e74c3c', '#f39c12'] },
    { id: 'natural', name: 'Natural', description: 'Organic, earthy', colors: ['#27ae60', '#2ecc71', '#f1c40f'] },
    { id: 'custom', name: 'Custom', description: 'Define your own', colors: ['#888888', '#888888', '#888888'] },
];

// Duration presets
const DURATION_PRESETS = [
    { id: '15s', label: '15 sec', value: 15, description: 'Social media clip' },
    { id: '30s', label: '30 sec', value: 30, description: 'Short promo' },
    { id: '60s', label: '1 min', value: 60, description: 'Standard B-roll' },
    { id: '90s', label: '90 sec', value: 90, description: 'Extended sequence' },
    { id: '120s', label: '2 min', value: 120, description: 'Full segment' },
    { id: 'custom', label: 'Custom', value: 0, description: 'Set your own' },
];

// Aspect ratios
const ASPECT_RATIOS = [
    { id: '16:9', label: '16:9 (Widescreen)', width: 1920, height: 1080 },
    { id: '9:16', label: '9:16 (Vertical)', width: 1080, height: 1920 },
    { id: '1:1', label: '1:1 (Square)', width: 1080, height: 1080 },
    { id: '4:3', label: '4:3 (Classic)', width: 1440, height: 1080 },
    { id: '21:9', label: '21:9 (Cinematic)', width: 2560, height: 1080 },
];

// Scene interface
interface Scene {
    id: string;
    name: string;
    type: string;
    description: string;
    duration: number;
    imageData: string | null;
    isGenerating: boolean;
    isLocked: boolean;
    order: number;
    notes: string;
    cameraMovement: string;
    lighting: string;
}

// Project interface
interface BrollProject {
    id: string;
    name: string;
    description: string;
    scenes: Scene[];
    style: string;
    aspectRatio: string;
    totalDuration: number;
    createdAt: Date;
    updatedAt: Date;
}

interface BrollCreatorProps {
    apiKey?: string;
}

const BrollCreator: React.FC<BrollCreatorProps> = ({ apiKey }) => {
    // Project state
    const [projectName, setProjectName] = useState('Untitled Project');
    const [projectDescription, setProjectDescription] = useState('');
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [selectedScene, setSelectedScene] = useState<string | null>(null);
    
    // Input state
    const [topic, setTopic] = useState('');
    const [context, setContext] = useState('');
    const [mood, setMood] = useState('');
    
    // Configuration
    const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
    const [targetDuration, setTargetDuration] = useState(DURATION_PRESETS[2]);
    const [customDuration, setCustomDuration] = useState(60);
    const [sceneCount, setSceneCount] = useState(5);
    
    // Advanced options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [includeCameraMovements, setIncludeCameraMovements] = useState(true);
    const [includeLightingNotes, setIncludeLightingNotes] = useState(true);
    const [includeAudioSuggestions, setIncludeAudioSuggestions] = useState(false);
    const [colorGrading, setColorGrading] = useState('neutral');
    
    // Generation state
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // UI state
    const [viewMode, setViewMode] = useState<'timeline' | 'grid' | 'storyboard'>('timeline');
    const [showScenePanel, setShowScenePanel] = useState(true);
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(100);
    
    // Saved projects
    const [savedProjects, setSavedProjects] = useState<BrollProject[]>([]);
    const [showProjectsPanel, setShowProjectsPanel] = useState(false);
    
    // Refs
    const timelineRef = useRef<HTMLDivElement>(null);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate total duration
    const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);

    // Generate B-roll sequence
    const generateBroll = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic for your B-roll");
            return;
        }

        setLoading(true);
        setError(null);
        setLoadingStage('Analyzing topic...');

        try {
            const styleToUse = selectedStyle.id === 'custom' ? customStyle : selectedStyle.name;
            const duration = targetDuration.id === 'custom' ? customDuration : targetDuration.value;
            
            // Generate scene breakdown
            setLoadingStage('Creating scene breakdown...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newScenes: Scene[] = [];
            const sceneDuration = Math.floor(duration / sceneCount);

            for (let i = 0; i < sceneCount; i++) {
                const sceneType = SCENE_TYPES[i % SCENE_TYPES.length];
                const scene: Scene = {
                    id: `scene_${Date.now()}_${i}`,
                    name: `Scene ${i + 1}: ${sceneType.name}`,
                    type: sceneType.id,
                    description: `${sceneType.description} for "${topic}"`,
                    duration: sceneDuration,
                    imageData: null,
                    isGenerating: true,
                    isLocked: false,
                    order: i,
                    notes: '',
                    cameraMovement: includeCameraMovements ? ['Pan left', 'Pan right', 'Tilt up', 'Dolly in', 'Static', 'Tracking'][Math.floor(Math.random() * 6)] : '',
                    lighting: includeLightingNotes ? ['Natural', 'Soft', 'Dramatic', 'High-key', 'Low-key', 'Golden hour'][Math.floor(Math.random() * 6)] : '',
                };
                newScenes.push(scene);
            }

            setScenes(newScenes);

            // Generate images for each scene
            for (let i = 0; i < newScenes.length; i++) {
                setLoadingStage(`Generating scene ${i + 1} of ${sceneCount}...`);
                
                // Simulate image generation
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Create placeholder image
                const canvas = document.createElement('canvas');
                canvas.width = aspectRatio.width / 2;
                canvas.height = aspectRatio.height / 2;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    // Create gradient background
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    selectedStyle.colors.forEach((color, idx) => {
                        gradient.addColorStop(idx / (selectedStyle.colors.length - 1), color);
                    });
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Add scene number
                    ctx.font = 'bold 48px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`Scene ${i + 1}`, canvas.width / 2, canvas.height / 2 - 30);
                    
                    // Add scene type
                    ctx.font = '24px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.fillText(SCENE_TYPES[i % SCENE_TYPES.length].name, canvas.width / 2, canvas.height / 2 + 20);
                }
                
                const imageData = canvas.toDataURL('image/png').split(',')[1];
                
                setScenes(prev => prev.map(s => 
                    s.id === newScenes[i].id 
                        ? { ...s, imageData, isGenerating: false }
                        : s
                ));
            }

            setLoadingStage('');
            setSelectedScene(newScenes[0]?.id || null);
        } catch (err: any) {
            setError(err.message || "Failed to generate B-roll sequence");
        } finally {
            setLoading(false);
        }
    };

    // Regenerate single scene
    const regenerateScene = async (sceneId: string) => {
        const scene = scenes.find(s => s.id === sceneId);
        if (!scene || scene.isLocked) return;

        setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, isGenerating: true } : s
        ));

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const canvas = document.createElement('canvas');
            canvas.width = aspectRatio.width / 2;
            canvas.height = aspectRatio.height / 2;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                const colors = selectedStyle.colors.map(c => {
                    // Slightly vary colors for regeneration
                    const r = parseInt(c.slice(1, 3), 16);
                    const g = parseInt(c.slice(3, 5), 16);
                    const b = parseInt(c.slice(5, 7), 16);
                    return `rgb(${Math.min(255, r + Math.random() * 30)}, ${Math.min(255, g + Math.random() * 30)}, ${Math.min(255, b + Math.random() * 30)})`;
                });
                colors.forEach((color, idx) => {
                    gradient.addColorStop(idx / (colors.length - 1), color);
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.font = 'bold 48px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Scene ${scene.order + 1}`, canvas.width / 2, canvas.height / 2 - 30);
                
                ctx.font = '24px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText('(Regenerated)', canvas.width / 2, canvas.height / 2 + 20);
            }
            
            const imageData = canvas.toDataURL('image/png').split(',')[1];
            
            setScenes(prev => prev.map(s => 
                s.id === sceneId ? { ...s, imageData, isGenerating: false } : s
            ));
        } catch (err) {
            console.error('Failed to regenerate scene:', err);
            setScenes(prev => prev.map(s => 
                s.id === sceneId ? { ...s, isGenerating: false } : s
            ));
        }
    };

    // Add new scene
    const addScene = () => {
        const newScene: Scene = {
            id: `scene_${Date.now()}`,
            name: `Scene ${scenes.length + 1}`,
            type: 'establishing',
            description: 'New scene',
            duration: 5,
            imageData: null,
            isGenerating: false,
            isLocked: false,
            order: scenes.length,
            notes: '',
            cameraMovement: '',
            lighting: '',
        };
        setScenes([...scenes, newScene]);
        setSelectedScene(newScene.id);
    };

    // Delete scene
    const deleteScene = (sceneId: string) => {
        setScenes(prev => prev.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, order: i })));
        if (selectedScene === sceneId) {
            setSelectedScene(scenes[0]?.id || null);
        }
    };

    // Toggle scene lock
    const toggleSceneLock = (sceneId: string) => {
        setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, isLocked: !s.isLocked } : s
        ));
    };

    // Update scene
    const updateScene = (sceneId: string, updates: Partial<Scene>) => {
        setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, ...updates } : s
        ));
    };

    // Reorder scenes
    const moveScene = (sceneId: string, direction: 'up' | 'down') => {
        const index = scenes.findIndex(s => s.id === sceneId);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= scenes.length) return;
        
        const newScenes = [...scenes];
        [newScenes[index], newScenes[newIndex]] = [newScenes[newIndex], newScenes[index]];
        setScenes(newScenes.map((s, i) => ({ ...s, order: i })));
    };

    // Play/pause preview
    const togglePlay = () => {
        if (isPlaying) {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            playIntervalRef.current = setInterval(() => {
                setCurrentPlayIndex(prev => {
                    const next = prev + 1;
                    if (next >= scenes.length) {
                        if (playIntervalRef.current) {
                            clearInterval(playIntervalRef.current);
                        }
                        setIsPlaying(false);
                        return 0;
                    }
                    return next;
                });
            }, 2000);
        }
    };

    // Save project
    const saveProject = () => {
        const project: BrollProject = {
            id: `project_${Date.now()}`,
            name: projectName,
            description: projectDescription,
            scenes,
            style: selectedStyle.id,
            aspectRatio: aspectRatio.id,
            totalDuration,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setSavedProjects(prev => [project, ...prev]);
    };

    // Load project
    const loadProject = (project: BrollProject) => {
        setProjectName(project.name);
        setProjectDescription(project.description);
        setScenes(project.scenes);
        setSelectedStyle(VISUAL_STYLES.find(s => s.id === project.style) || VISUAL_STYLES[0]);
        setAspectRatio(ASPECT_RATIOS.find(a => a.id === project.aspectRatio) || ASPECT_RATIOS[0]);
        setShowProjectsPanel(false);
    };

    // Download all scenes
    const downloadAll = () => {
        scenes.forEach((scene, index) => {
            if (scene.imageData) {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${scene.imageData}`;
                link.download = `${projectName}_scene_${index + 1}.png`;
                link.click();
            }
        });
    };

    // Get selected scene
    const getSelectedScene = () => scenes.find(s => s.id === selectedScene);

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                            <Film className="w-6 h-6 text-white" />
                        </div>
                        B-Roll Studio
                    </h1>
                    <p className="text-slate-400 mt-1">Create cinematic B-roll sequences with AI-powered scene generation</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowProjectsPanel(!showProjectsPanel)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                            showProjectsPanel ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Projects ({savedProjects.length})
                    </button>
                    <button
                        onClick={saveProject}
                        disabled={scenes.length === 0}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-xl flex items-center gap-2 text-sm font-bold text-white transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>

            {/* Projects Panel */}
            {showProjectsPanel && savedProjects.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-lg font-bold text-white mb-4">Saved Projects</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {savedProjects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => loadProject(project)}
                                className="p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-purple-500/30 text-left transition-all"
                            >
                                <h4 className="font-bold text-white truncate">{project.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{project.scenes.length} scenes • {formatDuration(project.totalDuration)}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Project Info */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clapperboard className="w-5 h-5 text-purple-400" />
                            Project Details
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Project Name</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Topic / Subject *</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Coffee shop morning routine"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Context / Story</label>
                                <textarea
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                    placeholder="Describe the story or context for your B-roll..."
                                    className="w-full h-20 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50 resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Mood / Atmosphere</label>
                                <input
                                    type="text"
                                    value={mood}
                                    onChange={(e) => setMood(e.target.value)}
                                    placeholder="e.g., Calm, energetic, mysterious"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Style & Format */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-purple-400" />
                            Style & Format
                        </h3>

                        {/* Visual Style */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">Visual Style</label>
                            <div className="grid grid-cols-2 gap-2">
                                {VISUAL_STYLES.slice(0, 6).map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyle(style)}
                                        className={`p-3 rounded-xl text-left transition-all ${
                                            selectedStyle.id === style.id
                                                ? 'bg-purple-500/20 border border-purple-500/30'
                                                : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex gap-1 mb-2">
                                            {style.colors.map((color, i) => (
                                                <div 
                                                    key={i}
                                                    className="w-4 h-4 rounded-full border border-white/20"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-medium text-white">{style.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">Aspect Ratio</label>
                            <select
                                value={aspectRatio.id}
                                onChange={(e) => setAspectRatio(ASPECT_RATIOS.find(a => a.id === e.target.value) || ASPECT_RATIOS[0])}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                            >
                                {ASPECT_RATIOS.map(ratio => (
                                    <option key={ratio.id} value={ratio.id}>{ratio.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Duration & Scenes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Target Duration</label>
                                <select
                                    value={targetDuration.id}
                                    onChange={(e) => setTargetDuration(DURATION_PRESETS.find(d => d.id === e.target.value) || DURATION_PRESETS[2])}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                >
                                    {DURATION_PRESETS.map(preset => (
                                        <option key={preset.id} value={preset.id}>{preset.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Number of Scenes</label>
                                <select
                                    value={sceneCount}
                                    onChange={(e) => setSceneCount(parseInt(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                >
                                    {[3, 4, 5, 6, 8, 10, 12].map(num => (
                                        <option key={num} value={num}>{num} scenes</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {targetDuration.id === 'custom' && (
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Custom Duration (seconds)</label>
                                <input
                                    type="number"
                                    value={customDuration}
                                    onChange={(e) => setCustomDuration(parseInt(e.target.value) || 60)}
                                    min={10}
                                    max={300}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                />
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
                                <Sliders className="w-5 h-5 text-purple-400" />
                                Advanced Options
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Camera Movements</span>
                                        <button
                                            onClick={() => setIncludeCameraMovements(!includeCameraMovements)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeCameraMovements ? 'bg-purple-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeCameraMovements ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Lighting Notes</span>
                                        <button
                                            onClick={() => setIncludeLightingNotes(!includeLightingNotes)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeLightingNotes ? 'bg-purple-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeLightingNotes ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Audio Suggestions</span>
                                        <button
                                            onClick={() => setIncludeAudioSuggestions(!includeAudioSuggestions)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeAudioSuggestions ? 'bg-purple-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeAudioSuggestions ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Color Grading</label>
                                    <select
                                        value={colorGrading}
                                        onChange={(e) => setColorGrading(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                    >
                                        <option value="neutral">Neutral</option>
                                        <option value="warm">Warm</option>
                                        <option value="cool">Cool</option>
                                        <option value="cinematic">Cinematic</option>
                                        <option value="vintage">Vintage</option>
                                        <option value="desaturated">Desaturated</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateBroll}
                        disabled={loading || !topic}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {loadingStage || 'Generating...'}
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Generate B-Roll Sequence
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

                {/* Right Column - Timeline & Preview */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Toolbar */}
                    {scenes.length > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="flex items-center gap-2">
                                {/* View Mode */}
                                <div className="flex gap-1 p-1 bg-slate-950/50 rounded-lg">
                                    <button
                                        onClick={() => setViewMode('timeline')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'timeline' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Layers className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('storyboard')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'storyboard' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Playback Controls */}
                                <div className="flex items-center gap-1 ml-4">
                                    <button
                                        onClick={() => setCurrentPlayIndex(Math.max(0, currentPlayIndex - 1))}
                                        className="p-2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <SkipBack className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        className="p-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-colors"
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setCurrentPlayIndex(Math.min(scenes.length - 1, currentPlayIndex + 1))}
                                        className="p-2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Duration */}
                                <div className="ml-4 px-3 py-1.5 bg-slate-950/50 rounded-lg">
                                    <span className="text-sm font-mono text-purple-400">{formatDuration(totalDuration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={addScene}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 flex items-center gap-2 text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Scene
                                </button>
                                <button
                                    onClick={downloadAll}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 flex items-center gap-2 text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Export All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 relative mb-6">
                                <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-purple-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                            <p className="text-slate-500 text-xs mt-2">Creating {sceneCount} scenes...</p>
                        </div>
                    )}

                    {/* Timeline View */}
                    {!loading && viewMode === 'timeline' && scenes.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {/* Preview */}
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50">
                                {scenes[currentPlayIndex]?.imageData ? (
                                    <img 
                                        src={`data:image/png;base64,${scenes[currentPlayIndex].imageData}`}
                                        alt={scenes[currentPlayIndex].name}
                                        className="w-full aspect-video object-cover"
                                    />
                                ) : (
                                    <div className="w-full aspect-video bg-slate-950 flex items-center justify-center">
                                        <Film className="w-12 h-12 text-slate-700" />
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div ref={timelineRef} className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {scenes.map((scene, index) => (
                                        <div
                                            key={scene.id}
                                            onClick={() => {
                                                setSelectedScene(scene.id);
                                                setCurrentPlayIndex(index);
                                            }}
                                            className={`flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                                currentPlayIndex === index 
                                                    ? 'border-purple-500 ring-2 ring-purple-500/30' 
                                                    : selectedScene === scene.id
                                                        ? 'border-white/30'
                                                        : 'border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {scene.isGenerating ? (
                                                <div className="aspect-video bg-slate-950 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                                </div>
                                            ) : scene.imageData ? (
                                                <img 
                                                    src={`data:image/png;base64,${scene.imageData}`}
                                                    alt={scene.name}
                                                    className="aspect-video object-cover"
                                                />
                                            ) : (
                                                <div className="aspect-video bg-slate-950 flex items-center justify-center">
                                                    <ImageIcon className="w-6 h-6 text-slate-700" />
                                                </div>
                                            )}
                                            <div className="p-2 bg-slate-950/80">
                                                <p className="text-xs font-medium text-white truncate">{scene.name}</p>
                                                <p className="text-[10px] text-slate-500">{scene.duration}s</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scene Details */}
                            {getSelectedScene() && (
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-white">{getSelectedScene()?.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleSceneLock(selectedScene!)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    getSelectedScene()?.isLocked 
                                                        ? 'bg-amber-500/20 text-amber-400' 
                                                        : 'bg-white/5 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {getSelectedScene()?.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => regenerateScene(selectedScene!)}
                                                disabled={getSelectedScene()?.isLocked || getSelectedScene()?.isGenerating}
                                                className="p-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteScene(selectedScene!)}
                                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500">Scene Type</label>
                                            <select
                                                value={getSelectedScene()?.type}
                                                onChange={(e) => updateScene(selectedScene!, { type: e.target.value })}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300"
                                            >
                                                {SCENE_TYPES.map(type => (
                                                    <option key={type.id} value={type.id}>{type.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500">Duration (sec)</label>
                                            <input
                                                type="number"
                                                value={getSelectedScene()?.duration}
                                                onChange={(e) => updateScene(selectedScene!, { duration: parseInt(e.target.value) || 5 })}
                                                min={1}
                                                max={30}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500">Camera</label>
                                            <input
                                                type="text"
                                                value={getSelectedScene()?.cameraMovement}
                                                onChange={(e) => updateScene(selectedScene!, { cameraMovement: e.target.value })}
                                                placeholder="e.g., Pan left"
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Notes</label>
                                        <textarea
                                            value={getSelectedScene()?.notes}
                                            onChange={(e) => updateScene(selectedScene!, { notes: e.target.value })}
                                            placeholder="Add notes for this scene..."
                                            className="w-full h-16 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Grid View */}
                    {!loading && viewMode === 'grid' && scenes.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                            {scenes.map((scene, index) => (
                                <div
                                    key={scene.id}
                                    onClick={() => {
                                        setSelectedScene(scene.id);
                                        setCurrentPlayIndex(index);
                                    }}
                                    className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                        selectedScene === scene.id 
                                            ? 'border-purple-500 ring-2 ring-purple-500/30' 
                                            : 'border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {scene.isGenerating ? (
                                        <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                        </div>
                                    ) : scene.imageData ? (
                                        <img 
                                            src={`data:image/png;base64,${scene.imageData}`}
                                            alt={scene.name}
                                            className="aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-slate-700" />
                                        </div>
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <p className="text-sm font-bold text-white">{scene.name}</p>
                                            <p className="text-xs text-slate-400">{scene.duration}s • {SCENE_TYPES.find(t => t.id === scene.type)?.name}</p>
                                        </div>
                                    </div>

                                    {/* Lock indicator */}
                                    {scene.isLocked && (
                                        <div className="absolute top-2 right-2 p-1.5 bg-amber-500/20 rounded-lg">
                                            <Lock className="w-3 h-3 text-amber-400" />
                                        </div>
                                    )}

                                    {/* Scene number */}
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-lg">
                                        <span className="text-xs font-bold text-white">{index + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Storyboard View */}
                    {!loading && viewMode === 'storyboard' && scenes.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {scenes.map((scene, index) => (
                                <div
                                    key={scene.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        selectedScene === scene.id 
                                            ? 'bg-purple-500/10 border-purple-500/30' 
                                            : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                                    }`}
                                    onClick={() => setSelectedScene(scene.id)}
                                >
                                    <div className="flex gap-4">
                                        {/* Thumbnail */}
                                        <div className="w-48 flex-shrink-0">
                                            {scene.imageData ? (
                                                <img 
                                                    src={`data:image/png;base64,${scene.imageData}`}
                                                    alt={scene.name}
                                                    className="w-full aspect-video object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-full aspect-video bg-slate-950 rounded-lg flex items-center justify-center">
                                                    <ImageIcon className="w-8 h-8 text-slate-700" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-white flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                                        {index + 1}
                                                    </span>
                                                    {scene.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {scene.duration}s
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-slate-400">{scene.description}</p>
                                            
                                            <div className="flex gap-4 text-xs">
                                                {scene.cameraMovement && (
                                                    <span className="text-slate-500">
                                                        <Camera className="w-3 h-3 inline mr-1" />
                                                        {scene.cameraMovement}
                                                    </span>
                                                )}
                                                {scene.lighting && (
                                                    <span className="text-slate-500">
                                                        <Lightbulb className="w-3 h-3 inline mr-1" />
                                                        {scene.lighting}
                                                    </span>
                                                )}
                                            </div>

                                            {scene.notes && (
                                                <p className="text-xs text-slate-500 italic">"{scene.notes}"</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'up'); }}
                                                disabled={index === 0}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'down'); }}
                                                disabled={index === scenes.length - 1}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && scenes.length === 0 && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                                <Film className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Create Your B-Roll</h3>
                            <p className="text-slate-500 max-w-md">
                                Enter a topic and configure your settings to generate a complete B-roll sequence with AI-powered scene suggestions.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrollCreator;
