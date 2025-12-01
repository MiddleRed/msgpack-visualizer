import React from 'react';
import { InputFormat } from '../types';
import { Terminal, FileCode, Hash, Binary } from 'lucide-react';

interface Props {
  input: string;
  setInput: (val: string) => void;
  format: InputFormat;
  setFormat: (val: InputFormat) => void;
  error?: string;
  detectedFormat?: InputFormat;
}

const PythonIcon = ({ size = 14 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
     <path d="M14.075 2.75H9.925C6.375 2.75 6 5.125 6 6.625V8.5h7V9.5H5.125C3.05 9.5 2 10.925 2 13V15.5C2 17.575 3.425 18.5 5.125 18.5h1.375v-1.875C6.5 14.55 7.95 13.5 10.025 13.5h2.475c2.075 0 3-0.925 3-3V6.625C15.5 4.55 16.15 2.75 14.075 2.75zm-4.75 4.125a0.875 0.875 0 1 1 0-1.75 0.875 0.875 0 0 1 0 1.75z" />
     <path d="M9.925 21.25h4.15c3.55 0 3.925-2.375 3.925-3.875V15.5H11v-1h7.875c2.075 0 3.125-1.425 3.125-3.5V8.5c0-2.075-1.425-3-3.125-3H17.5v1.875c0 2.075-1.45 3.125-3.525 3.125H11.5c-2.075 0-3 0.925-3 3v3.875c0 2.075-0.65 3.875 1.425 3.875zm4.75-4.125a0.875 0.875 0 1 1 0 1.75 0.875 0.875 0 0 1 0-1.75z" />
  </svg>
);


export const InputPanel: React.FC<Props> = ({ input, setInput, format, setFormat, error, detectedFormat }) => {
  
  const getPlaceholder = () => {
    switch(format) {
      case InputFormat.HEX: return "Paste Hex string (e.g., 81 a3 6b 65 79 a5 76 61 6c 75 65)";
      case InputFormat.BASE64: return "Paste Base64 string (e.g., gaNrZXqldmFsdWU=)";
      case InputFormat.PYTHON: return "Paste Python bytes (e.g., b'\\x81\\xa3key\\xa5value')";
      default: return "Paste any format. We'll auto-detect it.";
    }
  };

  const formats = [
    { id: InputFormat.AUTO, label: 'Auto', icon: <Terminal size={14} /> },
    { id: InputFormat.HEX, label: 'Hex', icon: <Hash size={14} /> },
    { id: InputFormat.BASE64, label: 'Base64', icon: <FileCode size={14} /> },
    { id: InputFormat.PYTHON, label: 'Python', icon: <PythonIcon size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-850 border-r border-gray-700">
      <div className="h-14 px-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Input</h2>
        
        {/* Format Selector */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {formats.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                format === f.id 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-0 relative group">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-full bg-gray-850 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-600"
          spellCheck={false}
        />
        {input && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setInput('')}
              className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={`p-3 border-t border-gray-700 text-xs font-mono flex items-center justify-between ${error ? 'bg-red-900/20 text-red-400' : 'bg-gray-900 text-gray-400'}`}>
        <div className="flex items-center gap-2">
           {error ? (
             <span>Error: {error}</span>
           ) : (
             <span>
                {input.length > 0 && detectedFormat ? `Detected: ${detectedFormat}` : 'Ready to parse'}
             </span>
           )}
        </div>
        <div>
          {input.length} chars
        </div>
      </div>
    </div>
  );
};