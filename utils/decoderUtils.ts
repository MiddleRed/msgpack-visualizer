import { InputFormat, ParsedNode, DataType } from '../types';

export const cleanInput = (input: string): string => {
  return input.trim();
};

const hexRe = /^[0-9a-fA-F]+$/;
const base64Re = /^[A-Za-z0-9+/=]+$/;

export const parseHex = (str: string): Uint8Array => {
  // Remove 0x prefix or spaces
  const clean = str.replace(/^0x/, '').replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw new Error("Invalid Hex string length");
  if (!hexRe.test(clean)) throw new Error("Invalid Hex characters");
  
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
};

export const parseBase64 = (str: string): Uint8Array => {
  try {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error("Invalid Base64 string");
  }
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const parsePythonBytes = (str: string): Uint8Array => {
  let content = str.trim();
  
  // Strip wrapping b'...' or b"..."
  if ((content.startsWith("b'") && content.endsWith("'")) || 
      (content.startsWith('b"') && content.endsWith('"'))) {
    content = content.slice(2, -1);
  } else if (content.startsWith("b'") || content.startsWith('b"')) {
      // Maybe the user forgot the closing quote, just strip start
      content = content.slice(2);
  }

  const bytes: number[] = [];
  let i = 0;
  while (i < content.length) {
    const char = content[i];
    
    if (char === '\\') {
      if (i + 1 >= content.length) {
        // Trailing backslash, ignore or push literal?
        bytes.push(92);
        break;
      }
      
      const next = content[i + 1];
      if (next === 'x') {
        // Hex escape \xHH
        if (i + 3 < content.length) {
          const hex = content.substring(i + 2, i + 4);
          if (/^[0-9a-fA-F]{2}$/.test(hex)) {
            bytes.push(parseInt(hex, 16));
            i += 4;
            continue;
          }
        }
        // Fallback if invalid hex, just treat as literal \x
        bytes.push(92); // \
        bytes.push(120); // x
        i += 2;
      } else {
        // Standard escapes
        switch (next) {
          case 'n': bytes.push(10); break;
          case 'r': bytes.push(13); break;
          case 't': bytes.push(9); break;
          case '\\': bytes.push(92); break;
          case '"': bytes.push(34); break;
          case "'": bytes.push(39); break;
          case '0': bytes.push(0); break; // \0 null
          default:
            // Unknown escape, just keep the character literal
            bytes.push(next.charCodeAt(0));
        }
        i += 2;
      }
    } else {
      bytes.push(char.charCodeAt(0));
      i++;
    }
  }
  
  return new Uint8Array(bytes);
};

export const autoDetectAndDecode = (input: string): { bytes: Uint8Array, format: InputFormat } => {
  const clean = input.trim();
  const errors: string[] = [];

  // 1. Try Python Style (High confidence if starts with b')
  if (clean.startsWith("b'") || clean.startsWith('b"')) {
    try {
      return { bytes: parsePythonBytes(clean), format: InputFormat.PYTHON };
    } catch (e) { errors.push("Python: " + e); }
  }

  // 2. Try Hex (High confidence if valid chars and proper length)
  const hexClean = clean.replace(/^0x/, '').replace(/\s+/g, '');
  // Heuristic: If it has only hex chars and length > 2, prefer hex over base64 if ambiguous
  if (hexClean.length > 0 && hexClean.length % 2 === 0 && hexRe.test(hexClean)) {
    // If it's purely numbers, it could be confusing, but for msgpack, usually starts with 8x or 9x or cx or dx
    // Let's assume hex if valid.
    try {
      return { bytes: parseHex(clean), format: InputFormat.HEX };
    } catch (e) { errors.push("Hex: " + e); }
  }

  // 3. Try Base64
  // Base64 regex is loose, but let's try.
  if (clean.length % 4 === 0 && base64Re.test(clean) && !clean.includes(' ')) {
    try {
      return { bytes: parseBase64(clean), format: InputFormat.BASE64 };
    } catch (e) { errors.push("Base64: " + e); }
  }

  // 4. Fallback: If python-like but no b' prefix (e.g. contains \x)
  if (clean.includes('\\x')) {
     try {
      return { bytes: parsePythonBytes(clean), format: InputFormat.PYTHON };
    } catch (e) { errors.push("PythonFallback: " + e); }
  }

  throw new Error("Could not auto-detect format. Please select one manually.");
};

export const serializeNode = (node: ParsedNode): any => {
  switch (node.type) {
    case DataType.MAP:
      const obj: Record<string, any> = {};
      node.children?.forEach(child => {
         let keyStr = "";
         if (typeof child.key === 'string') {
           keyStr = child.key;
         } else if (child.key && typeof child.key === 'object') {
           // Complex key: stringify it
           keyStr = JSON.stringify(serializeNode(child.key as ParsedNode));
         } else {
           keyStr = String(child.key);
         }
         obj[keyStr] = serializeNode(child);
      });
      return obj;
    case DataType.ARRAY:
      return node.children?.map(serializeNode);
    case DataType.BINARY:
      return bytesToBase64(node.value as Uint8Array);
    case DataType.INTEGER:
      if (typeof node.value === 'bigint') {
        return node.value.toString(); // BigInt to string for standard JSON
      }
      return node.value;
    case DataType.EXTENSION:
      return {
        __ext_type: node.meta?.type,
        data: bytesToBase64(node.value as Uint8Array)
      };
    case DataType.NULL: return null;
    case DataType.BOOLEAN: return node.value;
    case DataType.FLOAT: return node.value;
    case DataType.STRING: return node.value;
    default: return node.value;
  }
};
