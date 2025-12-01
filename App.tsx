
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InputPanel } from './components/InputPanel';
import { JsonNode } from './components/JsonNode';
import { parseMsgpack } from './services/msgpackService';
import { InputFormat, ParsedNode } from './types';
import { Box, Braces, Code, Check, Copy, Github, Tag } from 'lucide-react';
import { serializeNode } from './utils/decoderUtils';

const App: React.FC = () => {
  const [input, setInput] = useState<string>("b'\\x81\\xa3key\\xa5value'");
  const [format, setFormat] = useState<InputFormat>(InputFormat.AUTO);
  const [parsedData, setParsedData] = useState<ParsedNode | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [detected, setDetected] = useState<InputFormat | undefined>(undefined);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'tree' | 'raw'>('tree');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isResizing, setIsResizing] = useState(false);
  const [showTypes, setShowTypes] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Debounce parsing logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!input.trim()) {
        setParsedData(null);
        setError(undefined);
        setDetected(undefined);
        return;
      }

      const result = parseMsgpack(input, format);
      if (result.success && result.data) {
        setParsedData(result.data);
        setError(undefined);
        setDetected(result.detectedFormat);
      } else {
        setError(result.error);
        setParsedData(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input, format]);

  // Resizing Logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newRatio = (e.clientX - containerRect.left) / containerRect.width;
        if (newRatio > 0.2 && newRatio < 0.8) {
          setSplitRatio(newRatio);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const rawJsonString = useMemo(() => {
    if (!parsedData) return "";
    try {
      const obj = serializeNode(parsedData);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return "Error generating JSON view: " + e;
    }
  }, [parsedData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Box size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-gray-100">
            Msgpack<span className="text-blue-500">Visualizer</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/MiddleRed/msgpack-visualizer" className="text-gray-400 hover:text-white transition-colors">
            <Github size={20} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main ref={containerRef} className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: Input */}
        <div style={{ width: `${splitRatio * 100}%` }} className="flex flex-col min-w-[200px]">
          <InputPanel 
            input={input} 
            setInput={setInput} 
            format={format} 
            setFormat={setFormat}
            error={error}
            detectedFormat={detected}
          />
        </div>

        {/* Resizer */}
        <div 
          onMouseDown={startResizing}
          className={`w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize z-20 flex items-center justify-center transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
        >
          <div className="h-4 w-0.5 bg-gray-600 rounded-full" />
        </div>

        {/* Right Panel: Viewer */}
        <div className="flex-1 flex flex-col bg-gray-950 min-w-[200px] border-l border-gray-800">
           {/* Output Tabs & Header */}
           <div className="h-14 px-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex bg-gray-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('tree')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'tree' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Braces size={14} />
                    Tree View
                  </button>
                  <button 
                    onClick={() => setActiveTab('raw')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'raw' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Code size={14} />
                    Raw JSON
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 {/* Type Toggle */}
                 {activeTab === 'tree' && (
                    <button
                      onClick={() => setShowTypes(!showTypes)}
                      title="Toggle Type Hints"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all border ${
                        showTypes 
                          ? 'bg-blue-900/30 text-blue-200 border-blue-800' 
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      <Tag size={14} />
                      <span className="hidden sm:inline">Types</span>
                    </button>
                 )}

                 {parsedData && (
                  <span className="text-xs text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/30">
                    Valid Msgpack
                  </span>
                 )}
              </div>
           </div>
           
           <div className="flex-1 overflow-auto relative custom-scrollbar bg-gray-950">
             {parsedData ? (
               activeTab === 'tree' ? (
                  <div className="p-4 min-w-fit">
                    <JsonNode node={parsedData} isRoot={true} showTypes={showTypes} />
                  </div>
               ) : (
                  <div className="p-0 h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-auto">
                      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-all">
                        {rawJsonString}
                      </pre>
                    </div>
                    {/* Floating Copy Button */}
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-all"
                      >
                         {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                         {copied ? "Copied" : "Copy JSON"}
                      </button>
                    </div>
                  </div>
               )
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                 {error ? (
                    <div className="text-center p-6 max-w-sm">
                       <p className="text-red-400 mb-2 font-semibold">Parsing Failed</p>
                       <p className="text-sm text-gray-500 font-mono bg-gray-900 p-2 rounded border border-gray-800 break-words">{error}</p>
                    </div>
                 ) : (
                    <>
                      <Box size={48} strokeWidth={1} className="opacity-20" />
                      <p className="text-sm">Waiting for valid input...</p>
                    </>
                 )}
               </div>
             )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
