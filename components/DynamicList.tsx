import React, { useState } from 'react';
import { Plus, Trash2, Wrench, Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DynamicListProps {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export const DynamicList: React.FC<DynamicListProps> = ({ title, items, onChange, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();

  const addItem = () => {
    setSearchTerm('');
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

  const filteredItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wrench className={`w-5 h-5 text-${theme}-600`} />
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
        
        {items.length > 0 && (
          <div className="relative group">
            <Search className={`w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-${theme}-500 transition-colors`} />
            <input 
              type="text" 
              placeholder="Search tools..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-${theme}-500 focus:border-${theme}-500 outline-none w-full sm:w-48 transition-all placeholder:text-slate-400 text-slate-700`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(({ item, index }) => (
            <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={placeholder}
                className={`flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-${theme}-500 focus:border-${theme}-500 outline-none transition-all text-slate-800`}
              />
              <button
                onClick={() => removeItem(index)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        ) : (
          items.length > 0 ? (
             <div className="text-center py-6 text-slate-500 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No tools found matching "{searchTerm}"
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                No tools added yet. Add existing systems here.
            </div>
          )
        )}
      </div>
      
      <button
        onClick={addItem}
        className={`mt-4 flex items-center gap-2 text-sm font-medium text-${theme}-600 hover:text-${theme}-700 px-3 py-2 rounded-lg hover:bg-${theme}-50 transition-colors w-fit`}
      >
        <Plus className="w-4 h-4" />
        Add Tool / System
      </button>
    </div>
  );
};
