
export enum InputFormat {
  AUTO = 'AUTO',
  HEX = 'HEX',
  BASE64 = 'BASE64',
  PYTHON = 'PYTHON'
}

export enum DataType {
  NULL = 'Null',
  BOOLEAN = 'Boolean',
  INTEGER = 'Integer',
  FLOAT = 'Float',
  STRING = 'String',
  BINARY = 'Binary',
  ARRAY = 'Array',
  MAP = 'Map',
  EXTENSION = 'Extension',
  UNKNOWN = 'Unknown'
}

export interface ParsedNode {
  id: string;
  // Key can be primitive types (rendered directly) or complex types (rendered as [Object])
  key?: string | number | boolean | null | ParsedNode; 
  value: any;
  type: DataType;
  rawType?: string; // e.g. "int8", "fixstr" (if available/inferred)
  children?: ParsedNode[]; // For Arrays and Maps
  byteLength?: number; // For binary/strings
  meta?: any;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedNode;
  error?: string;
  detectedFormat?: InputFormat;
  originalBytes?: Uint8Array;
}
