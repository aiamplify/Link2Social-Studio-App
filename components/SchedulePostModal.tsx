/**
 * Schedule Post Modal - Reusable scheduling component
 *
 * This modal can be used from any tool to schedule a post to the content calendar.
 * It handles platform selection, date/time picking, and scheduling to the database.
 */

import React, { useState, useEffect } from 'react';
import {
    X, Calendar, Clock, Twitter, Linkedin, Instagram, Check, AlertCircle,
    Image, ChevronDown, Loader2, CalendarDays, Sparkles, Zap
} from 'lucide-react';
import { SocialPlatform, CalendarPostType, SchedulePostData } from '../types';
import { schedulePost, scheduleMultiplePosts } from '../services/calendarService';

interface SchedulePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;

    // Content to schedule
    title: string;
    content: string | { platform: string; content: string }[];
    images?: string[];
    hashtags?: string[];

    // Source information
    sourceType: SchedulePostData['sourceType'];
    sourceId?: string;
    postType?: CalendarPostType;

    // Pre-selected platforms (optional)
    preSelectedPlatforms?: SocialPlatform[];

    // Allow multiple platform selection
    allowMultiplePlatforms?: boolean;
}

interface TimeSlot {
    label: string;
    time: string;
    description: string;
}

const OPTIMAL_TIME_SLOTS: TimeSlot[] = [
    { label: 'Early Morning', time: '06:00', description: 'Best for B2B, professionals' },
    { label: 'Morning', time: '09:00', description: 'High engagement time' },
    { label: 'Lunch Break', time: '12:00', description: 'Peak mobile usage' },
    { label: 'Afternoon', time: '15:00', description: 'Good for general audience' },
    { label: 'Evening', time: '18:00', description: 'Best for B2C, consumers' },
    { label: 'Night', time: '21:00', description: 'Social media prime time' },
];

const PLATFORMS: { id: SocialPlatform; name: string; icon: React.ElementType; color: string }[] = [
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'sky' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'blue' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink' },
];

const SchedulePostModal: React.FC<SchedulePostModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    title,
    content,
    images = [],
    hashtags = [],
    sourceType,
    sourceId,
    postType = 'image',
    preSelectedPlatforms = [],
    allowMultiplePlatforms = true,
}) => {
    // State
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(preSelectedPlatforms);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [useOptimalTime, setUseOptimalTime] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
    const [scheduling, setScheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Initialize date to tomorrow
    useEffect(() => {
        if (isOpen) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow.toISOString().split('T')[0]);
            setSelectedTime('09:00');
            setError(null);
            setSuccess(false);

            // Set pre-selected platforms if provided
            if (preSelectedPlatforms.length > 0) {
                setSelectedPlatforms(preSelectedPlatforms);
            }
        }
    }, [isOpen, preSelectedPlatforms]);

    // Get content for a specific platform
    const getContentForPlatform = (platform: SocialPlatform): string => {
        if (typeof content === 'string') {
            return content;
        }

        // Find platform-specific content
        const platformContent = content.find(
            c => c.platform.toLowerCase() === platform ||
                 c.platform.toLowerCase().includes(platform)
        );

        return platformContent?.content || content[0]?.content || '';
    };

    // Toggle platform selection
    const togglePlatform = (platform: SocialPlatform) => {
        if (allowMultiplePlatforms) {
            setSelectedPlatforms(prev =>
                prev.includes(platform)
                    ? prev.filter(p => p !== platform)
                    : [...prev, platform]
            );
        } else {
            setSelectedPlatforms([platform]);
        }
    };

    // Apply optimal time slot
    const applyTimeSlot = (slot: TimeSlot) => {
        setSelectedTimeSlot(slot);
        setSelectedTime(slot.time);
        setUseOptimalTime(true);
    };

    // Handle scheduling
    const handleSchedule = async () => {
        if (selectedPlatforms.length === 0) {
            setError('Please select at least one platform');
            return;
        }

        if (!selectedDate || !selectedTime) {
            setError('Please select a date and time');
            return;
        }

        const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);

        if (scheduledAt <= new Date()) {
            setError('Please select a future date and time');
            return;
        }

        setScheduling(true);
        setError(null);

        try {
            if (selectedPlatforms.length === 1) {
                // Single platform
                await schedulePost({
                    title,
                    content: getContentForPlatform(selectedPlatforms[0]),
                    platform: selectedPlatforms[0],
                    scheduledAt,
                    postType: postType || 'image',
                    images,
                    hashtags,
                    sourceType,
                    sourceId,
                });
            } else {
                // Multiple platforms
                const postsData: SchedulePostData[] = selectedPlatforms.map(platform => ({
                    title,
                    content: getContentForPlatform(platform),
                    platform,
                    scheduledAt,
                    postType: postType || 'image',
                    images,
                    hashtags,
                    sourceType,
                    sourceId,
                }));

                await scheduleMultiplePosts(postsData);
            }

            setSuccess(true);

            // Close after short delay
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Scheduling error:', err);
            setError(err instanceof Error ? err.message : 'Failed to schedule post');
        } finally {
            setScheduling(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                                <CalendarDays className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Schedule Post</h2>
                                <p className="text-sm text-slate-400">Add to your content calendar</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Success State */}
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Post Scheduled!</h3>
                            <p className="text-slate-400">
                                Your post has been added to the content calendar
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Post Preview */}
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                                <h4 className="font-medium text-white mb-2">{title}</h4>
                                <p className="text-sm text-slate-400 line-clamp-3">
                                    {typeof content === 'string' ? content : content[0]?.content}
                                </p>
                                {images.length > 0 && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                        <Image className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs text-slate-500">
                                            {images.length} image{images.length > 1 ? 's' : ''} attached
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Platform Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    Select Platform{allowMultiplePlatforms ? 's' : ''}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {PLATFORMS.map(platform => {
                                        const Icon = platform.icon;
                                        const isSelected = selectedPlatforms.includes(platform.id);

                                        return (
                                            <button
                                                key={platform.id}
                                                onClick={() => togglePlatform(platform.id)}
                                                className={`
                                                    p-4 rounded-xl border transition-all
                                                    ${isSelected
                                                        ? `bg-${platform.color}-500/20 border-${platform.color}-500/50 text-${platform.color}-300`
                                                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <Icon className="w-6 h-6 mx-auto mb-2" />
                                                <span className="text-sm">{platform.name}</span>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 mx-auto mt-2 text-emerald-400" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    Schedule Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-violet-500/50 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Time Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    <Clock className="w-4 h-4 inline mr-2" />
                                    Schedule Time
                                </label>

                                {/* Optimal Time Slots */}
                                <div className="mb-4">
                                    <button
                                        onClick={() => setUseOptimalTime(!useOptimalTime)}
                                        className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors mb-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {useOptimalTime ? 'Use custom time' : 'Use optimal posting times'}
                                        <ChevronDown className={`w-4 h-4 transition-transform ${useOptimalTime ? 'rotate-180' : ''}`} />
                                    </button>

                                    {useOptimalTime && (
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            {OPTIMAL_TIME_SLOTS.map(slot => (
                                                <button
                                                    key={slot.time}
                                                    onClick={() => applyTimeSlot(slot)}
                                                    className={`
                                                        p-3 rounded-lg border text-left transition-all
                                                        ${selectedTimeSlot?.time === slot.time
                                                            ? 'bg-violet-500/20 border-violet-500/50'
                                                            : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-white text-sm">{slot.label}</span>
                                                        <span className="text-xs text-slate-400">{slot.time}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500">{slot.description}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) => {
                                        setSelectedTime(e.target.value);
                                        setSelectedTimeSlot(null);
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-violet-500/50 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Scheduled DateTime Preview */}
                            {selectedDate && selectedTime && (
                                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                                    <div className="flex items-center gap-2 text-violet-300">
                                        <Zap className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            Will be posted on{' '}
                                            {new Date(`${selectedDate}T${selectedTime}`).toLocaleString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="p-6 border-t border-white/5 flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={scheduling || selectedPlatforms.length === 0}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all"
                        >
                            {scheduling ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <CalendarDays className="w-4 h-4" />
                                    Schedule {selectedPlatforms.length > 1 ? `${selectedPlatforms.length} Posts` : 'Post'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchedulePostModal;
