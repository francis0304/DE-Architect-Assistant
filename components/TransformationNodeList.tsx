import React from 'react';
import { Plus, Trash2, Cog } from 'lucide-react';
import { TransformationNode } from '../types';

interface TransformationNodeListProps {
  nodes: TransformationNode[];
  onChange: (nodes: TransformationNode[]) => void;
}

export const TransformationNodeList: React.FC<TransformationNodeListProps> = ({ nodes, onChange }) => {
  const addNode = () => {
    const newNode: TransformationNode = {
      id: crypto.randomUUID(),
      name: '',
      processingType: '',
      description: ''
    };
    onChange([...nodes, newNode]);
  };

  const updateNode = (id: string, field: keyof TransformationNode, value: string) => {
    const newNodes = nodes.map(node => 
      node.id === id ? { ...node, [field]: value } : node
    );
    onChange(newNodes);
  };

  const removeNode = (id: string) => {
    onChange(nodes.filter(node => node.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Cog className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-slate-800">Transformation & Logic</h3>
      </div>

      <div className="space-y-6">
        {nodes.map((node, index) => (
          <div key={node.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50 relative group">
             <div className="absolute top-4 right-4">
                <button
                  onClick={() => removeNode(node.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove Node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Process {index + 1}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name / Step Name</label>
                <input
                  type="text"
                  value={node.name}
                  onChange={(e) => updateNode(node.id, 'name', e.target.value)}
                  placeholder="e.g., Clean Data, Join Orders"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Processing Engine / Type</label>
                <input
                  type="text"
                  value={node.processingType}
                  onChange={(e) => updateNode(node.id, 'processingType', e.target.value)}
                  placeholder="e.g., dbt, Spark, Glue, SQL"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Description / Logic</label>
                <input
                  type="text"
                  value={node.description}
                  onChange={(e) => updateNode(node.id, 'description', e.target.value)}
                  placeholder="e.g., Filter invalid emails, Join with customer dimension table"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addNode}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Transformation
      </button>
    </div>
  );
};