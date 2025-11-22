import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle } from 'lucide-react';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
  logLevel: 'error',
});

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      try {
        setError(null);
        // Unique ID for each render to prevent conflicts in the DOM
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        
        let errorMessage = "Failed to render diagram.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }

        setError(errorMessage);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="my-6 p-4 bg-red-50 border border-red-100 rounded-lg">
        <div className="flex items-center gap-2 mb-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <h4 className="font-medium text-sm">Diagram Generation Error</h4>
        </div>
        <pre className="text-xs text-red-600 font-mono whitespace-pre-wrap break-words bg-white p-3 rounded border border-red-100 shadow-sm mb-3">
          {error}
        </pre>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium">Raw Mermaid Syntax:</p>
          <pre className="text-xs text-slate-400 font-mono bg-slate-100 p-2 rounded overflow-x-auto border border-slate-200">
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex justify-center my-6 p-8 bg-slate-50 rounded-lg border border-slate-100 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div 
      className="flex justify-center my-6 overflow-x-auto p-4 bg-white rounded-lg border border-slate-100 shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};