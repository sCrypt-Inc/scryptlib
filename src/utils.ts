import { pathToFileURL, fileURLToPath } from 'url';
import {
  Int,
  Bool,
  Bytes,
  PrivKey,
  PubKey,
  Sig,
  Ripemd160,
  Sha1,
  Sha256,
  SigHashType,
  SigHashPreimage,
  OpCodeType,
  ScryptType,
  ValueType,
  Struct,
  SupportedParamType,
  VariableType,
  BasicType,
  SingletonParamType,
  TypeResolver,
} from './scryptTypes';
import {
  StructEntity,
  compile,
  getPlatformScryptc,
  CompileResult,
  AliasEntity,
  ParamEntity,
} from './compilerWrapper';
import bsv = require('bsv');
import * as fs from 'fs';
import { dirname, join, resolve, sep } from 'path';
import * as minimist from 'minimist';
import { AsmVarValues, TxContext } from './contract';
import { Arguments, DebugConfiguration, DebugLaunch, FileUri } from './abi';
import { tmpdir } from 'os';
import md5 = require('md5');
export { bsv };

const BN = bsv.crypto.BN;
const Interp = bsv.Script.Interpreter;

export const DEFAULT_FLAGS =
  //Interp.SCRIPT_VERIFY_P2SH | Interp.SCRIPT_VERIFY_CLEANSTACK | // no longer applies now p2sh is deprecated: cleanstack only applies to p2sh
  Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES |
  Interp.SCRIPT_ENABLE_MONOLITH_OPCODES | // TODO: to be removed after upgrade to bsv 2.0
  Interp.SCRIPT_VERIFY_STRICTENC |
  Interp.SCRIPT_ENABLE_SIGHASH_FORKID |
  Interp.SCRIPT_VERIFY_LOW_S |
  Interp.SCRIPT_VERIFY_NULLFAIL |
  Interp.SCRIPT_VERIFY_DERSIG |
  Interp.SCRIPT_VERIFY_MINIMALDATA |
  Interp.SCRIPT_VERIFY_NULLDUMMY |
  Interp.SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS |
  Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY |
  Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY;

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
    const number = str.startsWith('0x')
      ? new BN(str.substring(2), 16)
      : new BN(str, 10);

    if (number.eqn(-1)) {
      return 'OP_1NEGATE';
    }

    if (number.gten(0) && number.lten(16)) {
      return 'OP_' + str;
    }

    const m = number.toSM({ endian: 'little' });
    return m.toString('hex');
  } else {
    throw new Error(`invalid str '${str}' to convert to int`);
  }
}

/**
 * decimal int or hex str to number or bigint
 */
export function int2Value(str: string): number | bigint {
  if (/^(-?\d+)$/.test(str) || /^0x([0-9a-fA-F]+)$/.test(str)) {
    const number = str.startsWith('0x')
      ? new BN(str.substring(2), 16)
      : new BN(str, 10);

    if (number.toNumber() < Number.MAX_SAFE_INTEGER) {
      return number.toNumber();
    } else {
      return BigInt(str);
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

export function parseLiteral(
  l: string
): [string /*asm*/, ValueType, VariableType] {
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
    const hexString = getValidatedHexString(m[1]);
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

  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    return [m[1], int2Value(m[1]), VariableType.PRIVKEY];
  }
  // 2) hex int
  m = /^PrivKey\((0x[0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [m[1], int2Value(m[1]), VariableType.PRIVKEY];
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
  m = /^\{([\w(){}[\],\s']+)\}$/.exec(l);
  if (m) {
    // we use object to constructor a struct, no use literal, so here we return empty
    return ['', '', VariableType.STRUCT];
  }

  throw new Error(
    `<${l}> cannot be cast to ASM format, only sCrypt native types supported`
  );
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
      return new Bytes(value as string);
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
      throw new Error(
        `<${l}> cannot be cast to ScryptType, only sCrypt native types supported`
      );
  }
}

export function bytes2Literal(bytearray: Buffer, type: string): string {
  switch (type) {
    case 'bool':
      return BN.fromBuffer(bytearray, { endian: 'little' }).gt(new BN(0))
        ? 'true'
        : 'false';

    case 'int':
    case 'PrivKey':
      return BN.fromSM(bytearray, { endian: 'little' }).toString();

    case 'bytes':
      return `b'${bytesToHexString(bytearray)}'`;

    default:
      return `b'${bytesToHexString(bytearray)}'`;
  }
}

export function bytesToHexString(bytearray: Buffer): string {
  return bytearray.reduce(function (o, c) {
    return (o += ('0' + (c & 0xff).toString(16)).slice(-2));
  }, '');
}

export function hexStringToBytes(hex: string): number[] {
  getValidatedHexString(hex);

  return hex
    .split('')
    .reduce(function (o, c, i) {
      if (i % 2 === 0) {
        o.push(c);
      } else {
        o[o.length - 1] += c;
      }
      return o;
    }, new Array<string>())
    .map((b) => parseInt(b, 16));
}

export function getValidatedHexString(hex: string, allowEmpty = true): string {
  const ret = hex.trim();

  if (ret.length < 1 && !allowEmpty) {
    throw new Error("can't be empty string");
  }

  if (ret.length % 2) {
    throw new Error(`${ret} should have even length`);
  }

  if (ret.length > 0 && !/^[\da-f]+$/i.test(ret)) {
    throw new Error(`${ret} should only contain [0-9] or characters [a-fA-F]`);
  }

  return ret;
}

export function signTx(
  tx,
  privateKey,
  lockingScriptASM: string,
  inputAmount: number,
  inputIndex = 0,
  sighashType = DEFAULT_SIGHASH_TYPE,
  flags = DEFAULT_FLAGS
) {
  if (!tx) {
    throw new Error('param tx can not be empty');
  }

  if (!privateKey) {
    throw new Error('param privateKey can not be empty');
  }

  if (!lockingScriptASM) {
    throw new Error('param lockingScriptASM can not be empty');
  }

  if (!inputAmount) {
    throw new Error('param inputAmount can not be empty');
  }

  return bsv.Transaction.Sighash.sign(
    tx,
    privateKey,
    sighashType,
    inputIndex,
    bsv.Script.fromASM(lockingScriptASM),
    new bsv.crypto.BN(inputAmount),
    flags
  ).toTxFormat();
}

export function toHex(x: { toString(format: 'hex'): string }): string {
  return x.toString('hex');
}

export function getPreimage(
  tx,
  inputLockingScriptASM: string,
  inputAmount: number,
  inputIndex = 0,
  sighashType = DEFAULT_SIGHASH_TYPE,
  flags = DEFAULT_FLAGS
): SigHashPreimage {
  const preimageBuf = bsv.Transaction.Sighash.sighashPreimage(
    tx,
    sighashType,
    inputIndex,
    bsv.Script.fromASM(inputLockingScriptASM),
    new bsv.crypto.BN(inputAmount),
    flags
  );
  return new SigHashPreimage(preimageBuf.toString('hex'));
}

// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// Support Bigint
export function num2bin(
  n: number | bigint | bsv.crypto.BN,
  dataLen: number
): string {
  const num = new BN(n.toString());
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
    m &= 0x7f;
  }
  let mHex = m.toString(16);
  if (mHex.length < 2) {
    mHex = '0' + mHex;
  }

  const padding =
    n > 0 ? '00'.repeat(paddingLen) : '00'.repeat(paddingLen - 1) + '80';
  return rest + mHex + padding;
}

//Support Bigint
export function bin2num(s: string | Buffer): bigint {
  const hex = s.toString('hex');
  const lastByte = hex.substring(hex.length - 2);
  const rest = hex.substring(0, hex.length - 2);
  const m = parseInt(lastByte, 16);
  const n = m & 0x7f;
  let nHex = n.toString(16);
  if (nHex.length < 2) {
    nHex = '0' + nHex;
  }
  //Support negative number
  let bn = BN.fromHex(rest + nHex, { endian: 'little' });
  if (m >> 7) {
    bn = bn.neg();
  }
  return BigInt(bn);
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

export function findStructByName(
  name: string,
  s: StructEntity[]
): StructEntity {
  return s.find((s) => {
    return s.name == name;
  });
}

export function isStructType(type: string): boolean {
  return /^struct\s(\w+)\s\{\}$/.test(type);
}

// test struct Token {}[3], int[3], st.b.c[3]
export function isArrayType(type: string): boolean {
  return /^\w[\w.\s{}]+(\[[\w.]+\])+$/.test(type);
}

export function getStructNameByType(type: string): string {
  const m = /^struct\s(\w+)\s\{\}$/.exec(type.trim());
  if (m) {
    return m[1];
  }
  return '';
}

export function findStructByType(
  type: string,
  s: StructEntity[]
): StructEntity | undefined {
  const name = getStructNameByType(type);
  if (name) {
    return findStructByName(name, s);
  }
  return undefined;
}

export function checkStruct(
  s: StructEntity,
  arg: Struct,
  typeResolver: TypeResolver
): void {
  s.params.forEach((p) => {
    const member = arg.memberByKey(p.name);

    const finalType = typeOfArg(member);

    const paramFinalType = typeResolver(p.type);

    if (finalType === 'undefined') {
      throw new Error(
        `argument of type struct ${s.name} missing member ${p.name}`
      );
    } else if (finalType != paramFinalType) {
      if (isArrayType(paramFinalType)) {
        const [elemTypeName, arraySize] = arrayTypeAndSize(paramFinalType);
        if (Array.isArray(arg.value[p.name])) {
          if (
            !checkArray(arg.value[p.name] as SupportedParamType[], [
              elemTypeName,
              arraySize,
            ])
          ) {
            throw new Error(
              `checkArray fail, struct ${s.name} property ${p.name} should be ${paramFinalType}`
            );
          }
        } else {
          throw new Error(
            `struct ${s.name} property ${p.name} should be ${paramFinalType}`
          );
        }
      } else {
        throw new Error(
          `wrong argument type, expected ${paramFinalType} but got ${finalType}`
        );
      }
    }
  });

  const members = s.params.map((p) => p.name);
  arg.getMembers().forEach((key) => {
    if (!members.includes(key)) {
      throw new Error(`${key} is not a member of struct ${s.name}`);
    }
  });
}

/**
 * return eg. int[N][N][4] => ['int', ["N","N","4"]]
 * @param arrayTypeName
 */
export function arrayTypeAndSizeStr(
  arrayTypeName: string
): [string, Array<string>] {
  const arraySizes: Array<string> = [];
  [...arrayTypeName.matchAll(/\[([\w.]+)\]+/g)].map((match) => {
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
export function arrayTypeAndSize(
  arrayTypeName: string
): [string, Array<number>] {
  const [elemTypeName, arraySizes] = arrayTypeAndSizeStr(arrayTypeName);
  return [elemTypeName, arraySizes.map((size) => parseInt(size))];
}

export function toLiteralArrayType(
  elemTypeName: string,
  sizes: Array<number>
): string {
  return [elemTypeName, sizes.map((size) => `[${size}]`).join('')].join('');
}

/**
 * return eg. int[2][3][4] => int[3][4]
 * @param arrayTypeName  eg. int[2][3][4]
 */
export function subArrayType(arrayTypeName: string): string {
  const [elemTypeName, sizes] = arrayTypeAndSize(arrayTypeName);
  return toLiteralArrayType(elemTypeName, sizes.slice(1));
}

export function checkArray(
  args: SupportedParamType[],
  arrayInfo: [string, Array<number>]
): boolean {
  const [elemTypeName, arraySizes] = arrayInfo;

  if (!Array.isArray(args)) {
    return false;
  }

  const len = arraySizes[0];

  if (!len) {
    return false;
  }

  if (args.length !== len) {
    return false;
  }

  if (
    !args.every((arg) => {
      if (Array.isArray(arg)) {
        return checkArray(arg, [elemTypeName, arraySizes.slice(1)]);
      } else {
        const scryptType = typeOfArg(arg);

        return scryptType === elemTypeName && arraySizes.length == 1;
      }
    })
  ) {
    return false;
  }

  return true;
}

export function subscript(index: number, arraySizes: Array<number>): string {
  if (arraySizes.length == 1) {
    return `[${index}]`;
  } else if (arraySizes.length > 1) {
    const subArraySizes = arraySizes.slice(1);
    const offset = subArraySizes.reduce(function (acc, val) {
      return acc * val;
    }, 1);
    return `[${Math.floor(index / offset)}]${subscript(
      index % offset,
      subArraySizes
    )}`;
  }
}

export function flatternArray(
  arg: Array<any>,
  name: string,
  finalType: string
): Array<{ value: ScryptType; name: string; type: string }> {
  if (!Array.isArray(arg)) {
    throw new Error('flatternArray only work on array');
  }

  const [elemTypeName, arraySizes] = arrayTypeAndSize(finalType);

  return arg
    .map((item, index) => {
      if (typeof item === 'boolean') {
        item = new Bool(item as boolean);
      } else if (typeof item === 'number') {
        item = new Int(item as number);
      } else if (typeof item === 'bigint') {
        item = new Int(item as bigint);
      } else if (Array.isArray(item)) {
        return flatternArray(
          item,
          `${name}[${index}]`,
          subArrayType(finalType)
        );
      } else if (Struct.isStruct(item)) {
        return flatternStruct(item, `${name}[${index}]`);
      } else {
        item = item as ScryptType;
      }

      return {
        value: item,
        name: `${name}${subscript(index, arraySizes)}`,
        type: elemTypeName,
      };
    })
    .flat(Infinity) as Array<{ value: ScryptType; name: string; type: string }>;
}

export function flatternStruct(
  arg: SupportedParamType,
  name: string
): Array<{ value: ScryptType; name: string; type: string }> {
  if (Struct.isStruct(arg)) {
    const argS = arg as Struct;
    const keys = argS.getMembers();

    return keys
      .map((key) => {
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
            type: member.type,
          };
        }
      })
      .flat(Infinity) as Array<{
      value: ScryptType;
      name: string;
      type: string;
    }>;
  } else {
    throw new Error(`${arg} should be struct`);
  }
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

  return typeof arg;
}

export function readFileByLine(path: string, index: number): string {
  let result = '';
  fs.readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .every(function (line, i) {
      if (i === index - 1) {
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

function findCompiler(directory): string | undefined {
  if (!directory) {
    directory = dirname(module.parent.filename);
  }
  const compiler = resolve(directory, 'compiler');
  if (fs.existsSync(compiler) && fs.statSync(compiler).isDirectory()) {
    const scryptc = join(compiler, '..', getPlatformScryptc());
    return scryptc;
  }
  const parent = resolve(directory, '..');
  if (parent === directory) {
    return undefined;
  }
  return findCompiler(parent);
}

export function getCIScryptc(): string | undefined {
  const scryptc = findCompiler(__dirname);
  return fs.existsSync(scryptc) ? scryptc : undefined;
}

export function compileContract(file: string, out?: string): CompileResult {
  console.log(`Compiling contract ${file} ...`);

  if (!fs.existsSync(file)) {
    throw `file ${file} not exists!`;
  }

  const argv = minimist(process.argv.slice(2));

  let scryptc = argv.scryptc;
  if (argv.ci || !scryptc) {
    scryptc = getCIScryptc();
  }

  const result = compile(
    { path: file },
    {
      desc: true,
      debug: true,
      sourceMap: true,
      outputDir: out ? out : join(__dirname, '../out'),
      cmdPrefix: scryptc,
    }
  );

  return result;
}

export function newCall(Cls, args: Array<SupportedParamType>) {
  return new (Function.prototype.bind.apply(Cls, [null].concat(args)))();
}

export function genLaunchConfigFile(
  constructorArgs: SupportedParamType[],
  pubFuncArgs: SupportedParamType[],
  pubFunc: string,
  name: string,
  program: string,
  txContext: TxContext,
  asmArgs: AsmVarValues
): FileUri {
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
    pubFuncArgs: pubFuncArgs,
  };

  const debugTxContext = {};

  if (!isEmpty(txContext)) {
    const tx = txContext.tx || '';
    const inputIndex = txContext.inputIndex || 0;
    const inputSatoshis = txContext.inputSatoshis || 0;
    if (tx) {
      Object.assign(debugTxContext, {
        hex: tx.toString(),
        inputIndex,
        inputSatoshis,
      });
    }
    if (typeof txContext.opReturn === 'string') {
      Object.assign(debugTxContext, { opReturn: txContext.opReturn });
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
    configurations: [debugConfig],
  };

  const jsonstr = JSON.stringify(
    launch,
    (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
    2
  );

  if (isNode()) {
    const filename = `${name}-launch.json`;
    const file = join(fs.mkdtempSync(`${tmpdir()}${sep}sCrypt.`), filename);
    fs.writeFileSync(file, jsonstr);
    return path2uri(file);
  } else {
    console.error(`${pubFunc}() call fail, see launch.json`, jsonstr);
  }
}

/***
 * resolve type
 */
export function resolveType(alias: AliasEntity[], type: string): string {
  if (isArrayType(type)) {
    const [elemTypeName, sizes] = arrayTypeAndSize(type);
    return toLiteralArrayType(resolveType(alias, elemTypeName), sizes);
  }

  if (isStructType(type)) {
    return resolveType(alias, getStructNameByType(type));
  }

  const a = alias.find((a) => {
    return a.name === type;
  });

  if (a) {
    return resolveType(alias, a.type);
  } else {
    if (BasicType.indexOf(type) > -1) {
      return type;
    } else {
      // should be struct if it is not basic type
      return `struct ${type} {}`;
    }
  }
}

export function printDebugUri() {
  const argv = minimist(process.argv.slice(2));
  return argv.debugUri === true || !isNode();
}

export function ansiRegex({ onlyFirst = false } = {}) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|');

  return new RegExp(pattern, onlyFirst ? undefined : 'g');
}

export function stripAnsi(string) {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }

  return string.replace(ansiRegex(), '');
}
