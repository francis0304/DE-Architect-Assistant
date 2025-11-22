import React from 'react';
import { Plus, Trash2, HardDrive } from 'lucide-react';
import { DataTarget } from '../types';

interface TargetNodeListProps {
  nodes: DataTarget[];
  onChange: (nodes: DataTarget[]) => void;
}

export const TargetNodeList: React.FC<TargetNodeListProps> = ({ nodes, onChange }) => {
  const addNode = () => {
    const newNode: DataTarget = {
      id: crypto.randomUUID(),
      name: '',
      storageFormat: '',
      partitioning: ''
    };
    onChange([...nodes, newNode]);
  };

  const updateNode = (id: string, field: keyof DataTarget, value: string) => {
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
        <HardDrive className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-slate-800">Data Targets</h3>
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
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Target {index + 1}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Name / System</label>
                <input
                  type="text"
                  value={node.name}
                  onChange={(e) => updateNode(node.id, 'name', e.target.value)}
                  placeholder="e.g., Redshift (History), S3 (Lake)"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Storage Format</label>
                <input
                  type="text"
                  value={node.storageFormat}
                  onChange={(e) => updateNode(node.id, 'storageFormat', e.target.value)}
                  placeholder="e.g., Parquet, Iceberg, CSV"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Partitioning / Retention</label>
                <input
                  type="text"
                  value={node.partitioning}
                  onChange={(e) => updateNode(node.id, 'partitioning', e.target.value)}
                  placeholder="e.g., By Day, 90 Days Retention"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addNode}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Target Node
      </button>
    </div>
  );
};