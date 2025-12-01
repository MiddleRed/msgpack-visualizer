import React from 'react';
import { DataType } from '../types';

const colors: Record<DataType, string> = {
  [DataType.NULL]: 'bg-gray-700 text-gray-300',
  [DataType.BOOLEAN]: 'bg-purple-900 text-purple-200 border border-purple-700',
  [DataType.INTEGER]: 'bg-blue-900 text-blue-200 border border-blue-700',
  [DataType.FLOAT]: 'bg-cyan-900 text-cyan-200 border border-cyan-700',
  [DataType.STRING]: 'bg-emerald-900 text-emerald-200 border border-emerald-700',
  [DataType.BINARY]: 'bg-yellow-900 text-yellow-200 border border-yellow-700',
  [DataType.ARRAY]: 'bg-slate-700 text-slate-200 border border-slate-600',
  [DataType.MAP]: 'bg-indigo-900 text-indigo-200 border border-indigo-700',
  [DataType.EXTENSION]: 'bg-pink-900 text-pink-200 border border-pink-700',
  [DataType.UNKNOWN]: 'bg-red-900 text-red-200',
};

const genericLabels: Record<DataType, string> = {
  [DataType.NULL]: 'Nil',
  [DataType.BOOLEAN]: 'Bool',
  [DataType.INTEGER]: 'Int',
  [DataType.FLOAT]: 'Float',
  [DataType.STRING]: 'Str',
  [DataType.BINARY]: 'Bin',
  [DataType.ARRAY]: 'Arr',
  [DataType.MAP]: 'Map',
  [DataType.EXTENSION]: 'Ext',
  [DataType.UNKNOWN]: '?',
};

interface Props {
  type: DataType;
  rawType?: string;
  meta?: any; // For length or extension type
  byteLength?: number;
}

export const TypeBadge: React.FC<Props> = ({ type, rawType, byteLength }) => {
  const colorClass = colors[type];
  
  // Prefer detailed rawType (e.g. "uint8", "map(3)") over generic "Int"
  let label = rawType || genericLabels[type];
  
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded select-none ${colorClass}`}>
      {label}
    </span>
  );
};