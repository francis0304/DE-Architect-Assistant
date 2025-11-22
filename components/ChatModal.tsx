import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Settings2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { getChatStream } from '../services/geminiService';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: string;
}

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Reasoning)' },
];

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, context }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = getChatStream(selectedModel, messages, input, context);
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === 'model') {
                lastMsg.text = fullResponse;
            }
            return newMessages;
        });
      }
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      {/* Modal Window */}
      <div className="bg-white w-full sm:w-[600px] h-[80vh] sm:h-[700px] shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto transform transition-all animate-in slide-in-from-bottom-4 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">Architect Chat</h3>
                <p className="text-xs text-slate-500">Discussing your solution</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="appearance-none pl-8 pr-4 py-1.5 text-xs font-medium border border-slate-300 rounded-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-50"
                >
                    {MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
                <Settings2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 px-6">
                    <Bot className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Ask me anything about the generated architecture, implementation details, or alternative options.</p>
                </div>
            )}
            
            {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-100'}`}>
                        {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600" /> : <Bot className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-tr-sm' 
                        : 'bg-indigo-600 text-white rounded-tl-sm'
                    }`}>
                        {msg.role === 'user' ? (
                            msg.text
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200 rounded-b-2xl">
            <div className="flex gap-2 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    disabled={isLoading}
                    autoFocus
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};