
import { DataType, ParsedNode, ParseResult, InputFormat } from '../types';
import { autoDetectAndDecode, parseBase64, parseHex, parsePythonBytes } from '../utils/decoderUtils';

let nodeIdCounter = 0;
const generateId = () => `node-${nodeIdCounter++}`;

class MsgpackParser {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  private readString(length: number): string {
    const end = this.offset + length;
    if (end > this.buffer.length) throw new Error("Unexpected end of input (String)");
    const sub = this.buffer.subarray(this.offset, end);
    this.offset = end;
    return new TextDecoder().decode(sub);
  }

  private readBin(length: number): Uint8Array {
    const end = this.offset + length;
    if (end > this.buffer.length) throw new Error("Unexpected end of input (Binary)");
    const sub = this.buffer.slice(this.offset, end); // Slice to copy
    this.offset = end;
    return sub;
  }

  private getKey(k: ParsedNode): any {
    // Unwrap primitive types for simpler display as keys
    if (
      k.type === DataType.STRING || 
      k.type === DataType.INTEGER || 
      k.type === DataType.BOOLEAN || 
      k.type === DataType.FLOAT || 
      k.type === DataType.NULL
    ) {
      return k.value;
    }
    // Return full node for complex keys (Map/Array/Binary as key)
    return k;
  }

  public parse(key?: any): ParsedNode {
    if (this.offset >= this.buffer.length) {
      throw new Error("Unexpected end of input");
    }

    const byte = this.buffer[this.offset++];
    const node: ParsedNode = {
      id: generateId(),
      type: DataType.UNKNOWN,
      value: null,
      key: key // Key is passed in from parent map context
    };

    // Positive Fixint (0x00 - 0x7f)
    if (byte <= 0x7f) {
      node.type = DataType.INTEGER;
      node.rawType = 'fixint';
      node.value = byte;
      return node;
    }

    // Negative Fixint (0xe0 - 0xff)
    if (byte >= 0xe0) {
      node.type = DataType.INTEGER;
      node.rawType = 'fixint';
      node.value = byte - 0x100;
      return node;
    }

    // FixMap (0x80 - 0x8f)
    if (byte >= 0x80 && byte <= 0x8f) {
      const length = byte & 0x0f;
      node.type = DataType.MAP;
      node.rawType = `map(${length})`;
      node.children = [];
      node.byteLength = length;
      for (let i = 0; i < length; i++) {
        const k = this.parse(undefined); // parse key node
        const keyVal = this.getKey(k);
        const v = this.parse(keyVal);
        node.children.push(v);
      }
      return node;
    }

    // FixArray (0x90 - 0x9f)
    if (byte >= 0x90 && byte <= 0x9f) {
      const length = byte & 0x0f;
      node.type = DataType.ARRAY;
      node.rawType = `arr(${length})`;
      node.children = [];
      node.byteLength = length;
      for (let i = 0; i < length; i++) {
        node.children.push(this.parse(undefined));
      }
      return node;
    }

    // FixStr (0xa0 - 0xbf)
    if (byte >= 0xa0 && byte <= 0xbf) {
      const length = byte & 0x1f;
      node.type = DataType.STRING;
      node.rawType = `str(${length})`;
      node.value = this.readString(length);
      node.byteLength = length;
      return node;
    }

    switch (byte) {
      case 0xc0: // nil
        node.type = DataType.NULL;
        node.rawType = 'nil';
        node.value = null;
        return node;
      case 0xc2: // false
        node.type = DataType.BOOLEAN;
        node.rawType = 'false';
        node.value = false;
        return node;
      case 0xc3: // true
        node.type = DataType.BOOLEAN;
        node.rawType = 'true';
        node.value = true;
        return node;
      
      // Binary
      case 0xc4: // bin 8
        {
          const len = this.view.getUint8(this.offset);
          this.offset += 1;
          node.type = DataType.BINARY;
          node.rawType = `bin8(${len})`;
          node.value = this.readBin(len);
          node.byteLength = len;
          return node;
        }
      case 0xc5: // bin 16
        {
          const len = this.view.getUint16(this.offset, false);
          this.offset += 2;
          node.type = DataType.BINARY;
          node.rawType = `bin16(${len})`;
          node.value = this.readBin(len);
          node.byteLength = len;
          return node;
        }
      case 0xc6: // bin 32
        {
          const len = this.view.getUint32(this.offset, false);
          this.offset += 4;
          node.type = DataType.BINARY;
          node.rawType = `bin32(${len})`;
          node.value = this.readBin(len);
          node.byteLength = len;
          return node;
        }

      // Float
      case 0xca: // float 32
        node.type = DataType.FLOAT;
        node.rawType = 'float(32)';
        node.value = this.view.getFloat32(this.offset, false);
        this.offset += 4;
        return node;
      case 0xcb: // float 64
        node.type = DataType.FLOAT;
        node.rawType = 'float(64)';
        node.value = this.view.getFloat64(this.offset, false);
        this.offset += 8;
        return node;

      // Unsigned Int
      case 0xcc: // uint 8
        node.type = DataType.INTEGER;
        node.rawType = 'uint(8)';
        node.value = this.view.getUint8(this.offset);
        this.offset += 1;
        return node;
      case 0xcd: // uint 16
        node.type = DataType.INTEGER;
        node.rawType = 'uint(16)';
        node.value = this.view.getUint16(this.offset, false);
        this.offset += 2;
        return node;
      case 0xce: // uint 32
        node.type = DataType.INTEGER;
        node.rawType = 'uint(32)';
        node.value = this.view.getUint32(this.offset, false);
        this.offset += 4;
        return node;
      case 0xcf: // uint 64
        node.type = DataType.INTEGER;
        node.rawType = 'uint(64)';
        node.value = this.view.getBigUint64(this.offset, false);
        this.offset += 8;
        return node;

      // Signed Int
      case 0xd0: // int 8
        node.type = DataType.INTEGER;
        node.rawType = 'int(8)';
        node.value = this.view.getInt8(this.offset);
        this.offset += 1;
        return node;
      case 0xd1: // int 16
        node.type = DataType.INTEGER;
        node.rawType = 'int(16)';
        node.value = this.view.getInt16(this.offset, false);
        this.offset += 2;
        return node;
      case 0xd2: // int 32
        node.type = DataType.INTEGER;
        node.rawType = 'int(32)';
        node.value = this.view.getInt32(this.offset, false);
        this.offset += 4;
        return node;
      case 0xd3: // int 64
        node.type = DataType.INTEGER;
        node.rawType = 'int(64)';
        node.value = this.view.getBigInt64(this.offset, false);
        this.offset += 8;
        return node;

      // Extensions (FixExt)
      case 0xd4: // fixext 1
        return this.readExt(1, 'fixext1');
      case 0xd5: // fixext 2
        return this.readExt(2, 'fixext2');
      case 0xd6: // fixext 4
        return this.readExt(4, 'fixext4');
      case 0xd7: // fixext 8
        return this.readExt(8, 'fixext8');
      case 0xd8: // fixext 16
        return this.readExt(16, 'fixext16');
      
      // Extensions (Var)
      case 0xc7: // ext 8
        {
          const len = this.view.getUint8(this.offset);
          this.offset++;
          return this.readExt(len, 'ext8');
        }
      case 0xc8: // ext 16
        {
          const len = this.view.getUint16(this.offset, false);
          this.offset += 2;
          return this.readExt(len, 'ext16');
        }
      case 0xc9: // ext 32
        {
          const len = this.view.getUint32(this.offset, false);
          this.offset += 4;
          return this.readExt(len, 'ext32');
        }

      // Strings
      case 0xd9: // str 8
        {
          const len = this.view.getUint8(this.offset);
          this.offset++;
          node.type = DataType.STRING;
          node.rawType = `str8(${len})`;
          node.value = this.readString(len);
          node.byteLength = len;
          return node;
        }
      case 0xda: // str 16
        {
          const len = this.view.getUint16(this.offset, false);
          this.offset += 2;
          node.type = DataType.STRING;
          node.rawType = `str16(${len})`;
          node.value = this.readString(len);
          node.byteLength = len;
          return node;
        }
      case 0xdb: // str 32
        {
          const len = this.view.getUint32(this.offset, false);
          this.offset += 4;
          node.type = DataType.STRING;
          node.rawType = `str32(${len})`;
          node.value = this.readString(len);
          node.byteLength = len;
          return node;
        }

      // Arrays
      case 0xdc: // array 16
        {
          const len = this.view.getUint16(this.offset, false);
          this.offset += 2;
          node.type = DataType.ARRAY;
          node.rawType = `arr16(${len})`;
          node.children = [];
          node.byteLength = len;
          for (let i = 0; i < len; i++) {
            node.children.push(this.parse(undefined));
          }
          return node;
        }
      case 0xdd: // array 32
        {
          const len = this.view.getUint32(this.offset, false);
          this.offset += 4;
          node.type = DataType.ARRAY;
          node.rawType = `arr32(${len})`;
          node.children = [];
          node.byteLength = len;
          for (let i = 0; i < len; i++) {
            node.children.push(this.parse(undefined));
          }
          return node;
        }

      // Maps
      case 0xde: // map 16
        {
          const len = this.view.getUint16(this.offset, false);
          this.offset += 2;
          node.type = DataType.MAP;
          node.rawType = `map16(${len})`;
          node.children = [];
          node.byteLength = len;
          for (let i = 0; i < len; i++) {
             const k = this.parse(undefined);
             const keyVal = this.getKey(k);
             const v = this.parse(keyVal);
             node.children.push(v);
          }
          return node;
        }
      case 0xdf: // map 32
        {
          const len = this.view.getUint32(this.offset, false);
          this.offset += 4;
          node.type = DataType.MAP;
          node.rawType = `map32(${len})`;
          node.children = [];
          node.byteLength = len;
          for (let i = 0; i < len; i++) {
             const k = this.parse(undefined);
             const keyVal = this.getKey(k);
             const v = this.parse(keyVal);
             node.children.push(v);
          }
          return node;
        }

      default:
        throw new Error(`Unknown byte 0x${byte.toString(16)} at offset ${this.offset - 1}`);
    }
  }

  private readExt(length: number, rawTypeLabel: string): ParsedNode {
    const type = this.view.getInt8(this.offset);
    this.offset++;
    const data = this.readBin(length);
    
    return {
      id: generateId(),
      type: DataType.EXTENSION,
      rawType: rawTypeLabel,
      value: data, // Keep raw bytes as value
      byteLength: length,
      meta: { type } // Extension type (e.g., -1 for timestamp)
    };
  }
}

export const parseMsgpack = (input: string, format: InputFormat): ParseResult => {
  nodeIdCounter = 0;
  try {
    let bytes: Uint8Array;
    let detected = format;

    if (format === InputFormat.AUTO) {
      const res = autoDetectAndDecode(input);
      bytes = res.bytes;
      detected = res.format;
    } else {
      switch (format) {
        case InputFormat.HEX: bytes = parseHex(input); break;
        case InputFormat.BASE64: bytes = parseBase64(input); break;
        case InputFormat.PYTHON: bytes = parsePythonBytes(input); break;
        default: throw new Error("Unknown format");
      }
    }

    if (!bytes || bytes.length === 0) return { success: false, error: "Empty input" };

    const parser = new MsgpackParser(bytes);
    const rootNode = parser.parse();

    return {
      success: true,
      data: rootNode,
      detectedFormat: detected,
      originalBytes: bytes
    };

  } catch (e: any) {
    return {
      success: false,
      error: e.message || "Failed to parse Msgpack",
    };
  }
};
