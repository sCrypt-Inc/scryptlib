import { pathToFileURL, fileURLToPath } from 'url';
import bsv = require('bsv');
import ECIES = require('bsv/ecies');
import * as fs from 'fs';
import { join, sep } from 'path';
import { tmpdir } from 'os';
export { bsv };
export { ECIES };



import {
  Int, Bool, Bytes, PrivKey, PubKey, Sig, Ripemd160, Sha1, Sha256, SigHashType, SigHashPreimage, OpCodeType, ScryptType,
  ValueType, Struct, SupportedParamType, VariableType, BasicType, TypeResolver, StructEntity, compile,
  findCompiler, CompileResult, AliasEntity, AbstractContract, AsmVarValues, TxContext, DebugConfiguration, DebugLaunch, FileUri, serializeSupportedParamType,
  Arguments, Argument,
  Script, ParamEntity, SingletonParamType
} from './internal';
import { StaticEntity } from './compilerWrapper';
import { HashedMap, HashedSet, Library, ScryptTypeResolver, String } from './scryptTypes';
import { VerifyError } from './contract';
import { ABIEntity, LibraryEntity } from '.';

const BN = bsv.crypto.BN;
const Interp = bsv.Script.Interpreter;

export const DEFAULT_FLAGS =
  //Interp.SCRIPT_VERIFY_P2SH | Interp.SCRIPT_VERIFY_CLEANSTACK | // no longer applies now p2sh is deprecated: cleanstack only applies to p2sh
  Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interp.SCRIPT_ENABLE_MONOLITH_OPCODES | // TODO: to be removed after upgrade to bsv 2.0
  Interp.SCRIPT_VERIFY_STRICTENC |
  Interp.SCRIPT_ENABLE_SIGHASH_FORKID | Interp.SCRIPT_VERIFY_LOW_S | Interp.SCRIPT_VERIFY_NULLFAIL |
  Interp.SCRIPT_VERIFY_DERSIG |
  Interp.SCRIPT_VERIFY_MINIMALDATA | Interp.SCRIPT_VERIFY_NULLDUMMY |
  Interp.SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS |
  Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY | Interp.SCRIPT_VERIFY_CLEANSTACK;

export const DEFAULT_SIGHASH_TYPE =
  bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;

export function bool2Asm(str: string): string {
  if (str === 'true') {
    return 'OP_TRUE';
  }

  if (str === 'false') {
    return 'OP_FALSE';
  }

  throw new Error(`invalid str '${str}' to convert to bool`);
}

/**
 * decimal or hex int to little-endian signed magnitude
 */
export function int2Asm(str: string): string {

  if (/^(-?\d+)$/.test(str) || /^0x([0-9a-fA-F]+)$/.test(str)) {

    const number = str.startsWith('0x') ? new BN(str.substring(2), 16) : new BN(str, 10);

    if (number.eqn(-1)) { return 'OP_1NEGATE'; }

    if (number.gten(0) && number.lten(16)) { return 'OP_' + number.toString(); }

    const m = number.toSM({ endian: 'little' });
    return m.toString('hex');

  } else {
    throw new Error(`invalid str '${str}' to convert to int`);
  }
}


/**
 * convert asm string to number or bigint
 */
export function asm2int(str: string): number | bigint | string {

  switch (str) {
    case 'OP_1NEGATE':
      return -1;
    case '0':
    case 'OP_0':
    case 'OP_1':
    case 'OP_2':
    case 'OP_3':
    case 'OP_4':
    case 'OP_5':
    case 'OP_6':
    case 'OP_7':
    case 'OP_8':
    case 'OP_9':
    case 'OP_10':
    case 'OP_11':
    case 'OP_12':
    case 'OP_13':
    case 'OP_14':
    case 'OP_15':
    case 'OP_16':
      return parseInt(str.replace('OP_', ''));
    default: {
      const value = getValidatedHexString(str);
      const bn = BN.fromHex(value, {
        endian: 'little'
      });

      if (bn.toNumber() < Number.MAX_SAFE_INTEGER && bn.toNumber() > Number.MIN_SAFE_INTEGER) {
        return bn.toNumber();
      } else if (typeof BigInt === 'function') {
        return BigInt(bn.toString());
      } else {
        return bn.toString();
      }
    }
  }
}

/**
 * decimal int or hex str to number or bigint
 */
export function int2Value(str: string): number | bigint | string {

  if (/^(-?\d+)$/.test(str) || /^0x([0-9a-fA-F]+)$/.test(str)) {

    const bn = str.startsWith('0x') ? new BN(str.substring(2), 16) : new BN(str, 10);

    if (bn.toNumber() < Number.MAX_SAFE_INTEGER && bn.toNumber() > Number.MIN_SAFE_INTEGER) {
      return bn.toNumber();
    } else if (typeof BigInt === 'function') {
      return BigInt(bn.toString());
    } else {
      return bn.toString();
    }

  } else {
    throw new Error(`invalid str '${str}' to convert to int`);
  }
}




export function intValue2hex(val: number | bigint): string {
  let hex = val.toString(16);
  if (hex.length % 2 === 1) {
    hex = '0' + hex;
  }
  return hex;
}

function parseBytesLiteral(hex: string): [string /*asm*/, ValueType, VariableType] {
  const hexString = getValidatedHexString(hex);
  if (hexString === '') {
    return ['OP_0', hexString, VariableType.BYTES];
  }

  if (hexString.length / 2 > 1) {
    return [hexString, hexString, VariableType.BYTES];
  }


  const intValue = parseInt(hexString, 16);

  if (intValue >= 1 && intValue <= 16) {
    return [`OP_${intValue}`, hexString, VariableType.BYTES];
  }

  return [hexString, hexString, VariableType.BYTES];
}
export function parseLiteral(l: string): [string /*asm*/, ValueType, VariableType] {

  // bool
  if (l === 'false') {
    return ['OP_FALSE', false, VariableType.BOOL];
  }
  if (l === 'true') {
    return ['OP_TRUE', true, VariableType.BOOL];
  }

  // hex int
  let m = /^(0x[0-9a-fA-F]+)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.INT];
  }

  // decimal int
  m = /^(-?\d+)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.INT];
  }

  // bytes
  // note: special handling of empty bytes b''
  m = /^b'([\da-fA-F]*)'$/.exec(l);
  if (m) {
    return parseBytesLiteral(m[1]);
  }

  // String
  m = /^"([\s\S]*)"$/.exec(l);
  if (m) {
    const value = String.toUtf8Hex(m[1]);
    return parseBytesLiteral(value);
  }


  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.PRIVKEY];
  }
  // 2) hex int
  m = /^PrivKey\((0x[0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.PRIVKEY];
  }

  // PubKey
  m = /^PubKey\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.PUBKEY];
  }

  // Sig
  m = /^Sig\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SIG];
  }

  // Ripemd160
  m = /^Ripemd160\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.RIPEMD160];
  }

  // Sha1
  m = /^Sha1\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SHA1];
  }

  // Sha256
  m = /^Sha256\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SHA256];
  }

  // SigHashType
  m = /^SigHashType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const bn = new BN(getValidatedHexString(m[1]), 16);
    return [bn.toString('hex', 2), bn.toNumber(), VariableType.SIGHASHTYPE];
  }

  // SigHashPreimage
  m = /^SigHashPreimage\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SIGHASHPREIMAGE];
  }

  // OpCodeType
  m = /^OpCodeType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.OPCODETYPE];
  }

  // Struct
  m = /^\{([\s\S]*)\}$/.exec(l);
  if (m) {
    // we use object to constructor a struct, no use literal, so here we return empty
    return ['', '', VariableType.STRUCT];
  }

  // Library
  m = /^\[([\s\S]*)\]$/.exec(l);
  if (m) {
    // we use array to constructor a library, no use literal, so here we return empty
    return ['', '', VariableType.LIBRARY];
  }

  throw new Error(`<${l}> cannot be cast to ASM format, only sCrypt native types supported`);

}

export function isStringLiteral(l: string) {
  const m = /^"([\s\S]*)"$/.exec(l.trim());
  if (m) {
    return true;
  }
  return false;
}

/**
 * convert literals to Scrypt Type
 */
export function literal2ScryptType(l: string): ScryptType {

  const [asm, value, type] = parseLiteral(l);
  switch (type) {
    case VariableType.BOOL:
      return new Bool(value as boolean);
    case VariableType.INT:
      return new Int(value as number);
    case VariableType.BYTES:
      return isStringLiteral(l) ? new String(String.fromUtf8Hex(value as string)) : new Bytes(value as string);
    case VariableType.PRIVKEY:
      return new PrivKey(value as bigint);
    case VariableType.PUBKEY:
      return new PubKey(value as string);
    case VariableType.SIG:
      return new Sig(value as string);
    case VariableType.RIPEMD160:
      return new Ripemd160(value as string);
    case VariableType.SHA1:
      return new Sha1(value as string);
    case VariableType.SHA256:
      return new Sha256(value as string);
    case VariableType.SIGHASHTYPE:
      return new SigHashType(value as number);
    case VariableType.SIGHASHPREIMAGE:
      return new SigHashPreimage(value as string);
    case VariableType.OPCODETYPE:
      return new OpCodeType(value as string);
    default:
      throw new Error(`<${l}> cannot be cast to ScryptType, only sCrypt native types supported`);
  }
}


export function asm2ScryptType(type: string, asm: string): ScryptType {

  switch (type) {
    case VariableType.BOOL:
      return new Bool(BN.fromString(asm) > 0 ? true : false);
    case VariableType.INT:
      return new Int(asm2int(asm));
    case VariableType.BYTES:
      return new Bytes((asm == '0' || asm == 'OP_0' || asm == 'OP_FALSE') ? '' : asm);
    case VariableType.PRIVKEY:
      return new PrivKey(asm2int(asm));
    case VariableType.PUBKEY:
      return new PubKey(asm);
    case VariableType.SIG:
      return new Sig(asm);
    case VariableType.RIPEMD160:
      return new Ripemd160(asm);
    case VariableType.SHA1:
      return new Sha1(asm);
    case VariableType.SHA256:
      return new Sha256(asm);
    case VariableType.SIGHASHTYPE:
      return new SigHashType(asm2int(asm) as number);
    case VariableType.SIGHASHPREIMAGE:
      return new SigHashPreimage(asm);
    case VariableType.OPCODETYPE:
      return new OpCodeType(asm);
    default:
      throw new Error(`<${type}> cannot be cast to ScryptType, only sCrypt native types supported`);
  }

}



export function bytes2Literal(bytearray: number[], type: string): string {

  switch (type) {
    case 'bool':
      return BN.fromBuffer(bytearray, { endian: 'little' }) > 0 ? 'true' : 'false';

    case 'int':
    case 'PrivKey':
      return BN.fromSM(bytearray, { endian: 'little' }).toString();

    case 'bytes':
      return `b'${bytesToHexString(bytearray)}'`;

    default:
      return `b'${bytesToHexString(bytearray)}'`;
  }

}

export function bytesToHexString(bytearray: number[]): string {
  return bytearray.reduce(function (o, c) { return o += ('0' + (c & 0xFF).toString(16)).slice(-2); }, '');
}

export function hexStringToBytes(hex: string): number[] {

  getValidatedHexString(hex);

  return hex.split('')
    .reduce(function (o, c, i) {
      if (i % 2 === 0) {
        o.push(c);
      } else {
        o[o.length - 1] += c;
      }
      return o;
    }, new Array<string>())
    .map(b => parseInt(b, 16));
}


export function getValidatedHexString(hex: string, allowEmpty = true): string {

  const ret = hex.trim();

  if (ret.length < 1 && !allowEmpty) {
    throw new Error('can\'t be empty string');
  }

  if (ret.length % 2) {
    throw new Error(`${ret} should have even length`);
  }

  if (ret.length > 0 && !(/^[\da-f]+$/i.test(ret))) {
    throw new Error(`${ret} should only contain [0-9] or characters [a-fA-F]`);
  }

  return ret;
}

export function signTx(tx: bsv.Transaction, privateKey: bsv.PrivateKey, lockingScript: Script, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS): Sig {

  if (!tx) {
    throw new Error('param tx can not be empty');
  }

  if (!privateKey) {
    throw new Error('param privateKey can not be empty');
  }

  if (!lockingScript) {
    throw new Error('param lockingScript can not be empty');
  }

  if (!inputAmount) {
    throw new Error('param inputAmount can not be empty');
  }

  if (typeof lockingScript === 'string') {
    throw new Error('Breaking change: LockingScript in ASM format is no longer supported, please use the lockingScript object directly');
  }

  const buf = toHex(bsv.Transaction.sighash.sign(
    tx, privateKey, sighashType, inputIndex,
    lockingScript, new bsv.crypto.BN(inputAmount), flags
  ).toTxFormat());
  return new Sig(buf);
}

export function toHex(x: { toString(format: 'hex'): string }): string {
  return x.toString('hex');
}

export function getPreimage(tx: bsv.Transaction, lockingScript: Script, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS): SigHashPreimage {
  const preimageBuf = bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, lockingScript, new bsv.crypto.BN(inputAmount), flags);
  return new SigHashPreimage(preimageBuf.toString('hex'));
}

const MSB_THRESHOLD = 0x7e;

export function getLowSPreimage(tx: bsv.Transaction, lockingScript: Script, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS): SigHashPreimage {

  for (let i = 0; i < 100; i++) {
    const preimage = getPreimage(tx, lockingScript, inputAmount, inputIndex, sighashType, flags);
    const sighash = bsv.crypto.Hash.sha256sha256(Buffer.from(toHex(preimage), 'hex'));
    const msb = sighash.readUInt8();
    if (msb < MSB_THRESHOLD) {
      return preimage;
    }
    tx.inputs[inputIndex].sequenceNumber--;
  }
}


// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// Support Bigint
export function num2bin(n: number | bigint | bsv.crypto.BN, dataLen: number): string {
  const num = new BN(n);
  if (num.eqn(0)) {
    return '00'.repeat(dataLen);
  }
  const s = num.toSM({ endian: 'little' }).toString('hex');

  const byteLen_ = s.length / 2;
  if (byteLen_ > dataLen) {
    throw new Error(`${n} cannot fit in ${dataLen} byte[s]`);
  }
  if (byteLen_ === dataLen) {
    return s;
  }

  const paddingLen = dataLen - byteLen_;
  const lastByte = s.substring(s.length - 2);
  const rest = s.substring(0, s.length - 2);
  let m = parseInt(lastByte, 16);
  if (num.isNeg) {
    // reset sign bit
    m &= 0x7F;
  }
  let mHex = m.toString(16);
  if (mHex.length < 2) {
    mHex = '0' + mHex;
  }

  const padding = n > 0 ? '00'.repeat(paddingLen) : '00'.repeat(paddingLen - 1) + '80';
  return rest + mHex + padding;
}

//Support Bigint
export function bin2num(s: string | Buffer): number | string {
  const hex = s.toString('hex');
  const lastByte = hex.substring(hex.length - 2);
  const rest = hex.substring(0, hex.length - 2);
  const m = parseInt(lastByte, 16);
  const n = m & 0x7F;
  let nHex = n.toString(16);
  if (nHex.length < 2) {
    nHex = '0' + nHex;
  }
  //Support negative number
  let bn = BN.fromHex(rest + nHex, { endian: 'little' });
  if (m >> 7) {
    bn = bn.neg();
  }

  if (bn.toNumber() < Number.MAX_SAFE_INTEGER && bn.toNumber() > Number.MIN_SAFE_INTEGER) {
    return bn.toNumber();
  } else {
    return bn.toString();
  }
}


declare let window: any;

export function isNode(): boolean {
  return typeof window === 'undefined' && typeof process === 'object';
}


export function path2uri(path: string): string {

  if (isNode()) {
    return pathToFileURL(path).toString();
  } else {
    return path;
  }
}

export function uri2path(uri: string): string {
  if (isNode()) {
    return fileURLToPath(uri);
  } else {
    return uri;
  }

}

/**
 * @deprecated
 * convert literals to script ASM format
 */
export function literal2Asm(l: string): [string, string] {
  const [asm, _, type] = parseLiteral(l);
  return [asm, type];
}



export function findStructByName(name: string, s: StructEntity[]): StructEntity {
  return s.find(s => {
    return s.name == name;
  });
}

export function findLibraryByGeneric(type: string): string {

  if (isGenericType(type)) {
    const group = type.split('<');
    const library = group[0].trim();
    return library;
  }

  throw new Error(type + ' is not a generic type');

}


export function isStructOrLibraryType(type: string): boolean {
  return isStructType(type) || isLibraryType(type);
}

export function isStructType(type: string): boolean {
  return /^struct\s(\w+)\s\{\}$/.test(type);
}

export function isLibraryType(type: string): boolean {
  return /^library\s(\w+)\s\{\}$/.test(type) || isGenericType(type);
}



// test struct Token {}[3], int[3], st.b.c[3]
export function isArrayType(type: string): boolean {
  if (isStructArrayType(type) || isLibraryArrayType(type) || isGenericArrayType(type)) return true;
  return /^[\w.]+(\[[\w.]+\])+$/.test(type);
}

export function isStructArrayType(type: string): boolean {
  return /^struct\s(\w+)\s\{\}(\[[\w.]+\])+$/.test(type);
}

export function isLibraryArrayType(type: string): boolean {
  return /^library\s(\w+)\s\{\}(\[[\w.]+\])+$/.test(type);
}

export function isGenericArrayType(type: string): boolean {
  return /^([\w]+)<([\w,[\]{}\s]+)>(\[[\w.]+\])+$/.test(type);
}

export function getNameByType(type: string): string {
  let m = /^struct\s(\w+)\s\{\}$/.exec(type.trim());
  if (m) {
    return m[1];
  }

  m = /^library\s(\w+)\s\{\}$/.exec(type.trim());
  if (m) {
    return m[1];
  }

  if (isGenericType(type)) {
    return parseGenericType(type)[0];
  } else if (isArrayType(type)) {
    const [elemType, _] = arrayTypeAndSizeStr(type);
    return getNameByType(elemType);
  }

  return '';
}

export function getLibraryNameByType(type: string): string {
  const m = /^library\s(\w+)\s\{\}$/.exec(type.trim());
  if (m) {
    return m[1];
  }

  return '';
}


export function findStructByType(type: string, s: StructEntity[]): StructEntity | undefined {
  const name = getNameByType(type);
  if (name) {
    return findStructByName(name, s);
  }
  return undefined;
}



export function checkStructField(s: StructEntity, param: ParamEntity, arg: SupportedParamType, typeResolver: TypeResolver): void {

  const expectedType = typeResolver(param.type);

  if (isArrayType(expectedType)) {
    if (checkArray(arg as SupportedParamType[], param, expectedType, typeResolver)) {
      throw new Error(`Member ${param.name} of struct ${s.name} is of wrong type, expected ${param.type}`);
    }
  } else {
    const realType = typeOfArg(arg);

    if (expectedType != realType) {
      throw new Error(`Member ${param.name} of struct ${s.name} is of wrong type, expected ${expectedType} but got ${realType}`);
    }
  }
}

export function checkStruct(s: StructEntity, arg: Struct, typeResolver: TypeResolver): void {

  s.params.forEach(p => {
    const member = arg.memberByKey(p.name);

    if (member) {
      checkStructField(s, p, member, typeResolver);
    } else {
      throw new Error(`argument of type struct ${s.name} missing member ${p.name}`);
    }

  });

  const members = s.params.map(p => p.name);
  arg.getMembers().forEach(key => {
    if (!members.includes(key)) {
      throw new Error(`${key} is not a member of struct ${s.name}`);
    }
  });
}



export function checkSupportedParamType(arg: SupportedParamType, param: ParamEntity, resolver: TypeResolver): Error | undefined {
  const finalType = resolver(param.type);
  if (isArrayType(finalType)) {
    return checkArray(arg as SupportedParamType[], param, finalType, resolver);
  }

  const error = new Error(`The type of ${param.name} is wrong, expected ${shortType(finalType)} but got ${typeNameOfArg(arg)}`);
  if (isGenericType(finalType)) {
    if (Library.isLibrary(arg)) {
      const argL = arg as Library;
      if (!argL.inferrTypesByAssign(finalType)) {
        return error;
      }
    } else {
      return error;
    }
  }

  const t = typeOfArg(arg);

  return t == finalType ? undefined : error;
}



/**
 * return eg. int[N][N][4] => ['int', ["N","N","4"]]
 * @param arrayTypeName 
 */
export function arrayTypeAndSizeStr(arrayTypeName: string): [string, Array<string>] {

  const arraySizes: Array<string> = [];

  if (isGenericArrayType(arrayTypeName)) {
    const group = arrayTypeName.split('>');
    const elemTypeName = group[0] + '>';

    [...group[1].matchAll(/\[([\w.]+)\]+/g)].map(match => {
      arraySizes.push(match[1]);
    });

    return [elemTypeName, arraySizes];
  }
  [...arrayTypeName.matchAll(/\[([\w.]+)\]+/g)].map(match => {
    arraySizes.push(match[1]);
  });

  const group = arrayTypeName.split('[');
  const elemTypeName = group[0];
  return [elemTypeName, arraySizes];
}


/**
 * return eg. int[2][3][4] => ['int', [2,3,4]]
 * @param arrayTypeName  eg. int[2][3][4]
 */
export function arrayTypeAndSize(arrayTypeName: string): [string, Array<number>] {
  const [elemTypeName, arraySizes] = arrayTypeAndSizeStr(arrayTypeName);
  return [elemTypeName, arraySizes.map(size => {
    const n = parseInt(size);

    if (isNaN(n)) {
      throw new Error(`arrayTypeAndSize error type ${arrayTypeName} with sub isNaN`);
    }

    return n;
  })];
}

export function toLiteralArrayType(elemTypeName: string, sizes: Array<number | string>): string {
  return [elemTypeName, sizes.map(size => `[${size}]`).join('')].join('');
}

export function toGenericType(library: string, genericTypes: Array<number | string>): string {
  return `${library}<${genericTypes.join(',')}>`;
}


/**
 * return eg. int[2][3][4] => int[3][4]
 * @param arrayTypeName  eg. int[2][3][4]
 */
export function subArrayType(arrayTypeName: string): string {
  const [elemTypeName, sizes] = arrayTypeAndSize(arrayTypeName);
  return toLiteralArrayType(elemTypeName, sizes.slice(1));
}


function checkArray(args: SupportedParamType[], param: ParamEntity, expectedType: string, resolver: TypeResolver): Error | undefined {
  const finalType = resolver(param.type);
  const [elemTypeName, arraySizes] = arrayTypeAndSize(finalType);

  if (!Array.isArray(args)) {
    return new Error(`The type of ${param.name} is wrong, expected ${expectedType} but got ${typeNameOfArg(args)}`);
  }

  const t = typeOfArg(args[0]);

  if (!args.every(arg => typeOfArg(arg) === t)) {
    return new Error(`The type of ${param.name} is wrong, expected ${expectedType} but not all element types are the same`);
  }


  if (args.length !== arraySizes[0]) {
    return new Error(`The type of ${param.name} is wrong, should be ${expectedType}`);
  }

  if (arraySizes.length == 1) {
    const arg0 = args[0];
    const scryptType = typeOfArg(arg0);
    return scryptType === elemTypeName ?
      undefined :
      new Error(`The type of ${param.name} is wrong, should be ${expectedType}`);

  } else {
    return args.map(a => {
      return checkArray(a as SupportedParamType[], {
        name: param.name,
        type: subArrayType(finalType)
      },
      expectedType,
      resolver);
    }).filter(e => e)[0];
  }
}

export function subscript(index: number, arraySizes: Array<number>): string {

  if (arraySizes.length == 1) {
    return `[${index}]`;
  } else if (arraySizes.length > 1) {
    const subArraySizes = arraySizes.slice(1);
    const offset = subArraySizes.reduce(function (acc, val) { return acc * val; }, 1);
    return `[${Math.floor(index / offset)}]${subscript(index % offset, subArraySizes)}`;
  }
}

export function flatternArray(arg: SupportedParamType[], name: string, finalType: string): Arguments {

  if (!Array.isArray(arg)) {
    throw new Error('flatternArray only work on array');
  }

  const [elemTypeName, arraySizes] = arrayTypeAndSize(finalType);

  return arg.map((item, index) => {

    if (typeof item === 'boolean') {
      item = new Bool(item as boolean);
    } else if (typeof item === 'number') {
      item = new Int(item as number);
    } else if (typeof item === 'bigint') {
      item = new Int(item as bigint);
    } else if (Array.isArray(item)) {
      return flatternArray(item, `${name}[${index}]`, subArrayType(finalType));
    } else if (Struct.isStruct(item)) {
      return flatternStruct(item, `${name}[${index}]`);
    } else if (Library.isLibrary(item)) {
      return flatternLibrary(item, `${name}[${index}]`);
    }
    else {
      item = item as ScryptType;
    }

    return {
      value: item,
      name: `${name}${subscript(index, arraySizes)}`,
      type: elemTypeName
    };
  }).flat(Infinity) as Arguments;
}

export function flatternStruct(arg: SupportedParamType, name: string): Arguments {
  if (Struct.isStruct(arg)) {
    const argS = arg as Struct;
    const keys = argS.getMembers();

    return keys.map(key => {
      let member = argS.memberByKey(key);
      if (Struct.isStruct(member)) {
        return flatternStruct(member as Struct, `${name}.${key}`);
      } else if (Array.isArray(member)) {
        const finalType = argS.getMemberAstFinalType(key);
        return flatternArray(member, `${name}.${key}`, finalType);
      } else {
        member = member as ScryptType;
        return {
          value: member,
          name: `${name}.${key}`,
          type: member.type
        };
      }
    }).flat(Infinity) as Arguments;

  } else {
    throw new Error(`${arg} should be struct`);
  }
}


export function flatternLibrary(arg: SupportedParamType, name: string): Arguments {

  if (Library.isLibrary(arg)) {
    const library = arg as Library;

    const args = library.getCtorArgs();

    return library.getLibraryAst().params.map((param, index) => {
      const arg = args[index];
      if (Struct.isStruct(arg)) {
        return flatternStruct(arg, `${name}.${param.name}`);
      } else if (Array.isArray(arg)) {
        return flatternArray(arg, `${name}.${param.name}`, param.type);
      } else if (Library.isLibrary(arg)) {
        return flatternLibrary(arg, `${name}.${param.name}`);
      } else {
        return {
          value: arg,
          name: `${name}.${param.name}`,
          type: param.type
        };
      }
    }).flat(Infinity) as Arguments;

  } else {
    throw new Error(`${arg} should be library`);
  }
}



export function flatternLibraryState(arg: SupportedParamType, name: string): Arguments {

  if (Library.isLibrary(arg)) {
    const library = arg as Library;

    return library.getLibraryAst().properties.map((param, index) => {
      const property = library.getProperty(param.name);
      if (Struct.isStruct(property)) {
        return flatternStruct(property, `${name}.${param.name}`);
      } else if (Array.isArray(property)) {
        return flatternArray(property, `${name}.${param.name}`, param.type);
      } else if (Library.isLibrary(property)) {
        return flatternLibraryState(property, `${name}.${param.name}`);
      } else {
        return {
          value: property,
          name: `${name}.${param.name}`,
          type: param.type
        };
      }
    }).flat(Infinity) as Arguments;

  } else {
    throw new Error(`${arg} should be library`);
  }
}

//using for flattern contract constructor arguments
export function flatternCtorArgs(args: Arguments, finalTypeResolver: TypeResolver): Arguments {
  const args_: Arguments = [];
  args.forEach((arg) => {
    const finalType = finalTypeResolver(arg.type);
    if (isStructType(finalType)) {
      flatternStruct(arg.value, arg.name).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });
    } else if (isLibraryType(finalType)) {
      flatternLibrary(arg.value, arg.name).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });
    }
    else if (isArrayType(finalType)) {
      flatternArray(arg.value as SupportedParamType[], arg.name, finalType).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });

    } else {
      args_.push({
        name: arg.name,
        type: finalType,
        value: arg.value
      });
    }
  });

  return args_;
}

//using for flattern stateful contract states
export function flatternStateArgs(args: Arguments, finalTypeResolver: TypeResolver): Arguments {
  const args_: Arguments = [];
  args.forEach((arg) => {
    const finalType = finalTypeResolver(arg.type);
    if (isStructType(finalType)) {
      flatternStruct(arg.value, arg.name).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });
    } else if (isLibraryType(finalType)) {
      flatternLibraryState(arg.value, arg.name).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });
    }
    else if (isArrayType(finalType)) {
      flatternArray(arg.value as SupportedParamType[], arg.name, finalType).forEach(e => {
        args_.push({
          name: e.name,
          type: finalTypeResolver(e.type),
          value: e.value
        });
      });

    } else {
      args_.push({
        name: arg.name,
        type: finalType,
        value: arg.value
      });
    }
  });

  return args_;
}

function flatternLibraryParam(param: ParamEntity, resolver: ScryptTypeResolver, property: boolean): Arguments {
  if (isLibraryType(param.type)) {
    const libraryClass = resolver.resolverClass(param.type) as typeof Library;
    const ast = property ? libraryClass.libraryAst.properties : libraryClass.libraryAst.params;
    return ast.map(p => {
      p.type = resolver.resolverType(p.type);
      if (isStructType(p.type)) {
        return flatternStructParam({
          name: `${param.name}.${p.name}`,
          type: p.type
        }, resolver);
      } else if (isLibraryType(p.type)) {
        return flatternLibraryParam({
          name: `${param.name}.${p.name}`,
          type: p.type
        }, resolver, property);
      }
      else if (isArrayType(p.type)) {
        return flatternArrayParam({
          name: `${param.name}.${p.name}`,
          type: p.type
        }, resolver);
      }
      else {
        return {
          value: undefined,
          name: `${param.name}.${p.name}`,
          type: p.type
        };
      }
    }).flat(Infinity) as Arguments;

  } else {
    throw new Error(`ParamEntity ${param.name} should be library`);
  }
}





function flatternStructParam(param: ParamEntity, resolver: ScryptTypeResolver): Arguments {
  if (isStructOrLibraryType(param.type)) {
    const StructClass = resolver.resolverClass(param.type) as typeof Struct;
    return StructClass.structAst.params.map(p => {
      p.type = resolver.resolverType(p.type);
      if (isStructOrLibraryType(p.type)) {
        return flatternStructParam({
          name: `${param.name}.${p.name}`,
          type: p.type
        }, resolver);

      } else if (isArrayType(p.type)) {
        return flatternArrayParam({
          name: `${param.name}.${p.name}`,
          type: p.type
        }, resolver);
      }
      else {
        return {
          value: undefined,
          name: `${param.name}.${p.name}`,
          type: p.type
        };
      }
    }).flat(Infinity) as Arguments;

  } else {
    throw new Error(`ParamEntity ${param.name} should be struct`);
  }
}


function flatternArrayParam(param: ParamEntity, resolver: ScryptTypeResolver): Arguments {

  param.type = resolver.resolverType(param.type);
  if (!isArrayType(param.type)) {
    throw new Error(`ParamEntity ${param.name} should be array`);
  }

  const [elemTypeName, arraySizes] = arrayTypeAndSize(param.type);

  const args: Arguments = [];

  for (let index = 0; index < arraySizes[0]; index++) {

    if (arraySizes.length > 1) {
      flatternArrayParam({
        name: `${param.name}[${index}]`,
        type: subArrayType(param.type)
      }, resolver).forEach(a => {
        args.push(a);
      });
    } else if (isStructType(elemTypeName)) {
      flatternStructParam({
        name: `${param.name}[${index}]`,
        type: elemTypeName
      }, resolver).forEach(a => {
        args.push(a);
      });
    } else if (isLibraryType(elemTypeName)) {
      flatternLibraryParam({
        name: `${param.name}[${index}]`,
        type: elemTypeName
      }, resolver, true).forEach(a => {
        args.push(a);
      });
    } else {
      args.push({
        value: undefined,
        name: `${param.name}${subscript(index, arraySizes)}`,
        type: elemTypeName
      });
    }
  }

  return args.flat(Infinity) as Arguments;
}





export function flatternParams(params: Array<ParamEntity>, resolver: ScryptTypeResolver): Arguments {
  const args_: Arguments = [];
  params.forEach((param) => {
    param.type = resolver.resolverType(param.type);
    if (isStructType(param.type)) {
      flatternStructParam(param, resolver).forEach(e => {
        args_.push({
          name: e.name,
          type: e.type,
          value: e.value
        });
      });
    } else if (isLibraryType(param.type)) {
      flatternLibraryParam(param, resolver, true).forEach(e => {
        args_.push({
          name: e.name,
          type: e.type,
          value: e.value
        });
      });
    } else if (isArrayType(param.type)) {
      flatternArrayParam(param, resolver).forEach(e => {
        args_.push({
          name: e.name,
          type: e.type,
          value: e.value
        });
      });

    } else {
      args_.push({
        name: param.name,
        type: param.type,
        value: undefined
      });
    }
  });

  return args_;
}




export function typeOfArg(arg: SupportedParamType): string {

  if (arg instanceof ScryptType) {
    const scryptType = (arg as ScryptType).finalType;
    return scryptType;
  }

  const typeofArg = typeof arg;

  if (typeofArg === 'boolean') {
    return 'bool';
  }

  if (typeofArg === 'number') {
    return 'int';
  }

  if (typeofArg === 'bigint') {
    return 'int';
  }

  if (typeofArg === 'string') {
    return new Int(arg as string).finalType;
  }

  return typeof arg;

}

export function shortType(finalType: string): string {
  if (isArrayType(finalType)) {
    const [elemType, sizes] = arrayTypeAndSizeStr(finalType);
    return toLiteralArrayType(shortType(elemType), sizes);
  }

  if (isGenericType(finalType)) {
    const [library, types] = parseGenericType(finalType);
    return toGenericType(library, types.map(t => shortType(t)));
  }

  return getNameByType(finalType) ? getNameByType(finalType) : finalType;
}

export function typeNameOfArg(arg: SupportedParamType): string {

  const scryptType = typeOfArg(arg);

  return shortType(scryptType);
}


export function readFileByLine(path: string, index: number): string {

  let result = '';
  fs.readFileSync(path, 'utf8').split(/\r?\n/).every(function (line, i) {
    if (i === (index - 1)) {
      result = line;
      return false;
    }
    return true;
  });

  return result;
}


export function isEmpty(obj: unknown): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}




export function compileContract(file: string, options?: {
  out?: string,
  sourceMap?: boolean
}): CompileResult {
  console.log(`Compiling contract ${file} ...`);
  options = Object.assign({
    out: join(__dirname, '../out'),
    sourceMap: true
  }, options);
  if (!fs.existsSync(file)) {
    throw (`file ${file} not exists!`);
  }

  if (!fs.existsSync(options.out)) {
    fs.mkdirSync(options.out);
  }


  const result = compile(
    { path: file },
    {
      desc: true, debug: options.sourceMap, outputDir: options.out,
      hex: true,
      cmdPrefix: findCompiler()
    }
  );

  return result;
}


export function newCall(Cls: typeof AbstractContract, args: Array<SupportedParamType>): AbstractContract {
  return new (Function.prototype.bind.apply(Cls, [null].concat(args)));
}



export function genLaunchConfigFile(constructorArgs: SupportedParamType[], pubFuncArgs: SupportedParamType[],
  pubFunc: string, name: string, program: string, txContext: TxContext, asmArgs: AsmVarValues): FileUri {

  // some desc without sourceMap will not have file property.
  if (!program) {
    return '';
  }

  const debugConfig: DebugConfiguration = {
    type: 'scrypt',
    request: 'launch',
    internalConsoleOptions: 'openOnSessionStart',
    name: name,
    program: program,
    constructorArgs: constructorArgs,
    pubFunc: pubFunc,
    pubFuncArgs: pubFuncArgs
  };




  const debugTxContext = {};

  if (!isEmpty(txContext)) {

    const tx = txContext.tx || '';
    const inputIndex = txContext.inputIndex || 0;
    const inputSatoshis = txContext.inputSatoshis || 0;
    if (tx) {
      Object.assign(debugTxContext, { hex: tx.toString(), inputIndex, inputSatoshis });
    }
    if (typeof txContext.opReturn === 'string') {
      Object.assign(debugTxContext, { opReturn: txContext.opReturn });
    } else if (typeof txContext.opReturnHex === 'string') {
      Object.assign(debugTxContext, { opReturnHex: txContext.opReturnHex });
    }
  }



  if (!isEmpty(asmArgs)) {
    Object.assign(debugConfig, { asmArgs: asmArgs });
  }



  if (!isEmpty(debugTxContext)) {
    Object.assign(debugConfig, { txContext: debugTxContext });
  }

  const launch: DebugLaunch = {
    version: '0.2.0',
    configurations: [debugConfig]
  };

  const jsonstr = JSON.stringify(launch, (key, value) => {

    if (typeof value === 'bigint') {
      return value.toString();
    } else {
      return value;
    }
  }, 2);

  if (isNode()) {
    const filename = `${name}-launch.json`;
    const file = join(fs.mkdtempSync(`${tmpdir()}${sep}sCrypt.`), filename);
    fs.writeFileSync(file, jsonstr);
    return path2uri(file);
  } else {
    console.error(`${pubFunc}() call fail, see launch.json`, jsonstr);
  }

}



export function resolveConstValue(node: any): string | undefined {

  let value: string | undefined = undefined;
  if (node.expr.nodeType === 'IntLiteral') {
    value = node.expr.value.toString(10);
  } else if (node.expr.nodeType === 'BoolLiteral') {
    value = node.expr.value;
  } if (node.expr.nodeType === 'BytesLiteral') {
    value = `b'${node.expr.value.map(a => intValue2hex(a)).join('')}'`;
  } if (node.expr.nodeType === 'FunctionCall') {
    if ([VariableType.PUBKEY, VariableType.RIPEMD160, VariableType.PUBKEYHASH,
      VariableType.SIG, VariableType.SIGHASHTYPE, VariableType.OPCODETYPE,
      VariableType.SIGHASHPREIMAGE, VariableType.SHA1, VariableType.SHA256].includes(node.expr.name)) {
      value = `b'${node.expr.params[0].value.map(a => intValue2hex(a)).join('')}'`;
    } else if (node.expr.name === VariableType.PRIVKEY) {
      value = node.expr.params[0].value.toString(10);
    }
  }
  return value;
}

export function resolveType(type: string, originTypes: Record<string, string>, contract: string, statics: StaticEntity[], alias: AliasEntity[], librarys: LibraryEntity[]): string {
  const _type = resolveAliasType(alias, type);
  if (isArrayType(_type)) {
    const arrayType = resolveArrayType(contract, _type, statics);
    const [elemTypeName, sizes] = arrayTypeAndSizeStr(arrayType);
    return toLiteralArrayType(originTypes[elemTypeName] || elemTypeName, sizes);
  } else if (isGenericType(_type)) {
    const [library, genericTypes] = parseGenericType(_type);
    return toGenericType(library, genericTypes.map(t => resolveType(t, originTypes, contract, statics, alias, librarys)));
  } else {
    return originTypes[_type] || _type;
  }
}


export function resolveArrayType(contract: string, type: string, statics: StaticEntity[]): string {

  if (isArrayType(type)) {
    const [elemTypeName, arraySizes] = arrayTypeAndSizeStr(type);

    const sizes = arraySizes.map(size => {
      if (/^(\d)+$/.test(size)) {
        return parseInt(size);
      } else {
        // size as a static const
        const size_ = (size.indexOf('.') > 0) ? size : `${contract}.${size}`;
        const value = findConstStatic(statics, size_);
        if (!value) {
          console.warn(`resolve array sub ${size} fail`);
          return size;
        }
        return value.value;
      }
    });

    return toLiteralArrayType(elemTypeName, sizes);
  }
  return type;
}


/***
 * resolve type
 */
export function resolveAliasType(alias: AliasEntity[], type: string): string {


  if (isArrayType(type)) {
    const [elemTypeName, sizes] = arrayTypeAndSizeStr(type);
    const elemType = resolveAliasType(alias, elemTypeName);

    if (isArrayType(elemType)) {
      const [elemTypeName_, sizes_] = arrayTypeAndSizeStr(elemType);
      return toLiteralArrayType(elemTypeName_, sizes.concat(sizes_));
    }
    return toLiteralArrayType(resolveAliasType(alias, elemTypeName), sizes);
  }

  if (isStructType(type)) { //library does't need to resolve alias type.
    return resolveAliasType(alias, getNameByType(type));
  }

  const a = alias.find(a => {
    return a.name === type;
  });

  if (a) {
    return resolveAliasType(alias, a.type);
  } else {
    return type;
  }
}


export function ansiRegex({ onlyFirst = false } = {}) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|');

  return new RegExp(pattern, onlyFirst ? undefined : 'g');
}


export function stripAnsi(string: string): string {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }

  return string.replace(ansiRegex(), '');
}


export function createStruct(resolver: ScryptTypeResolver, param: ParamEntity, opcodesMap: Map<string, string>): Struct {

  const structClass = resolver.resolverClass(param.type) as typeof Struct;

  const obj = Object.create({});
  structClass.structAst.params.forEach(p => {

    const finalType = resolver.resolverType(p.type);

    if (isStructType(finalType)) {

      Object.assign(obj, {
        [p.name]: createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap)
      });

    } else if (isLibraryType(finalType)) {

      Object.assign(obj, {
        [p.name]: createLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap)
      });

    } else if (isArrayType(finalType)) {

      Object.assign(obj, {
        [p.name]: createArray(resolver, finalType, `${param.name}.${p.name}`, opcodesMap)
      });

    } else {

      Object.assign(obj, {
        [p.name]: asm2ScryptType(finalType, opcodesMap.get(`$${param.name}.${p.name}`))
      });

    }

  });


  return new structClass(obj);
}



export function createLibrary(resolver: ScryptTypeResolver, param: ParamEntity, opcodesMap: Map<string, string>): Library {


  const libraryClass = resolver.resolverClass(param.type) as typeof Library;

  const args = libraryClass.libraryAst.params.map(p => {

    const finalType = resolver.resolverType(p.type);

    if (isStructType(finalType)) {

      return createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap);

    } else if (isLibraryType(finalType)) {

      return createLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap);

    } else if (isArrayType(finalType)) {

      return createArray(resolver, finalType, `${param.name}.${p.name}`, opcodesMap);

    } else {
      return asm2ScryptType(finalType, opcodesMap.get(`$${param.name}.${p.name}`));
    }
  });

  return new libraryClass(...args);

}


export function createLibraryProperties(resolver: ScryptTypeResolver, param: ParamEntity, opcodesMap: Map<string, string>): Record<string, SupportedParamType> {


  const libraryClass = resolver.resolverClass(param.type) as typeof Library;

  const properties: Record<string, SupportedParamType> = {};

  libraryClass.libraryAst.properties.forEach(p => {

    const finalType = resolver.resolverType(p.type);

    if (isStructType(finalType)) {

      Object.assign(properties, {
        [p.name]: createStruct(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap)
      });

    } else if (isLibraryType(finalType)) {

      const library = createDefaultLibrary(resolver, { name: `${param.name}.${p.name}`, type: p.type });

      library.setProperties(createLibraryProperties(resolver, { name: `${param.name}.${p.name}`, type: p.type }, opcodesMap));

      Object.assign(properties, {
        [p.name]: library
      });

    } else if (isArrayType(finalType)) {

      Object.assign(properties, {
        [p.name]: createArray(resolver, p.type, `${param.name}.${p.name}`, opcodesMap)
      });

    } else {
      Object.assign(properties, {
        [p.name]: asm2ScryptType(finalType, opcodesMap.get(`$${param.name}.${p.name}`))
      });
    }
  });

  return properties;

}



export function createDefaultLibrary(resolver: ScryptTypeResolver, param: ParamEntity): Library {

  const flatternparams = flatternLibraryParam(param, resolver, false);

  const asmTemplate: Map<string, string> = new Map();

  flatternparams.forEach(p => {

    if (p.type === VariableType.INT || p.type === VariableType.PRIVKEY) {
      asmTemplate.set(`$${p.name}`, 'OP_0');
    } else if (p.type === VariableType.BOOL) {
      asmTemplate.set(`$${p.name}`, 'OP_TRUE');
    } else if (p.type === VariableType.BYTES
      || p.type === VariableType.PUBKEY
      || p.type === VariableType.SIG
      || p.type === VariableType.RIPEMD160
      || p.type === VariableType.SHA1
      || p.type === VariableType.SHA256
      || p.type === VariableType.SIGHASHTYPE
      || p.type === VariableType.SIGHASHPREIMAGE
      || p.type === VariableType.OPCODETYPE) {
      asmTemplate.set(`$${p.name}`, '00');
    } else {
      throw new Error(`param ${p.name} has unknown type ${p.type}`);
    }
  });
  return createLibrary(resolver, param, asmTemplate);
}





export function createArray(resolver: ScryptTypeResolver, type: string, name: string, opcodesMap: Map<string, string>): SupportedParamType {

  const arrays: SupportedParamType[] = [];
  const [elemTypeName, sizes] = arrayTypeAndSize(type);

  const arraylen = sizes[0];
  if (sizes.length === 1) {
    for (let index = 0; index < arraylen; index++) {
      const finalType = resolver.resolverType(elemTypeName);

      if (isStructType(finalType)) {

        arrays.push(createStruct(resolver, {
          name: `${name}[${index}]`,
          type: finalType
        }, opcodesMap));
      } else if (isLibraryType(finalType)) {
        arrays.push(createLibrary(resolver, {
          name: `${name}[${index}]`,
          type: finalType
        }, opcodesMap));
      }
      else {
        arrays.push(asm2ScryptType(finalType, opcodesMap.get(`$${name}[${index}]`)));
      }

    }

  } else {

    for (let index = 0; index < arraylen; index++) {
      const finalType = resolver.resolverType(elemTypeName);
      const subArrayType = [finalType, sizes.slice(1).map(size => `[${size}]`).join('')].join('');
      arrays.push(createArray(resolver, subArrayType, `${name}[${index}]`, opcodesMap));
    }
  }

  return arrays;
}


export function toLiteral(value: SupportedParamType): string {

  if (Array.isArray(value)) {
    const v = value as SupportedParamType[];
    return `[${v.map(i => toLiteral(i))}]`;
  } else {

    return value instanceof ScryptType ? value.toLiteral() : value as string;
  }
}
export function isInteger(x: unknown): boolean {

  // check if the passed value is a number
  if (typeof x == 'number' && !isNaN(x)) {

    // check if it is integer
    return Number.isInteger(x);

  } else if (typeof x == 'bigint') {
    return true;
  } else if (typeof x == 'string') {

    // hex int
    let m = /^(0x[0-9a-fA-F]+)$/.exec(x);
    if (m) {
      return true;
    }

    // decimal int
    m = /^(-?\d+)$/.exec(x);
    if (m) {
      return true;
    }

    return false;
  }


  return false;
}



export function findConstStatic(statics: StaticEntity[], name: string): StaticEntity {
  return statics.find(s => {
    return s.const === true && s.name === name;
  });
}
export function findStatic(statics: StaticEntity[], name: string): StaticEntity {
  return statics.find(s => {
    return s.name === name;
  });
}

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// state version
const CURRENT_STATE_VERSION = 0;

export function buildContractCodeASM(asmTemplateArgs: Map<string, string>, asmTemplate: string): string {


  let lsASM = asmTemplate;
  for (const entry of asmTemplateArgs.entries()) {
    const name = entry[0];
    const value = entry[1];
    const re = name.endsWith(']') ? new RegExp(`\\B${escapeRegExp(name)}\\B`, 'g') : new RegExp(`\\B${escapeRegExp(name)}\\b`, 'g');
    lsASM = lsASM.replace(re, value);
  }

  return lsASM;

}

/**
 * only used for state contract
 * @param args 
 * @param firstCall 
 * @param finalTypeResolver 
 * @returns 
 */
export function buildContractState(args: Arguments, firstCall: boolean, finalTypeResolver: TypeResolver): string {

  let state_hex = '';
  let state_len = 0;
  const args_ = flatternStateArgs(args, finalTypeResolver);

  if (args_.length <= 0) {
    throw new Error('no state property found, buildContractState only used for state contract');
  }

  // append firstCall which is a hidden built-in state
  state_hex += `${serializeSupportedParamType(firstCall)}`;

  for (const arg of args_) {
    if (arg.type == VariableType.BOOL) { //fixed length
      state_hex += `${serializeSupportedParamType(arg.value)}`;
    } else if (arg.type === VariableType.INT
      || arg.type === VariableType.BYTES
      || arg.type === VariableType.PUBKEY
      || arg.type === VariableType.PRIVKEY
      || arg.type === VariableType.PUBKEY
      || arg.type === VariableType.SIG
      || arg.type === VariableType.RIPEMD160
      || arg.type === VariableType.SHA1
      || arg.type === VariableType.SHA256
      || arg.type === VariableType.SIGHASHTYPE
      || arg.type === VariableType.SIGHASHPREIMAGE
      || arg.type === VariableType.OPCODETYPE) {
      state_hex += `${bsv.Script.fromASM(serializeSupportedParamType(arg.value)).toHex()}`;
    }
  }

  //append meta
  if (state_hex) {
    state_len = state_hex.length / 2;
    state_hex += num2bin(state_len, 4) + num2bin(CURRENT_STATE_VERSION, 1);
    return state_hex;
  }

  return state_hex;

}



export function buildDefaultStateProps(contract: AbstractContract): Arguments {

  const stateProps = Object.getPrototypeOf(contract).constructor.stateProps as Array<ParamEntity>;

  const flatternparams = flatternParams(stateProps, contract.resolver);

  const asmTemplate: Map<string, string> = new Map();

  flatternparams.forEach(p => {

    if (p.type === VariableType.INT || p.type === VariableType.PRIVKEY) {
      asmTemplate.set(`$${p.name}`, 'OP_0');
    } else if (p.type === VariableType.BOOL) {
      asmTemplate.set(`$${p.name}`, 'OP_TRUE');
    } else if (p.type === VariableType.BYTES
      || p.type === VariableType.PUBKEY
      || p.type === VariableType.SIG
      || p.type === VariableType.RIPEMD160
      || p.type === VariableType.SHA1
      || p.type === VariableType.SHA256
      || p.type === VariableType.SIGHASHTYPE
      || p.type === VariableType.SIGHASHPREIMAGE
      || p.type === VariableType.OPCODETYPE) {
      asmTemplate.set(`$${p.name}`, '00');
    } else {
      throw new Error(`param ${p.name} has unknown type ${p.type}`);
    }

  });

  return stateProps.map(param => deserializeArgfromState(contract.resolver, Object.assign(param, {
    value: undefined
  }), asmTemplate));
}



export function readBytes(br: bsv.encoding.BufferReader): {
  data: string,
  opcodenum: number
} {
  try {
    const opcodenum = br.readUInt8();

    let len, data;
    if (opcodenum == 0) {
      data = '';
    } else if (opcodenum > 0 && opcodenum < bsv.Opcode.OP_PUSHDATA1) {
      len = opcodenum;
      data = br.read(len).toString('hex');
    } else if (opcodenum === bsv.Opcode.OP_PUSHDATA1) {
      len = br.readUInt8();
      data = br.read(len).toString('hex');
    } else if (opcodenum === bsv.Opcode.OP_PUSHDATA2) {
      len = br.readUInt16LE();
      data = br.read(len).toString('hex');
    } else if (opcodenum === bsv.Opcode.OP_PUSHDATA4) {
      len = br.readUInt32LE();
      data = br.read(len).toString('hex');
    } else {
      data = num2bin(opcodenum - 80, 1);
    }

    return {
      data: data,
      opcodenum: opcodenum
    };
  } catch (e) {
    throw new Error('readBytes: ' + e);
  }
}





export function deserializeArgfromASM(resolver: ScryptTypeResolver, arg: Argument, opcodesMap: Map<string, string>): Argument {

  let value;

  const finalType = resolver.resolverType(arg.type);

  if (isStructType(finalType)) {
    value = createStruct(resolver, arg, opcodesMap);
  } else if (isLibraryType(finalType)) {
    value = createLibrary(resolver, arg, opcodesMap);
  } else if (isArrayType(finalType)) {
    value = createArray(resolver, arg.type, arg.name, opcodesMap);
  } else {
    value = asm2ScryptType(arg.type, opcodesMap.get(`$${arg.name}`));
  }

  arg.value = value;
  return arg;
}



export function deserializeArgfromState(resolver: ScryptTypeResolver, arg: Argument, opcodesMap: Map<string, string>): Argument {

  let value;
  const finalType = resolver.resolverType(arg.type);
  if (isStructType(finalType)) {
    value = createStruct(resolver, arg, opcodesMap);
  } else if (isLibraryType(finalType)) {
    value = createDefaultLibrary(resolver, arg);
    const properties = createLibraryProperties(resolver, arg, opcodesMap);
    value.setProperties(properties);
  } else if (isArrayType(finalType)) {
    value = createArray(resolver, arg.type, arg.name, opcodesMap);
  } else {
    value = asm2ScryptType(arg.type, opcodesMap.get(`$${arg.name}`));
  }

  arg.value = value;

  return arg;
}

/**
 * 
 * @param data 
 * @returns flat ScryptType array
 */
function flattenData(data: SupportedParamType): ScryptType[] {

  if (Array.isArray(data)) {
    return data.map((item) => {
      return flattenData(item);
    }).flat(Infinity) as ScryptType[];
  } else if (Struct.isStruct(data)) {
    const argS = data as Struct;
    const keys = argS.getMembers();

    return keys.map(key => {
      const member = argS.memberByKey(key);
      return flattenData(member);
    }).flat(Infinity) as ScryptType[];

  } else if (typeof data === 'boolean') {
    return [new Bool(data as boolean)];
  } else if (typeof data === 'number' || typeof data === 'bigint' || typeof data === 'string') {
    return [new Int(data)];
  } else if (data instanceof ScryptType) {
    return [data];
  }
}

// struct / array: sha256 every single element of the flattened struct / array, and concat the result to a joint byte, and sha256 again 
// basic type: sha256 every single element
export function flattenSha256(data: SupportedParamType): string {
  const flattened = flattenData(data);
  if (flattened.length === 1) {
    let hex = flattened[0].toHex();
    if ((flattened[0] instanceof Bool || flattened[0] instanceof Int) && hex === '00'
    ) {
      hex = '';
    }
    return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
  } else {
    const jointbytes = flattened.map(item => {
      let hex = item.toHex();
      if ((item instanceof Bool || item instanceof Int) && hex === '00'
      ) {
        hex = '';
      }
      return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
    }).join('');

    return bsv.crypto.Hash.sha256(Buffer.from(jointbytes, 'hex')).toString('hex');
  }
}

// sort the map by the result of flattenSha256 of the key
export function sortmap(map: Map<SupportedParamType, SupportedParamType>): Map<SupportedParamType, SupportedParamType> {
  return new Map([...map.entries()].sort((a, b) => {
    return BN.fromSM(Buffer.from(flattenSha256(a[0]), 'hex'), {
      endian: 'little'
    }).cmp(BN.fromSM(Buffer.from(flattenSha256(b[0]), 'hex'), {
      endian: 'little'
    }));
  }));
}

// sort the set by the result of flattenSha256 of the key
export function sortset(set: Set<SupportedParamType>): Set<SupportedParamType> {
  return new Set([...set.keys()].sort((a, b) => {
    return BN.fromSM(Buffer.from(flattenSha256(a), 'hex'), {
      endian: 'little'
    }).cmp(BN.fromSM(Buffer.from(flattenSha256(b), 'hex'), {
      endian: 'little'
    }));
  }));
}


// returns index of the HashedMap/HashedSet by the key
export function findKeyIndex(collection: Map<SupportedParamType, SupportedParamType> | Set<SupportedParamType>, key: SupportedParamType): number {

  if (collection instanceof Map) {
    const sortedMap = sortmap(collection);
    const m = [];

    for (const entry of sortedMap.entries()) {
      m.push(entry);
    }

    return m.findIndex((entry) => {
      if (entry[0] === key) {
        return true;
      }
      return false;
    });
  } else {

    const sortedSet = sortset(collection);
    const m = [];

    for (const entry of sortedSet.keys()) {
      m.push(entry);
    }

    return m.findIndex((entry) => {
      if (entry === key) {
        return true;
      }
      return false;
    });
  }

}


// serialize the HashedMap/HashedSet, but only flattenSha256 of the key and value
export function toData(collection: Map<SupportedParamType, SupportedParamType> | Set<SupportedParamType>): Bytes {

  let storage = '';
  if (collection instanceof Map) {
    const sortedMap = sortmap(collection);

    for (const entry of sortedMap.entries()) {
      storage += flattenSha256(entry[0]) + flattenSha256(entry[1]);
    }
  } else {
    const sortedSet = sortset(collection);
    for (const key of sortedSet.keys()) {
      storage += flattenSha256(key);
    }
  }

  return new Bytes(storage);
}

export function toHashedMap(collection: Map<SupportedParamType, SupportedParamType>): HashedMap {
  const data = toData(collection);
  const hashedMap = new HashedMap(data);

  return hashedMap;
}

export function toHashedSet(collection: Map<SupportedParamType, SupportedParamType>): HashedSet {
  const data = toData(collection);
  const hashedSet = new HashedSet(data);

  return hashedSet;
}

/**
 * check if a type is generic type
 * @param type 
 * @returns 
 */
export function isGenericType(type: string): boolean {
  return /^([\w]+)<([\w,[\]{}\s])+>$/.test(type);
}

/**
 * 
 * @param type eg. HashedMap<int,int>
 * @param eg. ["HashedMap", ["int", "int"]}] An array generic types returned by @getGenericDeclaration
 * @returns {"K": "int", "V": "int"}
 */
export function parseGenericType(type: string): [string, Array<string>] {

  if (isGenericType(type)) {
    const m = type.match(/([\w]+)<([\w,[\]{}\s]+)>$/);
    if (m) {
      const library = m[1];
      const realTypes = m[2].split(',').map(t => t.trim());
      return [library, realTypes];
    }
  }
  throw new Error(`"${type}" is not generic type`);
}


// Equivalent to the built-in function `hash160` in scrypt
export function hash160(hexstr: string): string {
  return bsv.crypto.Hash.sha256ripemd160(Buffer.from(hexstr, 'hex')).toString('hex');
}

// Equivalent to the built-in function `sha256` in scrypt
export function sha256(hexstr: string): string {
  return bsv.crypto.Hash.sha256(Buffer.from(hexstr, 'hex')).toString('hex');
}


// Equivalent to the built-in function `hash256` in scrypt
export function hash256(hexstr: string): string {
  return sha256(sha256(hexstr));
}


const LINKPATTERN = /(\[((!\[[^\]]*?\]\(\s*)([^\s()]+?)\s*\)\]|(?:\\\]|[^\]])*\])\(\s*)(([^\s()]|\([^\s()]*?\))+)\s*(".*?")?\)/g;

export function readLaunchJson(error: VerifyError): DebugLaunch | undefined {
  for (const match of error.matchAll(LINKPATTERN)) {
    if (match[5] && match[5].startsWith('scryptlaunch')) {
      const file = match[5].replace(/scryptlaunch/, 'file');
      return JSON.parse(fs.readFileSync(uri2path(file)).toString());
    }
  }
  return undefined;
}



// Equivalent to the built-in function `len` in scrypt
export function len(hexstr: string): number {
  return hexstr.length / 2;
}

// convert signed integer `n` to unsigned integer of `l` bytes, in little endian
export function toLEUnsigned(n: number, l: number): string {
  // one extra byte to accommodate possible negative sign byte
  const m = num2bin(n, l + 1);
  // remove sign byte
  return m.slice(0, len(m) - 1);
}

// convert 'b' to a VarInt field, including the preceding length
export function writeVarint(b: string): string {
  const n = len(b);

  let header = '';

  if (n < 0xfd) {
    header = toLEUnsigned(n, 1);
  }
  else if (n < 0x10000) {
    header = 'fd' + toLEUnsigned(n, 2);
  }
  else if (n < 0x100000000) {
    header = 'fe' + toLEUnsigned(n, 4);
  }
  else if (n < 0x10000000000000000) {
    header = 'ff' + toLEUnsigned(n, 8);
  }

  return header + b;
}


export function buildOpreturnScript(data: string): Script {
  return bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', data].join(' '));
}


export function buildPublicKeyHashScript(pubKeyHash: Ripemd160): Script {
  return bsv.Script.fromASM(['OP_DUP', 'OP_HASH160', pubKeyHash.toASM(), 'OP_EQUALVERIFY', 'OP_CHECKSIG'].join(' '));
}


/**
 * Parse out which public function is called through unlocking script
 * @param contract 
 * @param hex hex of unlocking script
 * @returns return ABIEntity of the public function which is call by the unlocking script
 */
export function parseAbiFromUnlockingScript(contract: AbstractContract, hex: string): ABIEntity {

  const abis = Object.getPrototypeOf(contract).constructor.abi as ABIEntity[];

  const pubFunAbis = abis.filter(entity => entity.type === 'function');
  const pubFunCount = pubFunAbis.length;

  if (pubFunCount === 1) {
    return pubFunAbis[0];
  }

  const script = bsv.Script.fromHex(hex);

  const usASM = script.toASM() as string;

  const pubFuncIndexASM = usASM.substr(usASM.lastIndexOf(' ') + 1);

  const pubFuncIndex = asm2int(pubFuncIndexASM);


  const entity = abis.find(entity => entity.index === pubFuncIndex);

  if (!entity) {
    const contractName = Object.getPrototypeOf(contract).constructor.contractName;
    throw new Error(`the raw unlocking script cannot match the contract ${contractName}`);
  }

  return entity;
}


export function toScryptType(a: SupportedParamType): ScryptType {
  if (typeof a === 'number' || typeof a === 'bigint' || typeof a === 'string') {
    return new Int(a);
  } else if (typeof a === 'boolean') {
    return new Bool(a);
  } else if (a instanceof ScryptType) {
    return a;
  }
  else {
    throw `${a} cannot be convert to ScryptType`;
  }
}


export function arrayToScryptType(a: SupportedParamType[]): ScryptType[] {
  return a.map(i => {
    if (Array.isArray(i)) {
      return arrayToScryptType(i);
    }
    return toScryptType(i);
  }) as ScryptType[];
}

export function cloneArray(a: SupportedParamType[]): ScryptType[] {
  return a.map(i => {
    if (Array.isArray(i)) {
      return cloneArray(i);
    }
    return toScryptType(i).clone();
  }) as ScryptType[];
}

export function inferrType(a: SupportedParamType): string {
  if (Array.isArray(a)) {
    if (a.length === 0) {
      throw new Error('cannot inferr type from empty array');
    }

    const arg0 = a[0];

    if (Array.isArray(arg0)) {

      if (!a.every(arg => Array.isArray(arg) && arg.length === arg0.length)) {
        throw new Error(`cannot inferr type from [${a}] , not all length of element are the same`);
      }
      const [e, sizes] = arrayTypeAndSize(inferrType(arg0));
      return toLiteralArrayType(e, [a.length].concat(sizes));
    }
    else {

      const t = typeOfArg(arg0);

      if (!a.every(arg => typeOfArg(arg) === t)) {
        throw new Error(`cannot inferr type from [${a}] , not all element types are the same`);
      }

      return `${toScryptType(a[0]).finalType}[${a.length}]`;
    }
  } else {
    return toScryptType(a).finalType;
  }
}



export function resolveGenericType(genericTypeMap: Record<string, string>, type: string): string {
  if (Object.keys(genericTypeMap).length > 0) {
    if (isGenericType(type)) {
      const [name, types] = parseGenericType(type);
      return toGenericType(name, types.map(t => genericTypeMap[t] || t));
    }

    if (isArrayType(type)) {
      const [elem, sizes] = arrayTypeAndSizeStr(type);
      return toLiteralArrayType(elem, sizes.map(t => genericTypeMap[t] || t));
    }

    return genericTypeMap[type] || type;
  }

  return type;
}


export function librarySign(genericEntity: LibraryEntity) {
  return `[${genericEntity.params.map(p => p.type).join(',')}]`;
}

export function structSign(structEntity: StructEntity) {
  return `${JSON.stringify(structEntity.params.reduce((p, v) => Object.assign(p, {
    [v.name]: v.type
  }), {}), null, 4)}`;
}

export function arrayToLiteral(a: SupportedParamType[]): string {

  const al = a.map(i => {
    if (Array.isArray(i)) {
      return arrayToLiteral(i);
    }
    return toScryptType(i).toLiteral();
  }).join(',');

  return `[${al}]`;
}

// If the property is the same as the construction parameter, there may be no constructor, in which case the construction parameter can be assigned to the property. But this does not guarantee that the property is always correct, the user may have modified the value of the property in the constructor
export function canAssignProperty(libraryAst: LibraryEntity): boolean {
  return libraryAst.params.length === libraryAst.properties.length && libraryAst.params.every((param, index) => {
    return param.name === libraryAst.properties[index].name && param.type === libraryAst.properties[index].type;
  });
}