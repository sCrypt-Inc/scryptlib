import { Argument, arrayTypeAndSize, bin2num, isArrayType, LibraryEntity, ParamEntity, StructEntity, SymbolType, TypeResolver } from '.';
import { Bool, Bytes, Int, OpCodeType, PrivKey, PubKey, Ripemd160, ScryptType, Sha1, Sha256, Sig, SigHashPreimage, SigHashType, StructObject, SupportedParamType } from './scryptTypes';
import Stateful from './stateful';
import { bsv } from './utils';

/**
 * little-endian signed magnitude to int
 */
export function hex2int(hex: string): bigint {

  if (hex === '00') {
    return Int(0);
  } else if (hex === '4f') {
    return Int(-1);
  } else {
    const b = bsv.Script.fromHex(hex);
    const chuck = b.chunks[0];

    if (chuck.opcodenum >= 81 && chuck.opcodenum <= 96) {
      return BigInt(chuck.opcodenum - 80);
    }
    return bin2num(chuck.buf.toString('hex'));
  }
}


export function hex2bool(hex: string): boolean {
  if (hex === '51') {
    return true;
  } else if (hex === '00') {
    return false;
  }
  throw new Error(`invalid hex ${hex}`);
}


export function hex2bytes(hex: string): Bytes {
  if (hex === '00') {
    return '';
  }

  const s = bsv.Script.fromHex(hex);
  const chuck = s.chunks[0];

  if (chuck.opcodenum >= 81 && chuck.opcodenum <= 96) {
    return Buffer.from([chuck.opcodenum - 80]).toString('hex');
  }

  return chuck.buf.toString('hex');
}

export function deserializer(type: string, hex: string): SupportedParamType {

  switch (type) {
    case ScryptType.BOOL:
      return Bool(hex2bool(hex));
    case ScryptType.INT:
      return Int(hex2int(hex));
    case ScryptType.BYTES:
      return Bytes(hex2bytes(hex));
    case ScryptType.PRIVKEY:
      return PrivKey(hex2int(hex));
    case ScryptType.PUBKEY:
      return PubKey(hex2bytes(hex));
    case ScryptType.SIG:
      return Sig(hex2bytes(hex));
    case ScryptType.RIPEMD160:
      return Ripemd160(hex2bytes(hex));
    case ScryptType.SHA1:
      return Sha1(hex2bytes(hex));
    case ScryptType.SHA256:
      return Sha256(hex2bytes(hex));
    case ScryptType.SIGHASHTYPE:
      return SigHashType(Number(hex2int(hex)));
    case ScryptType.SIGHASHPREIMAGE:
      return SigHashPreimage(hex2bytes(hex));
    case ScryptType.OPCODETYPE:
      return OpCodeType(hex2bytes(hex));
    default:
      throw new Error(`<${type}> cannot be cast to ScryptType, only sCrypt native types supported`);
  }

}

export type DeserializeOption = {
  state: boolean
}


export function createStruct(resolver: TypeResolver, param: ParamEntity, opcodesMap: Map<string, string>, options: DeserializeOption): StructObject {

  const structTypeInfo = resolver(param.type);
  const entity = structTypeInfo.info as StructEntity;

  const obj = Object.create({});
  entity.params.forEach(p => {

    const typeInfo = resolver(p.type);

    if (isArrayType(typeInfo.finalType)) {

      Object.assign(obj, {
        [p.name]: createArray(resolver, typeInfo.finalType, `${param.name}.${p.name}`, opcodesMap, options)
      });

    } else if (typeInfo.symbolType === SymbolType.Struct) {

      Object.assign(obj, {
        [p.name]: createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options)
      });

    } else if (typeInfo.symbolType === SymbolType.Library) {

      Object.assign(obj, {
        [p.name]: createLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options)
      });

    } else {

      if (options.state) {
        Object.assign(obj, {
          [p.name]: Stateful.deserializer(typeInfo.finalType, opcodesMap.get(`<${param.name}.${p.name}>`))
        });
      } else {
        Object.assign(obj, {
          [p.name]: deserializer(typeInfo.finalType, opcodesMap.get(`<${param.name}.${p.name}>`))
        });
      }
    }

  });


  return obj;
}



export function createLibrary(resolver: TypeResolver, param: ParamEntity, opcodesMap: Map<string, string>, options: DeserializeOption): Array<SupportedParamType> | Record<string, SupportedParamType> {
  const libraryTypeInfo = resolver(param.type);
  const entity = libraryTypeInfo.info as LibraryEntity;

  if (options.state) {
    const properties: Record<string, SupportedParamType> = {};

    entity.properties.forEach(p => {

      const typeInfo = resolver(p.type);

      if (isArrayType(typeInfo.finalType)) {

        Object.assign(properties, {
          [p.name]: createArray(resolver, p.type, `${param.name}.${p.name}`, opcodesMap, options)
        });

      } else if (typeInfo.symbolType === SymbolType.Struct) {

        Object.assign(properties, {
          [p.name]: createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options)
        });

      } else if (typeInfo.symbolType === SymbolType.Library) {

        Object.assign(properties, {
          [p.name]: createLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options)
        });

      } else {
        Object.assign(properties, {
          [p.name]: Stateful.deserializer(typeInfo.finalType, opcodesMap.get(`<${param.name}.${p.name}>`))
        });
      }
    });

    return properties;
  } else {
    return entity.params.map(p => {

      const typeInfo = resolver(p.type);

      if (isArrayType(typeInfo.finalType)) {

        return createArray(resolver, typeInfo.finalType, `${param.name}.${p.name}`, opcodesMap, options);

      } else if (typeInfo.symbolType === SymbolType.Struct) {

        return createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options);

      } else if (typeInfo.symbolType === SymbolType.Library) {

        return createLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap, options);

      } else {
        return deserializer(typeInfo.finalType, opcodesMap.get(`<${param.name}.${p.name}>`));
      }
    });
  }

}






export function createArray(resolver: TypeResolver, type: string, name: string, opcodesMap: Map<string, string>, options: DeserializeOption): SupportedParamType {

  const arrays: SupportedParamType[] = [];
  const [elemTypeName, sizes] = arrayTypeAndSize(type);

  const arraylen = sizes[0];
  if (sizes.length === 1) {
    for (let index = 0; index < arraylen; index++) {
      const typeInfo = resolver(elemTypeName);

      if (typeInfo.symbolType === SymbolType.Struct) {
        arrays.push(createStruct(resolver, {
          name: `${name}[${index}]`,
          type: typeInfo.finalType
        }, opcodesMap, options));
      } else if (typeInfo.symbolType === SymbolType.Library) {
        arrays.push(createLibrary(resolver, {
          name: `${name}[${index}]`,
          type: typeInfo.finalType
        }, opcodesMap, options));
      }
      else {
        if (options.state) {
          arrays.push(Stateful.deserializer(typeInfo.finalType, opcodesMap.get(`<${name}[${index}]>`)));
        } else {
          arrays.push(deserializer(typeInfo.finalType, opcodesMap.get(`<${name}[${index}]>`)));
        }
      }

    }

  } else {

    for (let index = 0; index < arraylen; index++) {
      const finalType = resolver(elemTypeName).finalType;
      const subArrayType = [finalType, sizes.slice(1).map(size => `[${size}]`).join('')].join('');
      arrays.push(createArray(resolver, subArrayType, `${name}[${index}]`, opcodesMap, options));
    }
  }

  return arrays;
}


export function deserializeArgfromHex(resolver: TypeResolver, arg: Argument, opcodesMap: Map<string, string>, options: DeserializeOption): Argument {

  let value;

  const typeInfo = resolver(arg.type);

  if (isArrayType(typeInfo.finalType)) {
    value = createArray(resolver, arg.type, arg.name, opcodesMap, options);
  } else if (typeInfo.symbolType === SymbolType.Struct) {
    value = createStruct(resolver, arg, opcodesMap, options);
  } else if (typeInfo.symbolType === SymbolType.Library) {
    value = createLibrary(resolver, arg, opcodesMap, options);
  } else {
    if (options.state) {
      value = Stateful.deserializer(arg.type, opcodesMap.get(`<${arg.name}>`));
    } else {
      value = deserializer(arg.type, opcodesMap.get(`<${arg.name}>`));
    }
  }

  arg.value = value;
  return arg;
}


