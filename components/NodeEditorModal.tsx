import React, { useState, useEffect } from 'react';
import { X, Database, HardDrive, Save, Cog } from 'lucide-react';
import { DataSource, DataTarget, TransformationNode } from '../types';

interface NodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: DataSource | DataTarget | TransformationNode | null;
  type: 'source' | 'target' | 'transformation' | null;
  onSave: (updatedNode: any) => void;
}

export const NodeEditorModal: React.FC<NodeEditorModalProps> = ({ isOpen, onClose, node, type, onSave }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node });
    }
  }, [node]);

  if (!isOpen || !node || !type) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
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

  const getHeaderIcon = () => {
    if (type === 'source') return <Database className="w-5 h-5" />;
    if (type === 'target') return <HardDrive className="w-5 h-5" />;
    return <Cog className="w-5 h-5" />;
  };

  const getHeaderColorClass = () => {
    if (type === 'source') return 'bg-blue-100 text-blue-600';
    if (type === 'target') return 'bg-emerald-100 text-emerald-600';
    return 'bg-amber-100 text-amber-600';
  };

  const getButtonColorClass = () => {
     if (type === 'source') return 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200';
     if (type === 'target') return 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200';
     return 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getHeaderColorClass()}`}>
              {getHeaderIcon()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                Edit {type === 'source' ? 'Data Source' : type === 'target' ? 'Data Target' : 'Transformation'}
              </h3>
              <p className="text-xs text-slate-500">Configure node properties</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {type === 'source' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name / System</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="e.g. MySQL Prod"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Data Type</label>
                    <input
                      type="text"
                      value={formData.dataType || ''}
                      onChange={(e) => handleChange('dataType', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="Relational, JSON..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Database</label>
                    <input
                      type="text"
                      value={formData.database || ''}
                      onChange={(e) => handleChange('database', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Schema</label>
                    <input
                      type="text"
                      value={formData.schema || ''}
                      onChange={(e) => handleChange('schema', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tables / Fields</label>
                  <input
                    type="text"
                    value={formData.tables || ''}
                    onChange={(e) => handleChange('tables', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="users (id, email), orders..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Volume</label>
                    <input
                      type="text"
                      value={formData.volume || ''}
                      onChange={(e) => handleChange('volume', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="10M rows"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Frequency</label>
                    <select
                      value={formData.frequency || 'Daily'}
                      onChange={(e) => handleChange('frequency', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                       {frequencies.map(freq => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {type === 'target' && (
              <>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name / System</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="e.g. Snowflake, S3"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Storage Format</label>
                    <input
                      type="text"
                      value={formData.storageFormat || ''}
                      onChange={(e) => handleChange('storageFormat', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="Parquet, Iceberg..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Partitioning / Retention</label>
                    <input
                      type="text"
                      value={formData.partitioning || ''}
                      onChange={(e) => handleChange('partitioning', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="By Date, 1 year retention"
                    />
                  </div>
              </>
            )}

            {type === 'transformation' && (
              <>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Step Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      placeholder="e.g. Cleanse Data"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Processing Engine / Type</label>
                    <input
                      type="text"
                      value={formData.processingType || ''}
                      onChange={(e) => handleChange('processingType', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      placeholder="dbt, Spark, SQL..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Logic / Description</label>
                    <textarea
                      rows={3}
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm resize-none"
                      placeholder="Details about the logic applied..."
                    />
                  </div>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all ${getButtonColorClass()}`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};