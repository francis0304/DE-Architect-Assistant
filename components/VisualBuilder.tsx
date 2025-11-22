import React, { useState, useRef, useEffect } from 'react';
import { Database, HardDrive, GripVertical, Trash2, Plus, ZoomIn, ZoomOut, Maximize2, Minimize2, X, RotateCcw, Move, Cog } from 'lucide-react';
import { DataSource, DataTarget, NodePosition, Connection, TransformationNode } from '../types';
import { NodeEditorModal } from './NodeEditorModal';
import { useTheme } from '../context/ThemeContext';

interface VisualBuilderProps {
  sources: DataSource[];
  targets: DataTarget[];
  transformations: TransformationNode[];
  connections: Connection[];
  onUpdateSource: (id: string, data: Partial<DataSource>) => void;
  onUpdateTarget: (id: string, data: Partial<DataTarget>) => void;
  onUpdateTransformation: (id: string, data: Partial<TransformationNode>) => void;
  onAddSource: (position: NodePosition) => void;
  onAddTarget: (position: NodePosition) => void;
  onAddTransformation: (position: NodePosition) => void;
  onRemoveSource: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onRemoveTransformation: (id: string) => void;
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveConnection: (id: string) => void;
}

export const VisualBuilder: React.FC<VisualBuilderProps> = ({
  sources,
  targets,
  transformations,
  connections,
  onUpdateSource,
  onUpdateTarget,
  onUpdateTransformation,
  onAddSource,
  onAddTarget,
  onAddTransformation,
  onRemoveSource,
  onRemoveTarget,
  onRemoveTransformation,
  onAddConnection,
  onRemoveConnection
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme, themeHex } = useTheme();
  
  // Viewport State (Zoom & Pan)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Dragging State (Node)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Connecting State (Wire)
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null); // World Coordinates

  // Editing State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    node: DataSource | DataTarget | TransformationNode | null;
    type: 'source' | 'target' | 'transformation' | null;
  }>({ isOpen: false, node: null, type: null });

  // Assign default positions if missing
  useEffect(() => {
    sources.forEach((s, i) => {
      if (!s.position) {
        onUpdateSource(s.id, { position: { x: 50, y: 50 + i * 150 } });
      }
    });
    transformations.forEach((t, i) => {
      if (!t.position) {
        onUpdateTransformation(t.id, { position: { x: 350, y: 50 + i * 150 } });
      }
    });
    targets.forEach((t, i) => {
      if (!t.position) {
        onUpdateTarget(t.id, { position: { x: 650, y: 50 + i * 150 } });
      }
    });
  }, [sources.length, targets.length, transformations.length]);

  // Helper: Screen to World Coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewport.x) / viewport.zoom,
      y: (screenY - rect.top - viewport.y) / viewport.zoom
    };
  };

  // --- Viewport Logic (Zoom/Pan) ---
  const handleWheel = (e: React.WheelEvent) => {
    // Zoom with wheel
    if (!canvasRef.current) return;
    
    const zoomSensitivity = -0.001;
    const delta = e.deltaY * zoomSensitivity;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * (1 + delta)));
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;
    
    const newX = mouseX - worldX * newZoom;
    const newY = mouseY - worldY * newZoom;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check for middle mouse, or left click (button 0) for panning
    if (e.button === 1 || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleZoomIn = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.min(5, viewport.zoom * 1.2);
    
    // Zoom towards center
    const worldX = (centerX - viewport.x) / viewport.zoom;
    const worldY = (centerY - viewport.y) / viewport.zoom;
    
    const newX = centerX - worldX * newZoom;
    const newY = centerY - worldY * newZoom;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  };

  const handleZoomOut = () => {
     if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.max(0.1, viewport.zoom / 1.2);
    
    const worldX = (centerX - viewport.x) / viewport.zoom;
    const worldY = (centerY - viewport.y) / viewport.zoom;
    
    const newX = centerX - worldX * newZoom;
    const newY = centerY - worldY * newZoom;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  };

  // --- Drag & Drop (Palette) ---
  const handleDragStart = (e: React.DragEvent, type: 'source' | 'target' | 'transformation') => {
    e.dataTransfer.setData('application/react-dnd-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/react-dnd-type') as 'source' | 'target' | 'transformation';
    
    if (!canvasRef.current || !type) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const position = {
      x: Math.max(0, worldPos.x - 100), // Center the node (width 200)
      y: Math.max(0, worldPos.y - 40)  // Center the node (approx height 80)
    };

    if (type === 'source') {
      onAddSource(position);
    } else if (type === 'transformation') {
      onAddTransformation(position);
    } else {
      onAddTarget(position);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // --- Node Dragging ---
  const startNodeDrag = (e: React.MouseEvent, id: string, currentPos?: NodePosition) => {
    if (connectingSourceId) return; // Don't drag node if wiring
    if (e.button !== 0) return;
    
    e.stopPropagation();
    setDraggingId(id);
    hasMovedRef.current = false;
    
    const worldMouse = screenToWorld(e.clientX, e.clientY);
    
    if (currentPos) {
      setDragOffset({
        x: worldMouse.x - currentPos.x,
        y: worldMouse.y - currentPos.y
      });
    }
  };

  // --- Wiring Logic ---
  const startWiring = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingSourceId(id);
    
    // Initial mouse pos (World Coords)
    setMousePos(screenToWorld(e.clientX, e.clientY));
  };

  const endWiring = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (connectingSourceId && connectingSourceId !== targetId) {
      onAddConnection(connectingSourceId, targetId);
    }
    setConnectingSourceId(null);
    setMousePos(null);
  };

  // --- Global Mouse Move & Up ---
  const onMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    // 1. Panning
    if (isPanning) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const worldMouse = screenToWorld(e.clientX, e.clientY);

    // 2. Wiring
    if (connectingSourceId) {
      setMousePos(worldMouse);
      return; 
    }

    // 3. Node Dragging
    if (draggingId) {
      if (!hasMovedRef.current) hasMovedRef.current = true;
      
      const newX = worldMouse.x - dragOffset.x;
      const newY = worldMouse.y - dragOffset.y;

      // Update positions
      const clampedX = Math.max(-500, newX); 
      const clampedY = Math.max(-500, newY);

      const source = sources.find(s => s.id === draggingId);
      if (source) {
          onUpdateSource(source.id, { position: { x: clampedX, y: clampedY } });
          return;
      }
      
      const transform = transformations.find(t => t.id === draggingId);
      if (transform) {
        onUpdateTransformation(transform.id, { position: { x: clampedX, y: clampedY } });
        return;
      }

      const target = targets.find(t => t.id === draggingId);
      if (target) {
          onUpdateTarget(target.id, { position: { x: clampedX, y: clampedY } });
      }
    }
  };

  const onMouseUp = () => {
    setDraggingId(null);
    setConnectingSourceId(null);
    setMousePos(null);
    setIsPanning(false);
  };

  // --- Edit Modal ---
  const openEdit = (node: DataSource | DataTarget | TransformationNode, type: 'source' | 'target' | 'transformation') => {
    if (hasMovedRef.current || connectingSourceId || isPanning) {
        hasMovedRef.current = false;
        return; 
    }
    setEditModal({ isOpen: true, node, type });
  };

  const handleSaveNode = (updatedData: any) => {
    if (editModal.type === 'source') {
      onUpdateSource(editModal.node!.id, updatedData);
    } else if (editModal.type === 'transformation') {
      onUpdateTransformation(editModal.node!.id, updatedData);
    } else {
      onUpdateTarget(editModal.node!.id, updatedData);
    }
  };

  // --- Rendering Helpers ---
  const getNodeCenter = (node: DataSource | DataTarget | TransformationNode) => {
      const w = 200; 
      if (!node.position) return { x: 0, y: 0 };
      // Output is Right Middle
      return { x: node.position.x + w, y: node.position.y + 50 };
  };
  
  const getNodeInputPos = (node: DataSource | DataTarget | TransformationNode) => {
      // Input is Left Middle
      if (!node.position) return { x: 0, y: 0 };
      return { x: node.position.x, y: node.position.y + 50 };
  };

  const findNode = (id: string) => {
    return sources.find(s => s.id === id) || 
           transformations.find(t => t.id === id) || 
           targets.find(t => t.id === id);
  }

  const renderConnections = () => {
    return (
      <svg 
        className="absolute top-0 left-0 overflow-visible pointer-events-none"
        style={{ width: 1, height: 1 }} // Minimal size, content overflows
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={themeHex} />
          </marker>
        </defs>
        
        {/* Existing Connections */}
        {connections.map(conn => {
          const source = findNode(conn.sourceId);
          const target = findNode(conn.targetId); 
          
          if (!source?.position || !target?.position) return null;

          const start = getNodeCenter(source); // Output
          const end = getNodeInputPos(target); // Input

          const controlDist = Math.abs(end.x - start.x) * 0.5 + 50;
          const path = `M ${start.x} ${start.y} C ${start.x + controlDist} ${start.y}, ${end.x - controlDist} ${end.y}, ${end.x} ${end.y}`;

          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;

          return (
            <g key={conn.id} className="group pointer-events-auto">
              <path
                d={path}
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                className={`transition-all duration-300 group-hover:stroke-${theme}-400 group-hover:stroke-[3px]`}
              />
              <path
                 d={path}
                 stroke="transparent"
                 strokeWidth="15"
                 fill="none"
                 style={{ cursor: 'pointer' }}
                 onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.id); }}
              />
               <foreignObject x={midX - 10} y={midY - 10} width="20" height="20" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div 
                    className="w-5 h-5 bg-white rounded-full border border-red-200 flex items-center justify-center text-red-500 shadow-sm cursor-pointer pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                 >
                   <X className="w-3 h-3" />
                 </div>
               </foreignObject>
            </g>
          );
        })}

        {/* Active Drawing Line */}
        {connectingSourceId && mousePos && (
            (() => {
                const source = findNode(connectingSourceId);
                if (!source?.position) return null;
                const start = getNodeCenter(source);
                const end = mousePos;
                
                const controlDist = Math.abs(end.x - start.x) * 0.5;
                const path = `M ${start.x} ${start.y} C ${start.x + controlDist} ${start.y}, ${end.x - controlDist} ${end.y}, ${end.x} ${end.y}`;

                return (
                    <path
                        d={path}
                        stroke={themeHex}
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                        markerEnd="url(#arrowhead-active)"
                    />
                );
            })()
        )}
      </svg>
    );
  };

  return (
    <div className={`flex flex-col bg-slate-50 border-slate-200 overflow-hidden transition-all duration-300 shadow-xl ${
        isExpanded 
        ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0' 
        : 'h-[600px] rounded-xl border relative'
    }`}>
      {/* Toolbar */}
      <div className="bg-white p-2 sm:p-3 border-b border-slate-200 flex items-center justify-between shadow-sm z-20 relative">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Palette</span>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div 
            draggable 
            onDragStart={(e) => handleDragStart(e, 'source')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg cursor-grab active:cursor-grabbing border border-blue-200 transition-colors select-none shrink-0"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Source</span>
          </div>
          <div 
            draggable 
            onDragStart={(e) => handleDragStart(e, 'transformation')}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg cursor-grab active:cursor-grabbing border border-amber-200 transition-colors select-none shrink-0"
          >
            <Cog className="w-4 h-4" />
            <span className="text-sm font-medium">Transform</span>
          </div>
          <div 
            draggable
            onDragStart={(e) => handleDragStart(e, 'target')}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-grab active:cursor-grabbing border border-emerald-200 transition-colors select-none shrink-0"
          >
            <HardDrive className="w-4 h-4" />
            <span className="text-sm font-medium">Target</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                    onClick={handleZoomOut} 
                    className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md transition-colors text-slate-500" 
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-12 text-center text-slate-500 select-none">
                    {Math.round(viewport.zoom * 100)}%
                </span>
                <button 
                    onClick={handleZoomIn} 
                    className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md transition-colors text-slate-500" 
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button 
                    onClick={resetView} 
                    className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md transition-colors text-slate-500" 
                    title="Reset View"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
            </div>

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                    isExpanded 
                    ? `bg-${theme}-600 text-white hover:bg-${theme}-700` 
                    : `text-slate-500 hover:text-${theme}-600 hover:bg-slate-100`
                }`}
                title={isExpanded ? "Close Pop-up" : "Open Pop-up Window"}
            >
                {isExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                ) : (
                    <Maximize2 className="w-4 h-4" />
                )}
            </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseMove={onMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={handleWheel}
        className="flex-1 relative bg-slate-50 overflow-hidden select-none"
        style={{ 
            cursor: isPanning ? 'grabbing' : (connectingSourceId ? 'crosshair' : 'grab'),
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`
        }}
      >
        
        {/* World Transform Container */}
        <div 
            style={{ 
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0
            }}
        >
            {renderConnections()}

            {/* Placeholder Text if empty */}
            {sources.length === 0 && targets.length === 0 && transformations.length === 0 && (
                <div 
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1)' }}
                >
                    <div className="text-center text-slate-300">
                        <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl mx-auto mb-2 flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium">Drag Node from Palette</p>
                        <p className="text-xs mt-2 opacity-75 flex items-center justify-center gap-1">
                            <Move className="w-3 h-3" /> Click + Drag to Pan
                        </p>
                    </div>
                </div>
            )}

            {/* Source Nodes */}
            {sources.map(node => (
                <div
                    key={node.id}
                    className="absolute w-[200px] bg-white rounded-lg shadow-lg border border-blue-200 group hover:border-blue-400 transition-all hover:shadow-xl z-10 hover:z-[500]"
                    style={{ 
                        left: node.position?.x || 0, 
                        top: node.position?.y || 0,
                        cursor: draggingId === node.id ? 'grabbing' : 'grab',
                        zIndex: draggingId === node.id ? 1000 : undefined
                    }}
                    onMouseDown={(e) => startNodeDrag(e, node.id, node.position)}
                    onClick={() => openEdit(node, 'source')}
                >
                    {/* TOOLTIP */}
                    <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-max max-w-[220px] bg-slate-800 text-white text-xs p-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100]">
                        <div className="font-semibold text-blue-200 mb-1">{node.name || 'Untitled Source'}</div>
                        <div className="space-y-0.5 text-slate-300">
                            <p><span className="opacity-60">Type:</span> {node.dataType || 'N/A'}</p>
                            <p><span className="opacity-60">DB:</span> {node.database || 'N/A'}</p>
                            <p><span className="opacity-60">Freq:</span> {node.frequency || 'N/A'}</p>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>

                    <div className="p-3 border-b border-blue-50 bg-blue-50/50 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                            <GripVertical className="w-4 h-4 text-blue-300" />
                            <Database className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Source</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveSource(node.id); }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3">
                        <h4 className="font-medium text-slate-800 text-sm truncate" title={node.name || 'Untitled Source'}>
                            {node.name || 'Untitled Source'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 truncate">{node.database || 'No DB'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{node.frequency || 'Daily'}</p>
                    </div>
                    
                    {/* Output Handle */}
                    <div 
                        className="absolute -right-2 top-[60px] w-4 h-4 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-500 cursor-crosshair transition-colors z-20"
                        onMouseDown={(e) => startWiring(e, node.id)}
                        title="Drag to connect"
                    />
                </div>
            ))}

            {/* Transformation Nodes */}
            {transformations.map(node => (
                <div
                    key={node.id}
                    className="absolute w-[200px] bg-white rounded-lg shadow-lg border border-amber-200 group hover:border-amber-400 transition-all hover:shadow-xl z-10 hover:z-[500]"
                    style={{ 
                        left: node.position?.x || 0, 
                        top: node.position?.y || 0,
                        cursor: draggingId === node.id ? 'grabbing' : 'grab',
                        zIndex: draggingId === node.id ? 1000 : undefined
                    }}
                    onMouseDown={(e) => startNodeDrag(e, node.id, node.position)}
                    onClick={() => openEdit(node, 'transformation')}
                >
                     {/* TOOLTIP */}
                    <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-max max-w-[220px] bg-slate-800 text-white text-xs p-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100]">
                        <div className="font-semibold text-amber-200 mb-1">{node.name || 'Untitled Process'}</div>
                        <div className="space-y-0.5 text-slate-300">
                            <p><span className="opacity-60">Engine:</span> {node.processingType || 'Generic'}</p>
                            {node.description && <p className="italic opacity-80 mt-1 border-t border-slate-700 pt-1 line-clamp-3">{node.description}</p>}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>

                    <div className="p-3 border-b border-amber-50 bg-amber-50/50 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700">
                            <GripVertical className="w-4 h-4 text-amber-300" />
                            <Cog className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Transform</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveTransformation(node.id); }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3">
                        <h4 className="font-medium text-slate-800 text-sm truncate" title={node.name || 'Untitled Process'}>
                            {node.name || 'Untitled Process'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 truncate">{node.processingType || 'Generic'}</p>
                    </div>
                    
                     {/* Input Handle */}
                     <div 
                        className="absolute -left-2 top-[60px] w-4 h-4 bg-white border-2 border-amber-500 rounded-full hover:bg-amber-100 cursor-crosshair transition-colors z-20"
                        onMouseUp={(e) => endWiring(e, node.id)}
                        title="Drop connection here"
                    />

                    {/* Output Handle */}
                    <div 
                        className="absolute -right-2 top-[60px] w-4 h-4 bg-white border-2 border-amber-500 rounded-full hover:bg-amber-500 cursor-crosshair transition-colors z-20"
                        onMouseDown={(e) => startWiring(e, node.id)}
                        title="Drag to connect"
                    />
                </div>
            ))}

            {/* Target Nodes */}
            {targets.map(node => (
                <div
                    key={node.id}
                    className="absolute w-[200px] bg-white rounded-lg shadow-lg border border-emerald-200 group hover:border-emerald-400 transition-all hover:shadow-xl z-10 hover:z-[500]"
                    style={{ 
                        left: node.position?.x || 0, 
                        top: node.position?.y || 0,
                        cursor: draggingId === node.id ? 'grabbing' : 'grab',
                        zIndex: draggingId === node.id ? 1000 : undefined
                    }}
                    onMouseDown={(e) => startNodeDrag(e, node.id, node.position)}
                    onClick={() => openEdit(node, 'target')}
                >
                     {/* TOOLTIP */}
                    <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-max max-w-[220px] bg-slate-800 text-white text-xs p-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100]">
                        <div className="font-semibold text-emerald-200 mb-1">{node.name || 'Untitled Target'}</div>
                        <div className="space-y-0.5 text-slate-300">
                            <p><span className="opacity-60">Format:</span> {node.storageFormat || 'N/A'}</p>
                            <p><span className="opacity-60">Partition:</span> {node.partitioning || 'N/A'}</p>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>

                    <div className="p-3 border-b border-emerald-50 bg-emerald-50/50 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <GripVertical className="w-4 h-4 text-emerald-300" />
                            <HardDrive className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Target</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveTarget(node.id); }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3">
                        <h4 className="font-medium text-slate-800 text-sm truncate" title={node.name || 'Untitled Target'}>
                            {node.name || 'Untitled Target'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 truncate">{node.storageFormat || 'Format N/A'}</p>
                    </div>

                    {/* Input Handle (Left) */}
                    <div 
                        className="absolute -left-2 top-[60px] w-4 h-4 bg-white border-2 border-emerald-500 rounded-full hover:bg-emerald-100 cursor-crosshair transition-colors z-20"
                        onMouseUp={(e) => endWiring(e, node.id)}
                        title="Drop connection here"
                    />

                    {/* Output Handle (Right) - Allows Target to Target connection */}
                    <div 
                        className="absolute -right-2 top-[60px] w-4 h-4 bg-white border-2 border-emerald-500 rounded-full hover:bg-emerald-500 cursor-crosshair transition-colors z-20"
                        onMouseDown={(e) => startWiring(e, node.id)}
                        title="Drag to connect to another target"
                    />
                </div>
            ))}
        </div>
      </div>

      <NodeEditorModal 
        isOpen={editModal.isOpen} 
        onClose={() => setEditModal({ ...editModal, isOpen: false })} 
        node={editModal.node} 
        type={editModal.type}
        onSave={handleSaveNode}
      />
    </div>
  );
};