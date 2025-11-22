import React from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';

interface DynamicListProps {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export const DynamicList: React.FC<DynamicListProps> = ({ title, items, onChange, placeholder }) => {
  const addItem = () => {
    onChange([...items, '']);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <button
              onClick={() => removeItem(index)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      
      <button
        onClick={addItem}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Tool / System
      </button>
    </div>
  );
};