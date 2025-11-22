import React, { useState, useRef, useEffect } from 'react';
import { Database, HardDrive, GripVertical, Trash2, Plus, ZoomIn, Maximize2, Minimize2, X } from 'lucide-react';
import { DataSource, DataTarget, NodePosition, Connection } from '../types';
import { NodeEditorModal } from './NodeEditorModal';

interface VisualBuilderProps {
  sources: DataSource[];
  targets: DataTarget[];
  connections: Connection[];
  onUpdateSource: (id: string, data: Partial<DataSource>) => void;
  onUpdateTarget: (id: string, data: Partial<DataTarget>) => void;
  onAddSource: (position: NodePosition) => void;
  onAddTarget: (position: NodePosition) => void;
  onRemoveSource: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveConnection: (id: string) => void;
}

export const VisualBuilder: React.FC<VisualBuilderProps> = ({
  sources,
  targets,
  connections,
  onUpdateSource,
  onUpdateTarget,
  onAddSource,
  onAddTarget,
  onRemoveSource,
  onRemoveTarget,
  onAddConnection,
  onRemoveConnection
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Dragging State (Node)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Connecting State (Wire)
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Editing State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    node: DataSource | DataTarget | null;
    type: 'source' | 'target' | null;
  }>({ isOpen: false, node: null, type: null });

  // Assign default positions if missing
  useEffect(() => {
    sources.forEach((s, i) => {
      if (!s.position) {
        onUpdateSource(s.id, { position: { x: 50, y: 50 + i * 150 } });
      }
    });
    targets.forEach((t, i) => {
      if (!t.position) {
        onUpdateTarget(t.id, { position: { x: 450, y: 50 + i * 150 } });
      }
    });
  }, [sources.length, targets.length]);

  // --- Node Drag Logic ---
  const handleDragStart = (e: React.DragEvent, type: 'source' | 'target') => {
    e.dataTransfer.setData('application/react-dnd-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/react-dnd-type') as 'source' | 'target';
    
    if (!canvasRef.current || !type) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left - 100, 
      y: e.clientY - rect.top - 40
    };

    // Clamp to positive coordinates
    position.x = Math.max(0, position.x);
    position.y = Math.max(0, position.y);

    if (type === 'source') {
      onAddSource(position);
    } else {
      onAddTarget(position);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const startNodeDrag = (e: React.MouseEvent, id: string, currentPos?: NodePosition) => {
    if (connectingSourceId) return; // Don't drag node if wiring
    e.stopPropagation();
    setDraggingId(id);
    hasMovedRef.current = false;
    if (currentPos) {
      setDragOffset({
        x: e.clientX - currentPos.x,
        y: e.clientY - currentPos.y
      });
    }
  };

  // --- Wiring Logic ---
  const startWiring = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingSourceId(id);
    
    // Initial mouse pos relative to canvas
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
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
    const rect = canvasRef.current.getBoundingClientRect();

    // Handle Wiring
    if (connectingSourceId) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      return; 
    }

    // Handle Node Dragging
    if (draggingId) {
      if (!hasMovedRef.current) hasMovedRef.current = true;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      const source = sources.find(s => s.id === draggingId);
      if (source) {
          // Allow dragging further if expanded
          const maxX = isExpanded ? rect.width - 200 : rect.width - 200;
          const maxY = isExpanded ? rect.height - 80 : rect.height - 80;
          
          const clampedX = Math.max(0, Math.min(newX, maxX));
          const clampedY = Math.max(0, Math.min(newY, maxY));
          onUpdateSource(source.id, { position: { x: clampedX, y: clampedY } });
          return;
      }

      const target = targets.find(t => t.id === draggingId);
      if (target) {
           const maxX = isExpanded ? rect.width - 200 : rect.width - 200;
           const maxY = isExpanded ? rect.height - 80 : rect.height - 80;
           
           const clampedX = Math.max(0, Math.min(newX, maxX));
           const clampedY = Math.max(0, Math.min(newY, maxY));
          onUpdateTarget(target.id, { position: { x: clampedX, y: clampedY } });
      }
    }
  };

  const onMouseUp = () => {
    setDraggingId(null);
    setConnectingSourceId(null);
    setMousePos(null);
  };

  // --- Edit Modal ---
  const openEdit = (node: DataSource | DataTarget, type: 'source' | 'target') => {
    if (hasMovedRef.current || connectingSourceId) {
        hasMovedRef.current = false;
        return; 
    }
    setEditModal({ isOpen: true, node, type });
  };

  const handleSaveNode = (updatedData: any) => {
    if (editModal.type === 'source') {
      onUpdateSource(editModal.node!.id, updatedData);
    } else {
      onUpdateTarget(editModal.node!.id, updatedData);
    }
  };

  // --- Rendering Helpers ---
  const getNodeCenter = (node: DataSource | DataTarget) => {
      const w = 200; 
      if (!node.position) return { x: 0, y: 0 };
      // Output is Right Middle
      return { x: node.position.x + w, y: node.position.y + 50 };
  };
  
  const getNodeInputPos = (node: DataSource | DataTarget) => {
      // Input is Left Middle
      if (!node.position) return { x: 0, y: 0 };
      return { x: node.position.x, y: node.position.y + 50 };
  };

  const renderConnections = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
        </defs>
        
        {/* Existing Connections */}
        {connections.map(conn => {
          // Source can be a DataSource OR a DataTarget (for chaining)
          const source = sources.find(s => s.id === conn.sourceId) || targets.find(t => t.id === conn.sourceId);
          const target = targets.find(t => t.id === conn.targetId); 
          
          if (!source?.position || !target?.position) return null;

          const start = getNodeCenter(source); // Output
          const end = getNodeInputPos(target); // Input

          const controlDist = Math.abs(end.x - start.x) * 0.5 + 50;
          const path = `M ${start.x} ${start.y} C ${start.x + controlDist} ${start.y}, ${end.x - controlDist} ${end.y}, ${end.x} ${end.y}`;

          // Calculate center for delete button
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;

          return (
            <g key={conn.id} className="group">
              <path
                d={path}
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300 group-hover:stroke-indigo-400 group-hover:stroke-[3px]"
              />
              {/* Clickable invisible path for easier selection */}
              <path
                 d={path}
                 stroke="transparent"
                 strokeWidth="15"
                 fill="none"
                 style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                 onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.id); }}
              />
               <foreignObject x={midX - 10} y={midY - 10} width="20" height="20" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="w-5 h-5 bg-white rounded-full border border-red-200 flex items-center justify-center text-red-500 shadow-sm cursor-pointer">
                   <X className="w-3 h-3" />
                 </div>
               </foreignObject>
            </g>
          );
        })}

        {/* Active Drawing Line */}
        {connectingSourceId && mousePos && (
            (() => {
                const source = sources.find(s => s.id === connectingSourceId) || targets.find(t => t.id === connectingSourceId);
                if (!source?.position) return null;
                const start = getNodeCenter(source);
                const end = mousePos;
                
                // Simple curve to mouse
                const controlDist = Math.abs(end.x - start.x) * 0.5;
                const path = `M ${start.x} ${start.y} C ${start.x + controlDist} ${start.y}, ${end.x - controlDist} ${end.y}, ${end.x} ${end.y}`;

                return (
                    <path
                        d={path}
                        stroke="#6366f1"
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
        ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0' 
        : 'h-[600px] rounded-xl border relative'
    }`}>
      {/* Toolbar */}
      <div className="bg-white p-3 border-b border-slate-200 flex items-center justify-between shadow-sm z-20 relative">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Palette</span>
          <div className="h-6 w-px bg-slate-200"></div>
          <div 
            draggable 
            onDragStart={(e) => handleDragStart(e, 'source')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg cursor-grab active:cursor-grabbing border border-blue-200 transition-colors select-none"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Source</span>
          </div>
          <div 
            draggable
            onDragStart={(e) => handleDragStart(e, 'target')}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-grab active:cursor-grabbing border border-emerald-200 transition-colors select-none"
          >
            <HardDrive className="w-4 h-4" />
            <span className="text-sm font-medium">Target</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2 mr-2">
                <ZoomIn className="w-3 h-3" />
                <span>Drag to move, Drag dot to connect</span>
            </div>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                    isExpanded 
                    ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                    : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                }`}
                title={isExpanded ? "Close Pop-up" : "Open Pop-up Window"}
            >
                {isExpanded ? (
                    <>
                        <Minimize2 className="w-4 h-4" />
                        <span>Close Pop-up</span>
                    </>
                ) : (
                    <>
                        <Maximize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Pop-up Mode</span>
                    </>
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
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="flex-1 relative bg-slate-50 overflow-hidden select-none"
        style={{ 
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
            backgroundSize: '20px 20px',
            cursor: connectingSourceId ? 'crosshair' : 'default'
        }}
      >
        
        {renderConnections()}

        {/* Placeholder Text if empty */}
        {sources.length === 0 && targets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-slate-300">
                    <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl mx-auto mb-2 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium">Drag Source or Target here</p>
                </div>
            </div>
        )}

        {/* Source Nodes */}
        {sources.map(node => (
            <div
                key={node.id}
                className="absolute w-[200px] bg-white rounded-lg shadow-lg border border-blue-200 group hover:border-blue-400 transition-all hover:shadow-xl"
                style={{ 
                    left: node.position?.x || 0, 
                    top: node.position?.y || 0,
                    cursor: draggingId === node.id ? 'grabbing' : 'grab',
                    zIndex: draggingId === node.id ? 50 : 10
                }}
                onMouseDown={(e) => startNodeDrag(e, node.id, node.position)}
                onClick={() => openEdit(node, 'source')}
            >
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

        {/* Target Nodes */}
        {targets.map(node => (
            <div
                key={node.id}
                className="absolute w-[200px] bg-white rounded-lg shadow-lg border border-emerald-200 group hover:border-emerald-400 transition-all hover:shadow-xl"
                style={{ 
                    left: node.position?.x || 0, 
                    top: node.position?.y || 0,
                    cursor: draggingId === node.id ? 'grabbing' : 'grab',
                    zIndex: draggingId === node.id ? 50 : 10
                }}
                onMouseDown={(e) => startNodeDrag(e, node.id, node.position)}
                onClick={() => openEdit(node, 'target')}
            >
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