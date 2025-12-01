
import React, { useState } from 'react';
import { ParsedNode, DataType } from '../types';
import { TypeBadge } from './TypeBadge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { serializeNode } from '../utils/decoderUtils';

interface Props {
  node: ParsedNode;
  depth?: number;
  isRoot?: boolean;
  showTypes?: boolean;
}

const formatValue = (node: ParsedNode): React.ReactNode => {
  if (node.type === DataType.NULL) return <span className="text-gray-500 italic">null</span>;
  if (node.type === DataType.BOOLEAN) return <span className="text-purple-400 font-bold">{String(node.value)}</span>;
  if (node.type === DataType.INTEGER) return <span className="text-blue-400">{node.value.toString()}</span>;
  if (node.type === DataType.FLOAT) return <span className="text-cyan-400">{node.value}</span>;
  if (node.type === DataType.STRING) return <span className="text-emerald-400 break-all whitespace-pre-wrap">"{node.value}"</span>;
  
  if (node.type === DataType.BINARY) {
    const arr = node.value as Uint8Array;
    // Show first few bytes hex
    const preview = Array.from(arr.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const more = arr.length > 8 ? '...' : '';
    return <span className="text-yellow-400 font-mono break-all">&lt;Bytes: {preview}{more}&gt;</span>;
  }
  
  if (node.type === DataType.EXTENSION) {
      return <span className="text-pink-400">Extension(type={node.value?.type})</span>;
  }

  return null;
};

export const JsonNode: React.FC<Props> = ({ node, depth = 0, isRoot = false, showTypes = true }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const isContainer = node.type === DataType.MAP || node.type === DataType.ARRAY;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const val = serializeNode(node);
      const textToCopy = (typeof val === 'object' && val !== null) 
        ? JSON.stringify(val, null, 2) 
        : String(val);
      
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const renderKey = (key: string | number | boolean | null | ParsedNode | undefined) => {
    if (key === undefined) return null;
    
    // String keys: keep quotes
    if (typeof key === 'string') return <span className="text-orange-400 mr-2">"{key}":</span>;
    
    // Number keys: blue, no quotes
    if (typeof key === 'number') return <span className="text-blue-400 mr-2">{key}:</span>;
    
    // Boolean keys: purple
    if (typeof key === 'boolean') return <span className="text-purple-400 mr-2">{String(key)}:</span>;

    // Null
    if (key === null) return <span className="text-gray-500 mr-2">null:</span>;
    
    // Complex key (ParsedNode or other object)
    if (typeof key === 'object') {
       return <span className="text-orange-300 mr-2 underline decoration-dashed" title="Complex Key">[Key]:</span>;
    }
    
    // Fallback
    return <span className="text-gray-400 mr-2">{String(key)}:</span>;
  };

  return (
    <div className={`font-mono text-sm leading-6 ${isRoot ? '' : 'ml-1'}`}>
      <div 
        className={`flex items-start group hover:bg-gray-800/50 rounded py-0.5 px-1 cursor-default`}
        style={{ paddingLeft: isRoot ? 4 : undefined }}
        onClick={isContainer ? toggleExpand : undefined}
        onMouseLeave={() => setCopied(false)}
      >
        {/* Indent Guide */}
        {!isRoot && <div className="w-4" />}

        {/* Expander Icon */}
        <div className="w-5 h-6 flex items-center justify-center shrink-0 mr-1">
          {isContainer ? (
            <button className="text-gray-500 hover:text-white focus:outline-none">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-3" />
          )}
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-x-2 break-all">
          {/* Key */}
          {node.key !== undefined && renderKey(node.key)}

          {/* Type Badge */}
          {showTypes && (
            <TypeBadge type={node.type} byteLength={node.byteLength} rawType={node.rawType} />
          )}

          {/* Value Preview (if not expanded container) */}
          {!isContainer && (
             <div className="break-all">{formatValue(node)}</div>
          )}

          {isContainer && !expanded && (
            <span className="text-gray-500 text-xs">
              {node.type === DataType.ARRAY ? '[...]' : '{...}'}
            </span>
          )}

          {/* Copy Button */}
          <span 
            onClick={handleCopy}
            className="ml-2 text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer hidden group-hover:inline-block select-none transition-colors"
            title="Copy value"
          >
            {copied ? <span className="text-emerald-400 font-bold">√</span> : "copy"}
          </span>
        </div>
      </div>

      {/* Children */}
      {isContainer && expanded && node.children && (
        <div className="border-l border-gray-700 ml-[1.1rem]">
          {node.children.map((child) => (
            <JsonNode key={child.id} node={child} depth={0} showTypes={showTypes} /> 
          ))}
        </div>
      )}
    </div>
  );
};
