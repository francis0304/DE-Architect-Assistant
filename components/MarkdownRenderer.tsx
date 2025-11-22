import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './Mermaid';
import { ChevronDown } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white not-prose">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-all text-left group cursor-pointer select-none"
      >
        <h2 className="text-lg font-bold text-slate-800 m-0 group-hover:text-indigo-700 transition-colors">
          {title}
        </h2>
        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-slate-400 group-hover:text-indigo-600`}>
            <ChevronDown className="w-5 h-5" />
        </div>
      </button>
      
      {isOpen && (
        <div className="p-6 bg-white border-t border-slate-100 prose prose-slate max-w-none prose-headings:text-slate-800 prose-a:text-blue-600 prose-pre:bg-slate-900 prose-pre:text-slate-50">
          {children}
        </div>
      )}
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const components = {
    // Custom list handling for better nesting support and visual separation
    ul: ({ node, className, ...props }: any) => (
      <ul className={`list-disc list-outside ml-6 my-4 space-y-2 marker:text-slate-400 [&_ul]:my-2 [&_ul]:space-y-1 [&_ol]:my-2 [&_ol]:space-y-1 [&_p]:my-1 ${className || ''}`} {...props} />
    ),
    ol: ({ node, className, ...props }: any) => (
      <ol className={`list-decimal list-outside ml-6 my-4 space-y-2 marker:text-slate-500 [&_ul]:my-2 [&_ul]:space-y-1 [&_ol]:my-2 [&_ol]:space-y-1 [&_p]:my-1 ${className || ''}`} {...props} />
    ),
    li: ({ node, className, children, ...props }: any) => (
      <li className={`pl-1 ${className || ''}`} {...props}>
        {children}
      </li>
    ),
    // Enhanced Table styling
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead className="bg-slate-50" {...props} />
    ),
    th: ({ node, ...props }: any) => (
      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-t border-slate-100" {...props} />
    ),
    // Code block handling
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language === 'mermaid') {
        return <Mermaid chart={String(children).replace(/\n$/, '')} />;
      }
      
      return !inline && match ? (
        <div className="relative my-6 rounded-lg overflow-hidden shadow-sm border border-slate-800">
          <div className="absolute right-0 top-0 text-xs text-slate-400 font-mono px-3 py-1 bg-slate-800 bg-opacity-50 rounded-bl-lg z-10 border-b border-l border-slate-700/50 backdrop-blur-sm">
            {language}
          </div>
          <code className={`${className} block p-4 overflow-x-auto text-sm leading-relaxed`} {...props}>
            {children}
          </code>
        </div>
      ) : (
        <code className={`${className} bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200`} {...props}>
          {children}
        </code>
      );
    }
  };

  // Split content by H1 headers (looking ahead for # at start of line)
  // This allows us to isolate sections and treat specific ones as collapsible
  const sections = content.split(/(?=^# )/gm);

  return (
    <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:rounded-r-lg">
      {sections.map((section, index) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // Detect title
        const titleMatch = trimmed.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        // Check for collapsible sections based on title keywords
        const isCollapsible = title && (
          title.toLowerCase().includes('solution options') ||
          title.toLowerCase().includes('implementation steps')
        );

        if (isCollapsible) {
          // Remove the header from the body as it's now the accordion trigger
          const body = trimmed.replace(/^#\s+.+$/m, '');
          return (
            <CollapsibleSection key={index} title={title}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {body}
              </ReactMarkdown>
            </CollapsibleSection>
          );
        }

        // Regular section rendering
        return (
          <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={components}>
            {section}
          </ReactMarkdown>
        );
      })}
    </div>
  );
};