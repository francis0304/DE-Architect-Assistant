import React, { useState, useRef } from 'react';
import { SourceNodeList } from './components/SourceNodeList';
import { TargetNodeList } from './components/TargetNodeList';
import { TransformationNodeList } from './components/TransformationNodeList';
import { DynamicList } from './components/DynamicList';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ChatModal } from './components/ChatModal';
import { VisualBuilder } from './components/VisualBuilder';
import { generateSolution, generatePipelineLayout } from './services/geminiService';
import { DeRequestState, DataSource, DataTarget, TransformationNode, NodePosition, Connection } from './types';
import { Bot, FileText, Send, Loader2, AlertCircle, ArrowDown, X, Download, MessageSquare, LayoutGrid, List, Hammer, Palette, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ThemeProvider, useTheme, ThemeColor, THEME_COLORS } from './context/ThemeContext';

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
  transformationNodes: [
     {
        id: 't1',
        name: 'Clean & Join',
        processingType: 'dbt',
        description: 'Clean nulls and join users with transactions',
        position: { x: 350, y: 50 }
     }
  ],
  dataTargets: [
    {
      id: '10',
      name: 'Redshift',
      storageFormat: 'Columnar',
      partitioning: 'Day',
      position: { x: 650, y: 50 }
    }
  ],
  connections: [
    { id: 'c1', sourceId: '1', targetId: 't1' },
    { id: 'c2', sourceId: 't1', targetId: '10' }
  ]
};

const AppContent: React.FC = () => {
  const [formState, setFormState] = useState<DeRequestState>(initialState);
  const [loading, setLoading] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'chat'>('builder');
  const [viewMode, setViewMode] = useState<'form' | 'visual'>('form');
  const { theme, setTheme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  
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

  const updateTransformationNode = (id: string, data: Partial<TransformationNode>) => {
    setFormState(prev => ({
      ...prev,
      transformationNodes: prev.transformationNodes.map(node => 
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
      position: position || { x: 50, y: 50 + formState.dataSources.length * 150 }
    };
    setFormState(prev => ({ ...prev, dataSources: [...prev.dataSources, newNode] }));
  };

  const addTransformationNode = (position?: NodePosition) => {
    const newNode: TransformationNode = {
      id: crypto.randomUUID(),
      name: '',
      processingType: '',
      description: '',
      position: position || { x: 350, y: 50 + formState.transformationNodes.length * 150 }
    };
    setFormState(prev => ({ ...prev, transformationNodes: [...prev.transformationNodes, newNode] }));
  };

  const addTargetNode = (position?: NodePosition) => {
    const newNode: DataTarget = {
      id: crypto.randomUUID(),
      name: '',
      storageFormat: '',
      partitioning: '',
      position: position || { x: 650, y: 50 + formState.dataTargets.length * 150 }
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

  const removeTransformationNode = (id: string) => {
    setFormState(prev => ({
      ...prev,
      transformationNodes: prev.transformationNodes.filter(node => node.id !== id),
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

  const handleAutoPipeline = async () => {
    if (!formState.techRequirements.trim()) {
       setErrors(prev => [...prev, "Please enter Technical Requirements first."]);
       return;
    }

    if (formState.techRequirements.length < 10) {
      setErrors(prev => [...prev, "Please provide more descriptive technical requirements (at least 10 characters) for better results."]);
      return;
    }
    
    setIsAutoGenerating(true);
    setErrors([]);

    try {
      const layout = await generatePipelineLayout(formState.techRequirements, formState.existingTools);
      
      // Auto-layout: Calculate vertical offsets to center groups
      const sourceCount = layout.dataSources.length;
      const transformCount = layout.transformationNodes.length;
      const targetCount = layout.dataTargets.length;
      
      const maxCount = Math.max(sourceCount, transformCount, targetCount);
      const verticalSpacing = 180;
      
      const calculateY = (index: number, total: number) => {
        const totalHeight = (total - 1) * verticalSpacing;
        const maxTotalHeight = (maxCount - 1) * verticalSpacing;
        const offset = (maxTotalHeight - totalHeight) / 2;
        return 50 + offset + (index * verticalSpacing);
      };

      const spacedSources = layout.dataSources.map((s, i) => ({
        ...s,
        position: { x: 50, y: calculateY(i, sourceCount) }
      }));

      const spacedTransforms = layout.transformationNodes.map((t, i) => ({
        ...t,
        position: { x: 400, y: calculateY(i, transformCount) }
      }));

      const spacedTargets = layout.dataTargets.map((t, i) => ({
        ...t,
        position: { x: 750, y: calculateY(i, targetCount) }
      }));

      setFormState(prev => ({
        ...prev,
        dataSources: spacedSources,
        transformationNodes: spacedTransforms,
        dataTargets: spacedTargets,
        connections: layout.connections
      }));
      
      // Switch to visual view to show the result
      setViewMode('visual');

    } catch (e: any) {
      console.error(e);
      setErrors(prev => [...prev, `Auto-generation failed: ${e.message}`]);
    } finally {
      setIsAutoGenerating(false);
    }
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
      transformationNodes: [
         { id: 't101', name: 'Consolidate Orders', processingType: 'dbt', description: 'Union tables and filter cancelled orders', position: { x: 400, y: 150 } }
      ],
      dataTargets: [
        { id: '201', name: 'Redshift.orders_historical', storageFormat: 'Native', partitioning: 'By updated_at', position: { x: 750, y: 50 } },
        { id: '202', name: 'S3.backup_orders', storageFormat: 'Parquet', partitioning: 'Year/Month', position: { x: 750, y: 250 } }
      ],
      connections: [
        { id: 'c1', sourceId: '101', targetId: 't101' },
        { id: 'c2', sourceId: '102', targetId: 't101' },
        { id: 'c3', sourceId: 't101', targetId: '201' },
        { id: 'c4', sourceId: 't101', targetId: '202' }
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
    const { dataSources, transformationNodes, dataTargets, connections } = formState;

    // Helper to find node details
    const getNode = (id: string) => 
      dataSources.find(n => n.id === id) || 
      transformationNodes.find(n => n.id === id) || 
      dataTargets.find(n => n.id === id);
    
    const getNodeLabel = (id: string) => {
      const node = getNode(id);
      if (!node) return "Unknown Node";
      if (dataSources.some(n => n.id === id)) return `[Source] ${node.name}`;
      if (transformationNodes.some(n => n.id === id)) return `[Transform] ${node.name}`;
      if (dataTargets.some(n => n.id === id)) return `[Target] ${node.name}`;
      return node.name;
    };

    let context = `CURRENT VISUAL BUILDER STATE:\n`;
    context += `Total Nodes: ${dataSources.length + transformationNodes.length + dataTargets.length}\n`;
    context += `Total Connections: ${connections.length}\n`;

    context += `\n--- NODE CONFIGURATION ---\n`;
    
    if (dataSources.length > 0) {
      context += `\nSOURCES:\n`;
      dataSources.forEach(n => {
        context += `  - "${n.name}" (ID: ${n.id})\n`;
        context += `    Type: ${n.dataType || 'N/A'}, DB: ${n.database || 'N/A'}, Schema: ${n.schema || 'N/A'}\n`;
        context += `    Volume: ${n.volume || 'N/A'}, Frequency: ${n.frequency || 'N/A'}\n`;
        context += `    Position: (x: ${Math.round(n.position?.x || 0)}, y: ${Math.round(n.position?.y || 0)})\n`;
      });
    }
    
    if (transformationNodes.length > 0) {
      context += `\nTRANSFORMATIONS:\n`;
      transformationNodes.forEach(n => {
        context += `  - "${n.name}" (ID: ${n.id})\n`;
        context += `    Engine: ${n.processingType || 'N/A'}\n`;
        context += `    Logic: ${n.description || 'N/A'}\n`;
        context += `    Position: (x: ${Math.round(n.position?.x || 0)}, y: ${Math.round(n.position?.y || 0)})\n`;
      });
    }
    
    if (dataTargets.length > 0) {
      context += `\nTARGETS:\n`;
      dataTargets.forEach(n => {
        context += `  - "${n.name}" (ID: ${n.id})\n`;
        context += `    Format: ${n.storageFormat || 'N/A'}, Partitioning: ${n.partitioning || 'N/A'}\n`;
        context += `    Position: (x: ${Math.round(n.position?.x || 0)}, y: ${Math.round(n.position?.y || 0)})\n`;
      });
    }

    context += `\n--- GRAPH TOPOLOGY (CONNECTIONS) ---\n`;
    if (connections.length === 0) {
      context += "  (No connections defined)\n";
    } else {
      connections.forEach(c => {
        context += `  - ${getNodeLabel(c.sourceId)} (ID: ${c.sourceId}) --> ${getNodeLabel(c.targetId)} (ID: ${c.targetId})\n`;
      });
    }

    // Identify disconnected nodes
    const connectedIds = new Set(connections.flatMap(c => [c.sourceId, c.targetId]));
    const allNodes = [...dataSources, ...transformationNodes, ...dataTargets];
    const disconnected = allNodes.filter(n => !connectedIds.has(n.id));

    if (disconnected.length > 0) {
      context += `\n--- DISCONNECTED NODES (Orphans) ---\n`;
      disconnected.forEach(n => context += `  - ${n.name} (ID: ${n.id})\n`);
    }

    context += `\n--- REQUIREMENTS & ENV ---\n`;
    context += `Tech Requirements: ${formState.techRequirements}\n`;
    context += `Product Requirements: ${formState.productRequirements}\n`;
    context += `Existing Tools: ${formState.existingTools.join(', ')}\n`;

    if (response) {
      context += `\n--- GENERATED SOLUTION ---\n${response}\n`;
    }

    return context;
  };

  const themeOptions: ThemeColor[] = ['indigo', 'violet', 'rose', 'orange', 'teal'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-10 h-10 bg-${theme}-600 rounded-lg flex items-center justify-center shadow-md transition-colors`}>
              <Bot className="text-white w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">DE Architect AI</h1>
              <p className="text-xs text-slate-500 font-medium">Solution Design Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
               <button
                onClick={() => setActiveTab('builder')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'builder'
                    ? `bg-white text-${theme}-600 shadow-sm ring-1 ring-slate-200`
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span className="hidden sm:inline">Builder</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'chat'
                    ? `bg-white text-${theme}-600 shadow-sm ring-1 ring-slate-200`
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </button>
            </div>

             {/* Theme Selector */}
             <div className="relative">
                <button 
                    onClick={() => setIsThemeOpen(!isThemeOpen)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Select Theme"
                >
                    <Palette className="w-5 h-5" />
                </button>
                
                {isThemeOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsThemeOpen(false)} />
                        <div className="absolute right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-20 w-48 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Color Theme</h4>
                            <div className="grid grid-cols-5 gap-2">
                                {themeOptions.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setTheme(t); setIsThemeOpen(false); }}
                                        className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${theme === t ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                                        style={{ backgroundColor: THEME_COLORS[t] }}
                                        title={t.charAt(0).toUpperCase() + t.slice(1)}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <button 
              onClick={fillExample}
              className={`shrink-0 text-sm text-${theme}-600 hover:text-${theme}-800 font-medium hover:underline decoration-${theme}-200 underline-offset-4 transition-colors`}
            >
              <span className="hidden sm:inline">Load Example</span>
              <span className="sm:hidden">Example</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'builder' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-5 space-y-8">
              <section className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-5 h-5 text-${theme}-600`} />
                      <h3 className="text-lg font-semibold text-slate-800">Requirements</h3>
                    </div>
                    <button
                        onClick={handleAutoPipeline}
                        disabled={isAutoGenerating || !formState.techRequirements}
                        className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all
                          ${!formState.techRequirements ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-100' : 
                            `bg-${theme}-50 text-${theme}-700 hover:bg-${theme}-100 border border-${theme}-200`}`}
                        title="Auto-generate pipeline from requirements"
                      >
                        {isAutoGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Auto-Design Pipeline
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Technical Requirement <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        className={`w-full p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-${theme}-500 focus:border-${theme}-500 outline-none transition-all resize-y`}
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
                        className={`w-full p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-${theme}-500 focus:border-${theme}-500 outline-none transition-all resize-y`}
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
                    
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 scale-90 origin-right">
                      <button
                        onClick={() => setViewMode('form')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                          viewMode === 'form'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                        title="List Form View"
                      >
                        <List className="w-3 h-3" />
                        <span className="hidden sm:inline">Form</span>
                      </button>
                      <button
                        onClick={() => setViewMode('visual')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                          viewMode === 'visual'
                            ? `bg-white text-${theme}-600 shadow-sm ring-1 ring-slate-200`
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                        title="Visual Builder View"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span className="hidden sm:inline">Visual</span>
                      </button>
                    </div>
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

                      <TransformationNodeList 
                        nodes={formState.transformationNodes}
                        onChange={(nodes) => handleInputChange('transformationNodes', nodes)}
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
                        transformations={formState.transformationNodes}
                        connections={formState.connections}
                        onUpdateSource={(id, data) => updateSourceNode(id, data)}
                        onUpdateTransformation={(id, data) => updateTransformationNode(id, data)}
                        onUpdateTarget={(id, data) => updateTargetNode(id, data)}
                        onAddSource={addSourceNode}
                        onAddTransformation={addTransformationNode}
                        onAddTarget={addTargetNode}
                        onRemoveSource={removeSourceNode}
                        onRemoveTransformation={removeTransformationNode}
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
                      className={`w-4 h-4 text-${theme}-600 rounded border-slate-300 focus:ring-${theme}-500`}
                    />
                    Generate Architecture Diagram
                  </label>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg shadow-${theme}-200 transition-all flex items-center justify-center gap-3
                    ${loading 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : `bg-${theme}-600 hover:bg-${theme}-700 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]`
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
                        className={`flex items-center gap-2 px-3 py-2 bg-${theme}-50 text-${theme}-700 hover:bg-${theme}-100 rounded-lg transition-colors text-sm font-medium`}
                      >
                          <MessageSquare className="w-4 h-4" />
                          Discuss with AI
                      </button>
                      <div className="h-4 w-px bg-slate-300 mx-1"></div>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className={`p-2 text-slate-400 hover:text-${theme}-600 hover:bg-${theme}-50 rounded-lg transition-all`}
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
        ) : (
          <div className="h-[calc(100vh-8rem)] animate-in fade-in duration-300">
             <ChatModal 
              isPage={true}
              context={getChatContext()} 
            />
          </div>
        )}
      </main>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        context={getChatContext()} 
      />

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;