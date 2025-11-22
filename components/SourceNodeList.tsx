import React from 'react';
import { Plus, Trash2, Database } from 'lucide-react';
import { DataSource } from '../types';

interface SourceNodeListProps {
  nodes: DataSource[];
  onChange: (nodes: DataSource[]) => void;
}

export const SourceNodeList: React.FC<SourceNodeListProps> = ({ nodes, onChange }) => {
  const addNode = () => {
    const newNode: DataSource = {
      id: crypto.randomUUID(),
      name: '',
      database: '',
      schema: '',
      tables: '',
      dataType: '',
      volume: '',
      frequency: 'Daily'
    };
    onChange([...nodes, newNode]);
  };

  const updateNode = (id: string, field: keyof DataSource, value: string) => {
    const newNodes = nodes.map(node => 
      node.id === id ? { ...node, [field]: value } : node
    );
    onChange(newNodes);
  };

  const removeNode = (id: string) => {
    onChange(nodes.filter(node => node.id !== id));
  };

  const frequencies = [
    "Real-time (Streaming)",
    "Near Real-time (Micro-batch)",
    "Hourly",
    "Daily",
    "Weekly",
    "Monthly",
    "Ad-hoc / One-time"
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">Data Sources (Nodes)</h3>
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
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Node {index + 1}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Database Engine Type / Name</label>
                <input
                  type="text"
                  value={node.name}
                  onChange={(e) => updateNode(node.id, 'name', e.target.value)}
                  placeholder="e.g., PostgreSQL, MySQL Prod"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data Type</label>
                <input
                  type="text"
                  value={node.dataType}
                  onChange={(e) => updateNode(node.id, 'dataType', e.target.value)}
                  placeholder="e.g., JSON, CSV, Relational"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Database</label>
                <input
                  type="text"
                  value={node.database}
                  onChange={(e) => updateNode(node.id, 'database', e.target.value)}
                  placeholder="e.g., shop_db"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Schema</label>
                <input
                  type="text"
                  value={node.schema}
                  onChange={(e) => updateNode(node.id, 'schema', e.target.value)}
                  placeholder="e.g., public, raw_data"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tables</label>
                <input
                  type="text"
                  value={node.tables}
                  onChange={(e) => updateNode(node.id, 'tables', e.target.value)}
                  placeholder="e.g., orders (id, amount), users (email)"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              
              {/* Volume and Frequency Split */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data Volume</label>
                <input
                  type="text"
                  value={node.volume}
                  onChange={(e) => updateNode(node.id, 'volume', e.target.value)}
                  placeholder="e.g., 10M rows, 500GB"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ingestion Frequency</label>
                <select
                  value={node.frequency || "Daily"}
                  onChange={(e) => updateNode(node.id, 'frequency', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addNode}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Source Node
      </button>
    </div>
  );
};