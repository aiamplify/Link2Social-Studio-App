import React, { useState } from 'react';
import { Settings, Type, Palette, Layout, Sparkles, Check } from 'lucide-react';
import { BlogConfiguration, BlogPostLength, BlogPostTone, FontFamily, ColorTheme } from '../types';

interface ConfigurationPanelProps {
  onGenerate: (config: BlogConfiguration) => void;
  videoName?: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ onGenerate, videoName }) => {
  const [config, setConfig] = useState<BlogConfiguration>({
    length: 'medium',
    tone: 'instructional',
    targetAudience: 'General Audience',
    includeConclusion: true,
    titleFont: 'serif',
    bodyFont: 'sans',
    theme: 'modern',
    borderRadius: 'small',
    showReadingTime: true
  });

  const handleSubmit = () => {
    onGenerate(config);
  };

  const fonts: { value: FontFamily; label: string }[] = [
    { value: 'sans', label: 'Modern Sans (Inter)' },
    { value: 'serif', label: 'Elegant Serif (Merriweather)' },
    { value: 'mono', label: 'Technical Mono (Fira Code)' },
  ];

  const themes: { value: ColorTheme; label: string; color: string }[] = [
    { value: 'modern', label: 'Modern Blue', color: 'bg-blue-500' },
    { value: 'classic', label: 'Classic Slate', color: 'bg-slate-700' },
    { value: 'nature', label: 'Nature Teal', color: 'bg-teal-600' },
    { value: 'dark', label: 'Dark Mode', color: 'bg-slate-900' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-fade-in">
      <div className="bg-slate-50 border-b border-slate-100 p-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-3">
          <Settings className="w-6 h-6 text-brand-600" />
          Configure Your Tutorial
        </h2>
        <p className="text-slate-500 mt-1">Customize how AI writes and styles your blog post for "{videoName}".</p>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Column: Content Strategy */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-4 text-brand-700 font-semibold uppercase text-xs tracking-wider">
            <Sparkles className="w-4 h-4" /> Content Strategy
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Article Length</label>
            <div className="grid grid-cols-3 gap-2">
              {(['short', 'medium', 'long'] as BlogPostLength[]).map((len) => (
                <button
                  key={len}
                  onClick={() => setConfig({ ...config, length: len })}
                  className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                    config.length === len
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {len.charAt(0).toUpperCase() + len.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              {config.length === 'short' && '~400-600 words. Concise and direct.'}
              {config.length === 'medium' && '~800-1200 words. Balanced detail.'}
              {config.length === 'long' && '~1500+ words. Comprehensive deep dive.'}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Tone of Voice</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value as BlogPostTone })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="instructional">Instructional & Clear</option>
              <option value="professional">Professional & Corporate</option>
              <option value="casual">Casual & Friendly</option>
              <option value="enthusiastic">Enthusiastic & High Energy</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Target Audience</label>
            <input
              type="text"
              value={config.targetAudience}
              onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="e.g. Beginners, Senior Developers, Designers"
            />
          </div>
        </div>

        {/* Right Column: Visual Styling */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-4 text-brand-700 font-semibold uppercase text-xs tracking-wider">
            <Palette className="w-4 h-4" /> Visual Styling
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Typography Pairing</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Headings</span>
                <select
                  value={config.titleFont}
                  onChange={(e) => setConfig({ ...config, titleFont: e.target.value as FontFamily })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Body Text</span>
                <select
                  value={config.bodyFont}
                  onChange={(e) => setConfig({ ...config, bodyFont: e.target.value as FontFamily })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Color Theme</label>
            <div className="flex gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setConfig({ ...config, theme: theme.value })}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme.color} ${
                    config.theme === theme.value ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={theme.label}
                >
                  {config.theme === theme.value && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Controls accents, buttons, and link colors.</p>
          </div>

           <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Image Style</label>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
               <span className="text-sm text-slate-600">Corner Radius</span>
               <div className="flex gap-2">
                 {(['none', 'small', 'large'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setConfig({...config, borderRadius: r})}
                      className={`px-3 py-1 text-xs rounded border ${config.borderRadius === r ? 'bg-white border-brand-500 text-brand-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                 ))}
               </div>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5" />
          Generate Blog Post
        </button>
      </div>
    </div>
  );
};