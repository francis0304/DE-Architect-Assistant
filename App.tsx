import React, { useState, useRef } from 'react';
import { SourceNodeList } from './components/SourceNodeList';
import { TargetNodeList } from './components/TargetNodeList';
import { DynamicList } from './components/DynamicList';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ChatModal } from './components/ChatModal';
import { VisualBuilder } from './components/VisualBuilder';
import { generateSolution } from './services/geminiService';
import { DeRequestState, DataSource, DataTarget, NodePosition, Connection } from './types';
import { Bot, FileText, Send, Loader2, AlertCircle, ArrowDown, X, Download, MessageSquare, LayoutGrid, List } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const initialState: DeRequestState = {
  techRequirements: '',
  productRequirements: '',
  existingTools: ['BigQuery', 'S3'],
  dataSources: [
    {
      id: '1',
      name: 'MySQL',
      database: 'payments_prod',
      schema: 'public',
      tables: 'transactions, users',
      dataType: 'Relational',
      volume: '2M rows',
      frequency: 'Daily',
      position: { x: 50, y: 50 }
    }
  ],
  dataTargets: [
    {
      id: '10',
      name: 'Redshift',
      storageFormat: 'Columnar',
      partitioning: 'Day',
      position: { x: 450, y: 50 }
    }
  ],
  connections: [
    { id: 'c1', sourceId: '1', targetId: '10' }
  ]
};

const App: React.FC = () => {
  const [formState, setFormState] = useState<DeRequestState>(initialState);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'visual'>('form');
  
  const contentRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof DeRequestState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const updateSourceNode = (id: string, data: Partial<DataSource>) => {
    setFormState(prev => ({
      ...prev,
      dataSources: prev.dataSources.map(node => 
        node.id === id ? { ...node, ...data } : node
      )
    }));
  };

  const updateTargetNode = (id: string, data: Partial<DataTarget>) => {
    setFormState(prev => ({
      ...prev,
      dataTargets: prev.dataTargets.map(node => 
        node.id === id ? { ...node, ...data } : node
      )
    }));
  };

  const addSourceNode = (position?: NodePosition) => {
    const newNode: DataSource = {
      id: crypto.randomUUID(),
      name: '',
      database: '',
      schema: '',
      tables: '',
      dataType: '',
      volume: '',
      frequency: 'Daily',
      position: position || { x: 50, y: 50 + formState.dataSources.length * 100 }
    };
    setFormState(prev => ({ ...prev, dataSources: [...prev.dataSources, newNode] }));
  };

  const addTargetNode = (position?: NodePosition) => {
    const newNode: DataTarget = {
      id: crypto.randomUUID(),
      name: '',
      storageFormat: '',
      partitioning: '',
      position: position || { x: 450, y: 50 + formState.dataTargets.length * 100 }
    };
    setFormState(prev => ({ ...prev, dataTargets: [...prev.dataTargets, newNode] }));
  };

  const removeSourceNode = (id: string) => {
    setFormState(prev => ({
      ...prev,
      dataSources: prev.dataSources.filter(node => node.id !== id),
      connections: prev.connections.filter(c => c.sourceId !== id && c.targetId !== id)
    }));
  };

  const removeTargetNode = (id: string) => {
     setFormState(prev => ({
      ...prev,
      dataTargets: prev.dataTargets.filter(node => node.id !== id),
      connections: prev.connections.filter(c => c.sourceId !== id && c.targetId !== id)
    }));
  };

  const addConnection = (sourceId: string, targetId: string) => {
    // Prevent duplicates and self-loops
    if (sourceId === targetId) return;
    if (formState.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return;

    const newConnection: Connection = {
      id: crypto.randomUUID(),
      sourceId,
      targetId
    };
    setFormState(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));
  };

  const removeConnection = (id: string) => {
    setFormState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id)
    }));
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const newErrors: string[] = [];

    if (!formState.techRequirements.trim()) {
      newErrors.push("Technical Requirements are mandatory.");
    }
    
    if (formState.dataSources.length === 0) {
      newErrors.push("At least one Data Source is required.");
    }

    if (formState.dataTargets.length === 0) {
      newErrors.push("At least one Data Target is required.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    setResponse(null);

    try {
      const result = await generateSolution(formState, includeDiagram);
      setResponse(result);
    } catch (err: any) {
      setErrors([err.message || "Something went wrong"]);
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    setFormState({
      techRequirements: 'Daily sync BigQuery orders to Redshift. Keep 90-day historical data.',
      productRequirements: 'Near real-time dashboard for sales team.',
      existingTools: ['BigQuery', 'Redshift', 'S3'],
      dataSources: [
        { id: '101', name: 'BigQuery', database: 'ecommerce_dw', schema: 'analytics', tables: 'orders (id, customer_id, amount, updated_at)', dataType: 'Tabular', volume: '10M rows', frequency: 'Daily', position: { x: 50, y: 50 } },
        { id: '102', name: 'MySQL', database: 'payments_db', schema: 'prod', tables: 'payments (id, amount, timestamp)', dataType: 'Relational', volume: '2M rows', frequency: 'Hourly', position: { x: 50, y: 250 } }
      ],
      dataTargets: [
        { id: '201', name: 'Redshift.orders_historical', storageFormat: 'Native', partitioning: 'By updated_at', position: { x: 500, y: 50 } },
        { id: '202', name: 'S3.backup_orders', storageFormat: 'Parquet', partitioning: 'Year/Month', position: { x: 500, y: 250 } }
      ],
      connections: [
        { id: 'c1', sourceId: '101', targetId: '201' },
        { id: 'c2', sourceId: '101', targetId: '202' },
        { id: 'c3', sourceId: '102', targetId: '201' }
      ]
    });
    setErrors([]);
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('Francis-Architectural-Solution.pdf');
    } catch (error) {
      console.error("PDF generation failed:", error);
      setErrors(prev => [...prev, "Failed to generate PDF. Please try again."]);
    } finally {
      setIsDownloading(false);
    }
  };

  const getChatContext = () => {
    if (!response) return "";
    return `REQUEST:\n${JSON.stringify(formState, null, 2)}\n\nSOLUTION:\n${response}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Bot className="text-white w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">DE Architect AI</h1>
              <p className="text-xs text-slate-500 font-medium">Solution Design Assistant</p>
            </div>
          </div>
          
          {/* Central View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('form')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'form'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
              title="List Form View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Form</span>
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'visual'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
              title="Visual Builder View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Visual</span>
            </button>
          </div>

          <button 
            onClick={fillExample}
            className="shrink-0 text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline decoration-indigo-200 underline-offset-4"
          >
            <span className="hidden sm:inline">Load Example</span>
            <span className="sm:hidden">Example</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-8">
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Requirements</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Technical Requirement <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y"
                      placeholder="e.g., Daily sync BigQuery to Redshift, Keep 90-day history..."
                      value={formState.techRequirements}
                      onChange={(e) => handleInputChange('techRequirements', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Optional Product Requirement
                    </label>
                    <textarea
                      rows={3}
                      className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y"
                      placeholder="e.g., Real-time dashboard, Email alerts..."
                      value={formState.productRequirements}
                      onChange={(e) => handleInputChange('productRequirements', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DynamicList 
                title="Existing Tools / System" 
                items={formState.existingTools} 
                onChange={(items) => handleInputChange('existingTools', items)}
                placeholder="Tool name"
              />

              {/* Pipeline Design Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Pipeline Design</h3>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {viewMode === 'form' ? 'List View' : 'Visual Builder'}
                  </span>
                </div>

                {viewMode === 'form' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <SourceNodeList 
                      nodes={formState.dataSources} 
                      onChange={(nodes) => handleInputChange('dataSources', nodes)}
                    />
                    
                    <div className="flex justify-center">
                      <ArrowDown className="w-6 h-6 text-slate-300" />
                    </div>

                    <TargetNodeList 
                      nodes={formState.dataTargets} 
                      onChange={(nodes) => handleInputChange('dataTargets', nodes)}
                    />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <VisualBuilder 
                      sources={formState.dataSources}
                      targets={formState.dataTargets}
                      connections={formState.connections}
                      onUpdateSource={(id, data) => updateSourceNode(id, data)}
                      onUpdateTarget={(id, data) => updateTargetNode(id, data)}
                      onAddSource={addSourceNode}
                      onAddTarget={addTargetNode}
                      onRemoveSource={removeSourceNode}
                      onRemoveTarget={removeTargetNode}
                      onAddConnection={addConnection}
                      onRemoveConnection={removeConnection}
                    />
                    <p className="text-xs text-slate-400 mt-2 text-center flex items-center justify-center gap-2">
                       <LayoutGrid className="w-3 h-3" />
                       Drag nodes to move. Drag from dots to connect.
                    </p>
                  </div>
                )}
              </div>

            </section>

            <div className="sticky bottom-6 z-20">
              <div className="flex flex-col gap-3 mb-4">
                {errors.map((errorMsg, index) => (
                  <div key={index} className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Error</h4>
                      <p className="text-sm opacity-90 leading-snug">{errorMsg}</p>
                    </div>
                    <button 
                      onClick={() => removeError(index)}
                      className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-3 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input 
                    type="checkbox"
                    checked={includeDiagram}
                    onChange={(e) => setIncludeDiagram(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  Generate Architecture Diagram
                </label>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3
                  ${loading 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating Solution...
                  </>
                ) : (
                  <>
                    <Bot className="w-6 h-6" />
                    Generate Architecture
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {response ? (
              <div ref={contentRef} className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 min-h-[800px] animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                <div className="mb-6 border-b border-slate-100 pb-4 flex items-center justify-center lg:justify-between flex-wrap gap-4">
                  <h2 className="text-2xl font-bold text-slate-900">Architectural Solution</h2>
                  <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Discuss with AI
                    </button>
                    <div className="h-4 w-px bg-slate-300 mx-1"></div>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isDownloading}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Download as PDF"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <MarkdownRenderer content={response} />
              </div>
            ) : (
              <div className="h-full min-h-[600px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Send className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-500 mb-2">Ready to Architect</h3>
                <p className="max-w-md">
                  Fill in the technical requirements, define your data nodes, and hit Generate to get a professional solution design.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        context={getChatContext()} 
      />

    </div>
  );
};

export default App;