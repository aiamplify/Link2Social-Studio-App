import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ProcessedFrame, BlogConfiguration, FontFamily, ColorTheme } from '../types';
import { Download, Copy, Clock, Calendar, Video } from 'lucide-react';

interface BlogPostProps {
  content: string;
  frames: ProcessedFrame[];
  config: BlogConfiguration;
  onGenerateVideo: () => void;
}

export const BlogPost: React.FC<BlogPostProps> = ({ content, frames, config, onGenerateVideo }) => {
  
  const processContent = (text: string) => {
    return text.replace(/\[\[IMAGE_(\d+)\]\]/g, (match, index) => {
      const frameIndex = parseInt(index, 10);
      const frame = frames[frameIndex];
      if (frame) {
        return `\n\n![Step Illustration](${frame.dataUrl})\n\n`;
      }
      return ''; 
    });
  };

  const processedMarkdown = processContent(content);

  const handleCopy = () => {
      navigator.clipboard.writeText(content);
      alert("Markdown copied to clipboard!");
  }

  const urlTransform = (url: string) => {
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return url;
  };

  // --- Dynamic Styling Logic ---
  
  const getFontClass = (font: FontFamily) => {
    switch(font) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      default: return 'font-sans';
    }
  };

  const getThemeClasses = (theme: ColorTheme) => {
    switch(theme) {
      case 'dark': return {
        bg: 'bg-slate-900',
        text: 'text-slate-300',
        heading: 'text-slate-100',
        accent: 'text-blue-400',
        border: 'border-slate-800',
        container: 'bg-slate-800'
      };
      case 'nature': return {
        bg: 'bg-stone-50',
        text: 'text-stone-800',
        heading: 'text-teal-900',
        accent: 'text-teal-700',
        border: 'border-stone-200',
        container: 'bg-white'
      };
      case 'classic': return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        heading: 'text-slate-900',
        accent: 'text-indigo-700',
        border: 'border-slate-200',
        container: 'bg-white'
      };
      default: return { // Modern
        bg: 'bg-white',
        text: 'text-slate-600',
        heading: 'text-slate-900',
        accent: 'text-brand-600',
        border: 'border-slate-100',
        container: 'bg-white'
      };
    }
  };

  const theme = getThemeClasses(config.theme);
  const titleFont = getFontClass(config.titleFont);
  const bodyFont = getFontClass(config.bodyFont);
  const radiusClass = config.borderRadius === 'none' ? 'rounded-none' : config.borderRadius === 'large' ? 'rounded-2xl' : 'rounded-lg';

  // Estimate read time
  const wordCount = content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div className={`w-full max-w-4xl mx-auto shadow-2xl overflow-hidden border ${theme.border} ${radiusClass} flex flex-col transition-all duration-300`}>
      {/* Header Actions */}
      <div className={`${theme.container} border-b ${theme.border} p-4 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm bg-opacity-95`}>
        <div className="flex items-center gap-4">
           {config.showReadingTime && (
             <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1 ${theme.text} bg-opacity-10 bg-current`}>
                <Clock className="w-3 h-3" /> {readTime} min read
             </span>
           )}
           <span className={`text-sm ${theme.text} opacity-60`}>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onGenerateVideo}
                className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg hover:shadow-lg transition-all text-xs font-bold uppercase tracking-wider transform hover:-translate-y-0.5`}
            >
                <Video className="w-3 h-3" /> Turn into Video
            </button>
            <div className={`w-px h-8 ${theme.border} mx-2`}></div>
            <button 
                onClick={handleCopy}
                className={`p-2 ${theme.text} hover:opacity-100 opacity-60 rounded-lg transition-colors`} 
                title="Copy Markdown">
                <Copy className="w-4 h-4" />
            </button>
            <button className={`p-2 ${theme.text} hover:opacity-100 opacity-60 rounded-lg transition-colors`} title="Download HTML">
                <Download className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className={`p-8 md:p-12 ${theme.container} ${theme.text} ${bodyFont}`}>
        <article className="markdown-body">
          {/* Custom Styles Injection for Markdown Content */}
          <style>{`
            .markdown-body h1, .markdown-body h2, .markdown-body h3 { 
              color: inherit !important; 
              font-family: inherit !important;
            }
            .markdown-body h1 { 
              font-size: 2.5rem; 
              line-height: 1.2;
              margin-bottom: 1.5rem;
              ${config.theme === 'dark' ? 'color: #f1f5f9;' : 'color: #0f172a;'}
            }
            .markdown-body h2 { 
              font-size: 1.75rem;
              margin-top: 2.5rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid ${config.theme === 'dark' ? '#334155' : '#e2e8f0'};
              ${config.theme === 'dark' ? 'color: #e2e8f0;' : 'color: #334155;'}
            }
            .markdown-body strong {
              color: inherit;
              font-weight: 700;
            }
            .markdown-body p {
              margin-bottom: 1.5rem;
              line-height: 1.8;
              font-size: 1.125rem;
            }
            .markdown-body blockquote {
               border-left-color: ${config.theme === 'nature' ? '#0d9488' : '#cbd5e1'};
               background-color: ${config.theme === 'dark' ? '#1e293b' : 'transparent'};
               color: ${config.theme === 'dark' ? '#94a3b8' : '#64748b'};
            }
          `}</style>

          <ReactMarkdown
            urlTransform={urlTransform}
            components={{
              h1: ({node, ...props}) => <h1 {...props} className={`${titleFont} ${theme.heading}`} />,
              h2: ({node, ...props}) => <h2 {...props} className={`${titleFont} ${theme.heading}`} />,
              h3: ({node, ...props}) => <h3 {...props} className={`${titleFont} ${theme.heading} opacity-90`} />,
              img: ({node, ...props}) => (
                <figure className="my-10 group">
                  <div className={`overflow-hidden ${radiusClass} shadow-lg border ${theme.border}`}>
                    <img 
                      {...props} 
                      className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]" 
                      alt={props.alt || "Tutorial step"}
                    />
                  </div>
                  {props.alt && props.alt !== "Step Illustration" && (
                    <figcaption className={`text-center text-sm mt-3 italic opacity-70 ${theme.text}`}>{props.alt}</figcaption>
                  )}
                </figure>
              ),
              a: ({node, ...props}) => <a {...props} className={`${theme.accent} hover:underline font-medium`} target="_blank" rel="noopener noreferrer" />,
              code: ({node, ...props}) => (
                <code {...props} className={`${config.theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'} px-1.5 py-0.5 rounded font-mono text-sm`} />
              ),
            }}
          >
            {processedMarkdown}
          </ReactMarkdown>
        </article>
      </div>
      
      {/* Footer */}
      <div className={`${theme.container} p-8 border-t ${theme.border} mt-auto`}>
        <div className={`flex items-center justify-center gap-2 ${theme.text} opacity-50 text-sm`}>
            <div className="w-2 h-2 rounded-full bg-brand-500"></div>
            Generated with Vid2Blog AI • {config.tone} Tone • {config.length} Length
        </div>
      </div>
    </div>
  );
};