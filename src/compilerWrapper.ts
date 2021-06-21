import { basename, dirname, join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync, readdirSync } from 'fs';
import { ContractDescription } from './contract';
import * as os from 'os';
import md5 = require('md5');
import { path2uri, isArrayType, arrayTypeAndSizeStr, toLiteralArrayType, resolveType, isStructType, getStructNameByType, arrayTypeAndSize } from './utils';
import compareVersions = require('compare-versions');
import JSONbig = require('json-bigint');
const SYNTAX_ERR_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}(unexpected (?<unexpected>[^\n]+)\nexpecting (?<expecting>[^\n]+)|(?<message>[^\n]+))/g;
const SEMANTIC_ERR_REG = /Error:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const INTERNAL_ERR_REG = /Internal error:(?<message>.+)/;
const WARNING_REG = /Warning:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const JSONbigAlways = JSONbig({ alwaysParseAsBig: true, constructorAction: 'preserve' });


//SOURCE_REG parser src eg: [0:6:3:8:4#Bar.constructor:0]
const SOURCE_REG = /^(?<fileIndex>-?\d+):(?<line>\d+):(?<col>\d+):(?<endLine>\d+):(?<endCol>\d+)(#(?<tagStr>.+))?/;

// see VERSIONLOG.md
const CURRENT_CONTRACT_DESCRIPTION_VERSION = 4;
export enum CompileErrorType {
  SyntaxError = 'SyntaxError',
  SemanticError = 'SemanticError',
  InternalError = 'InternalError',
  Warning = 'Warning'
}


export enum BuildType {
  Debug = 'debug',
  Release = 'release'
}

export interface CompileErrorBase {
  type: string;
  filePath: string;
  position: [{
    line: number;
    column: number;
  }, {
    line: number;
    column: number;
  }?];
  message: string;
}

export interface SyntaxError extends CompileErrorBase {
  type: CompileErrorType.SyntaxError;
  unexpected: string;
  expecting: string;
}

export interface SemanticError extends CompileErrorBase {
  type: CompileErrorType.SemanticError;
}

export interface InternalError extends CompileErrorBase {
  type: CompileErrorType.InternalError;
}

export interface Warning extends CompileErrorBase {
  type: CompileErrorType.Warning;
}

export type CompileError = SyntaxError | SemanticError | InternalError | Warning;

export interface CompileResult {
  asm?: OpCode[];
  ast?: Record<string, unknown>;
  dependencyAsts?: Record<string, unknown>;
  abi?: Array<ABIEntity>;
  errors: CompileError[];
  warnings: Warning[];
  compilerVersion?: string;
  contract?: string;
  md5?: string;
  structs?: any;
  alias?: any;
  file?: string;
  buildType?: string;
  autoTypedVars?: AutoTypedVar[];
}

export enum DebugModeTag {
  FuncStart = 'F0',
  FuncEnd = 'F1',
  LoopStart = 'L0'
}


export interface Pos {
  file: string;
  line: number;
  endLine: number;
  column: number;
  endColumn: number;
}

export interface OpCode {
  opcode: string;
  stack?: string[];
  pos?: Pos;
  debugTag?: DebugModeTag;
}

export interface AutoTypedVar {
  name: string;
  pos: Pos;
  type: string;
}

export interface ABI {
  contract: string, abi: Array<ABIEntity>
}

export enum ABIEntityType {
  FUNCTION = 'function',
  CONSTRUCTOR = 'constructor'
}
export type ParamEntity = {
  name: string;
  type: string;
}
export interface ABIEntity {
  type: ABIEntityType;
  name?: string;
  params: Array<ParamEntity>;
  index?: number;
}

export interface StructEntity {
  name: string;
  params: Array<ParamEntity>;
}

export interface AliasEntity {
  name: string;
  type: string;
}

export function compile(
  source: {
    path: string,
    content?: string,
  },
  settings: {
    ast?: boolean,
    asm?: boolean,
    debug?: boolean,
    desc?: boolean,
    outputDir?: string,
    outputToFiles?: boolean,
    cwd?: string,
    cmdPrefix?: string,
    cmdArgs?: string,
    buildType?: string,
    timeout?: number  // in ms
  } = {
    asm: true,
    debug: true,
  }
): CompileResult {
  const st = Date.now();
  const sourcePath = source.path;
  const srcDir = dirname(sourcePath);
  const curWorkingDir = settings.cwd || srcDir;
  const sourceFileName = basename(sourcePath);
  const outputDir = settings.outputDir || srcDir;
  const timeout = settings.timeout || 1200000;
  const outputFiles = {};
  try {
    const sourceContent = source.content !== undefined ? source.content : readFileSync(sourcePath, 'utf8');
    const cmdPrefix = settings.cmdPrefix || getDefaultScryptc();
    const cmd = `${cmdPrefix} compile ${settings.asm || settings.desc ? '--asm' : ''} ${settings.ast || settings.desc ? '--ast' : ''} ${settings.debug == false ? '' : '--debug'} -r -o "${outputDir}" ${settings.cmdArgs ? settings.cmdArgs : ''}`;
    let output = execSync(cmd, { input: sourceContent, cwd: curWorkingDir, timeout }).toString();
    // Because the output of the compiler on the win32 platform uses crlf as a newline， here we change \r\n to \n. make SYNTAX_ERR_REG、SEMANTIC_ERR_REG、IMPORT_ERR_REG work.
    output = output.split(/\r?\n/g).join('\n');
    let result: CompileResult = { errors: [], warnings: [] };
    if (output.startsWith('Error:') || output.startsWith('Warning:')) {
      result = getErrorsAndWarnings(output, srcDir, sourceFileName);

      if (result.errors.length > 0) {
        return result;
      }

    }



    if (settings.ast || settings.desc) {
      const outputFilePath = getOutputFilePath(outputDir, 'ast');
      outputFiles['ast'] = outputFilePath;


      const allAst = addSourceLocation(JSONbigAlways.parse(readFileSync(outputFilePath, 'utf8')), srcDir, sourceFileName);

      const sourceUri = path2uri(sourcePath);
      result.file = sourceUri;
      result.ast = allAst[sourceUri];
      delete allAst[sourceUri];
      result.dependencyAsts = allAst;
      result.alias = getAliasDeclaration(result.ast, allAst);

      const staticConstInt = getStaticConstIntDeclaration(result.ast, allAst);
      const { contract: name, abi } = getABIDeclaration(result.ast, result.alias, staticConstInt);

      result.abi = abi;
      result.contract = name;
      result.structs = getStructDeclaration(result.ast, allAst);

    }

    let asmObj = null;

    if (settings.asm || settings.desc) {
      const outputFilePath = getOutputFilePath(outputDir, 'asm');
      outputFiles['asm'] = outputFilePath;

      asmObj = JSON.parse(readFileSync(outputFilePath, 'utf8'));
      const sources = asmObj.sources;
      result.asm = asmObj.output.map(item => {

        if (!settings.debug) {
          return {
            opcode: item.opcode
          };
        }

        const match = SOURCE_REG.exec(item.src);

        if (match && match.groups) {
          const fileIndex = parseInt(match.groups.fileIndex);

          let debugTag: DebugModeTag | undefined;

          const tagStr = match.groups.tagStr;
          if (/\w+\.\w+:0/.test(tagStr)) {
            debugTag = DebugModeTag.FuncStart;
          }
          if (/\w+\.\w+:1/.test(tagStr)) {
            debugTag = DebugModeTag.FuncEnd;
          }
          if (/loop:0/.test(tagStr)) {
            debugTag = DebugModeTag.LoopStart;
          }

          const pos: Pos | undefined = sources[fileIndex] ? {
            file: sources[fileIndex] ? getFullFilePath(sources[fileIndex], srcDir, sourceFileName) : undefined,
            line: sources[fileIndex] ? parseInt(match.groups.line) : undefined,
            endLine: sources[fileIndex] ? parseInt(match.groups.endLine) : undefined,
            column: sources[fileIndex] ? parseInt(match.groups.col) : undefined,
            endColumn: sources[fileIndex] ? parseInt(match.groups.endCol) : undefined,
          } : undefined;

          return {
            opcode: item.opcode,
            stack: item.stack,
            pos: pos,
            debugTag
          };
        }
        throw new Error('Compile Failed: Asm output parsing Error!');
      });


      if (settings.debug) {
        result.autoTypedVars = asmObj.autoTypedVars.map(item => {
          const match = SOURCE_REG.exec(item.src);
          if (match && match.groups) {
            const fileIndex = parseInt(match.groups.fileIndex);

            const pos: Pos | undefined = sources[fileIndex] ? {
              file: sources[fileIndex] ? getFullFilePath(sources[fileIndex], srcDir, sourceFileName) : undefined,
              line: sources[fileIndex] ? parseInt(match.groups.line) : undefined,
              endLine: sources[fileIndex] ? parseInt(match.groups.endLine) : undefined,
              column: sources[fileIndex] ? parseInt(match.groups.col) : undefined,
              endColumn: sources[fileIndex] ? parseInt(match.groups.endCol) : undefined,
            } : undefined;
            return {
              name: item.name,
              type: item.type,
              pos: pos
            };
          }
        });
      }
    }

    if (settings.desc) {
      settings.outputToFiles = true;
      const outputFilePath = getOutputFilePath(outputDir, 'desc');
      outputFiles['desc'] = outputFilePath;
      const description: ContractDescription = {
        version: CURRENT_CONTRACT_DESCRIPTION_VERSION,
        compilerVersion: compilerVersion(settings.cmdPrefix ? settings.cmdPrefix : getDefaultScryptc()),
        contract: result.contract,
        md5: md5(sourceContent),
        structs: result.structs || [],
        alias: result.alias || [],
        abi: result.abi || [],
        buildType: settings.buildType || BuildType.Debug,
        file: '',
        asm: result.asm.map(item => item['opcode'].trim()).join(' '),
        sources: [],
        sourceMap: []
      };

      if (settings.debug && asmObj) {
        Object.assign(description, {
          file: result.file,
          sources: asmObj.sources.map(source => getFullFilePath(source, srcDir, sourceFileName)),
          sourceMap: asmObj.output.map(item => item.src),
        });
      }
      writeFileSync(outputFilePath, JSON.stringify(description, null, 4));

      result.compilerVersion = description.compilerVersion;
      result.md5 = description.md5;
    }

    return result;
  } finally {
    if (settings.outputToFiles) {
      Object.keys(outputFiles).forEach(outputType => {
        const file = outputFiles[outputType];
        if (existsSync(file)) {
          if (settings[outputType]) {
            // rename all output files
            renameSync(file, file.replace('stdin', basename(sourcePath, '.scrypt')));
          } else {
            unlinkSync(file);
          }
        }
      });
    } else {
      // cleanup all output files
      Object.values<string>(outputFiles).forEach(file => {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      });
    }
    // console.log('compile time spent: ', Date.now() - st)
  }
}

export function compilerVersion(cwd?: string): string {
  const text = execSync(`${cwd} version`).toString();
  return /Version:\s*([^\s]+)\s*/.exec(text)[1];
}

function addSourceLocation(astRoot, basePath: string, curFileName: string) {
  for (const fileName in astRoot) {
    if (fileName === 'std') {
      astRoot['std'] = _addSourceLocationProperty(astRoot['std'], 'std');
    } else {
      const realFileName = fileName === 'stdin' ? curFileName : fileName;
      const uri = path2uri(join(basePath, realFileName));
      astRoot[uri] = _addSourceLocationProperty(astRoot[fileName], uri);
      delete astRoot[fileName];
    }
  }
  return astRoot;
}

function _addSourceLocationProperty(astObj, uri: string | null) {

  if (!(typeof astObj === 'object')) { return astObj; }
  for (const field in astObj) {
    const value = astObj[field];
    if (field === 'src') {
      const matches = /:(\d+):(\d+):(\d+):(\d+)/.exec(value);
      if (!matches) {
        astObj.loc = null;
      } else {
        astObj.loc = {
          source: uri,
          start: { line: parseInt(matches[1]), column: parseInt(matches[2]) },
          end: { line: parseInt(matches[3]), column: parseInt(matches[4]) }
        };
      }
      delete astObj['src'];
    } else if (typeof value === 'object') {
      _addSourceLocationProperty(value, uri);
    }
  }

  return astObj;
}

function getOutputFilePath(baseDir: string, target: 'ast' | 'asm' | 'desc'): string {
  return join(baseDir, `stdin_${target}.json`);
}

function getFullFilePath(relativePath: string, baseDir: string, curFileName: string): string {
  if (relativePath.endsWith('stdin')) {
    return join(baseDir, curFileName); // replace 'stdin' with real current compiling file name.
  }

  if (relativePath === 'std') {
    return 'std'; // 
  }

  return join(baseDir, relativePath);
}

function getConstructorDeclaration(mainContract): ABIEntity {
  // explict constructor
  if (mainContract['constructor']) {
    return {
      type: ABIEntityType.CONSTRUCTOR,
      params: mainContract['constructor']['params'].map(p => { return { name: p['name'], type: p['type'] }; }),
    };
  } else {
    // implicit constructor
    if (mainContract['properties']) {
      return {
        type: ABIEntityType.CONSTRUCTOR,
        params: mainContract['properties'].map(p => { return { name: p['name'].replace('this.', ''), type: p['type'] }; }),
      };
    }
  }
}

function getPublicFunctionDeclaration(mainContract): ABIEntity[] {
  let pubIndex = 0;
  const interfaces: ABIEntity[] =
    mainContract['functions']
      .filter(f => f['visibility'] === 'Public')
      .map(f => {
        const entity: ABIEntity = {
          type: ABIEntityType.FUNCTION,
          name: f['name'],
          index: f['nodeType'] === 'Constructor' ? undefined : pubIndex++,
          params: f['params'].map(p => { return { name: p['name'], type: p['type'] }; }),
        };
        return entity;
      });
  return interfaces;
}



export function getABIDeclaration(astRoot, alias: AliasEntity[], staticConstInt: Record<string, number>): ABI {
  const mainContract = astRoot['contracts'][astRoot['contracts'].length - 1];
  if (!mainContract) {
    return {
      contract: '',
      abi: []
    };
  }

  const interfaces: ABIEntity[] = getPublicFunctionDeclaration(mainContract);
  const constructorABI = getConstructorDeclaration(mainContract);

  interfaces.push(constructorABI);

  interfaces.forEach(abi => {
    abi.params = abi.params.map(param => {
      return Object.assign(param, {
        type: resolveAbiParamType(mainContract['name'], param.type, alias, staticConstInt)
      });
    });
  });

  return {
    contract: mainContract['name'],
    abi: interfaces
  };
}


function resolveAbiParamType(contract: string, type: string, alias: AliasEntity[], staticConstInt: Record<string, number>): string {
  const resolvedConstIntType = resolveArrayTypeWithConstInt(contract, type, staticConstInt);
  const resolvedAliasType = resolveType(alias, resolvedConstIntType);

  if (isStructType(resolvedAliasType)) {
    return getStructNameByType(resolvedAliasType);
  } else if (isArrayType(resolvedAliasType)) {
    const [elemTypeName, arraySizes] = arrayTypeAndSize(resolvedAliasType);
    const elemType = isStructType(elemTypeName) ? getStructNameByType(elemTypeName) : elemTypeName;
    return toLiteralArrayType(elemType, arraySizes);
  }

  return resolvedAliasType;
}

export function resolveArrayTypeWithConstInt(contract: string, type: string, staticConstInt: Record<string, number>): string {

  if (isArrayType(type)) {
    const [elemTypeName, arraySizes] = arrayTypeAndSizeStr(type);

    const sizes = arraySizes.map(size => {
      if (/^(\d)+$/.test(size)) {
        return parseInt(size);
      } else {
        if (size.indexOf('.') > 0) {
          return staticConstInt[size];
        } else {
          return staticConstInt[`${contract}.${size}`];
        }
      }
    });

    return toLiteralArrayType(elemTypeName, sizes);
  }
  return type;
}


export function getStructDeclaration(astRoot, dependencyAsts): Array<StructEntity> {


  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map(ast => {
    return (ast.structs || []).map(s => ({
      name: s['name'],
      params: s['fields'].map(p => { return { name: p['name'], type: p['type'] }; }),
    }));
  }).flat(1);
}


export function getAliasDeclaration(astRoot, dependencyAsts): Array<AliasEntity> {

  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map(ast => {
    return (ast.alias || []).map(s => ({
      name: s['alias'],
      type: s['type'],
    }));
  }).flat(1);
}

export function getStaticConstIntDeclaration(astRoot, dependencyAsts): Record<string, number> {

  const allAst = [astRoot];
  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map((ast, index) => {
    return (ast.contracts || []).map(contract => {
      return (contract.statics || []).filter(s => (
        s.const === true && s.expr.nodeType === 'IntLiteral'
      )).map(s => {

        return {
          name: `${contract.name}.${s.name}`,
          value: s.expr.value
        };
      });
    });
  }).flat(Infinity).reduce((acc, item) => (acc[item.name] = item.value, acc), {} as Record<string, number>);
}


export function getPlatformScryptc(): string {
  switch (os.platform()) {
  case 'win32':
    return 'compiler/scryptc/win32/scryptc.exe';
  case 'linux':
    return 'compiler/scryptc/linux/scryptc';
  case 'darwin':
    return 'compiler/scryptc/mac/scryptc';
  default:
    throw `sCrypt doesn't support ${os.platform()}`;
  }
}

function vscodeExtensionPath(): string {
  const homedir = os.homedir();
  const extensionPath = join(homedir, '.vscode/extensions');
  if (!existsSync(extensionPath)) {
    throw 'No Visual Studio Code extensions found. Please ensure Visual Studio Code is installed.';
  }
  return extensionPath;
}

function findVscodeScrypt(extensionPath: string): string {
  const sCryptPrefix = 'bsv-scrypt.scrypt-';
  let versions = readdirSync(extensionPath).reduce((filtered, item) => {
    if (item.indexOf(sCryptPrefix) > -1) {
      const version = item.substring(sCryptPrefix.length);
      if (compareVersions.validate(version)) {
        filtered.push(version);
      }
    }
    return filtered;
  }, []);

  // compareVersions is ascending, so reverse.
  versions = versions.sort(compareVersions).reverse();
  return sCryptPrefix + versions[0];
}

export function getDefaultScryptc(): string {


  const extensionPath = vscodeExtensionPath();

  const sCrypt = findVscodeScrypt(extensionPath);
  if (!sCrypt) {
    throw `No sCrypt extension found. Please install it at extension marketplace:
		https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt`;
  }

  const scryptc = join(extensionPath, sCrypt, getPlatformScryptc());

  if (!existsSync(scryptc)) {
    throw 'No sCrypt compiler found. Please update your sCrypt extension to the latest version';
  }

  return scryptc;
}



export function desc2CompileResult(description: ContractDescription): CompileResult {
  const sources = description.sources;
  const asm = description.asm.split(' ');
  const errorMessage = 'Contract description version deprecated,  Please update your sCrypt extension to the latest version and recompile';
  if (description.version === undefined) {
    throw new Error(errorMessage);
  }

  if (description.version < CURRENT_CONTRACT_DESCRIPTION_VERSION) {
    console.warn(errorMessage);
  }

  const result: CompileResult = {
    compilerVersion: description.compilerVersion,
    contract: description.contract,
    md5: description.md5,
    abi: description.abi,
    structs: description.structs,
    alias: description.alias,
    file: description.file,
    buildType: description.buildType || BuildType.Debug,
    errors: [],
    warnings: [],
    asm: asm.map((opcode, index) => {
      const item = description.sourceMap && description.sourceMap[index];
      if (item) {
        const match = SOURCE_REG.exec(item);
        if (match && match.groups) {
          const fileIndex = parseInt(match.groups.fileIndex);

          const pos: Pos | undefined = sources[fileIndex] ? {
            file: sources[fileIndex],
            line: sources[fileIndex] ? parseInt(match.groups.line) : undefined,
            endLine: sources[fileIndex] ? parseInt(match.groups.endLine) : undefined,
            column: sources[fileIndex] ? parseInt(match.groups.col) : undefined,
            endColumn: sources[fileIndex] ? parseInt(match.groups.endCol) : undefined,
          } : undefined;

          return {
            pos: pos,
            opcode: opcode,
            stack: []
          };
        }
      }

      return {
        opcode: opcode,
        stack: []
      };
    })
  };
  return result;
}

function getErrorsAndWarnings(output: string, srcDir: string, sourceFileName: string): CompileResult {
  const warnings: Warning[] = [...output.matchAll(WARNING_REG)].map(match => {
    const filePath = match.groups?.filePath || '';
    let message = match.groups?.message || '';

    message = message.replace(/Variable `(?<varName>\w+)` shadows existing binding at (?<fileIndex>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+)/,
      'Variable `$1` shadows existing binding at $3:$4:$5:$6');
    return {
      type: CompileErrorType.Warning,
      filePath: getFullFilePath(filePath, srcDir, sourceFileName),
      position: [{
        line: parseInt(match.groups?.line || '-1'),
        column: parseInt(match.groups?.column || '-1'),
      }, {
        line: parseInt(match.groups?.line1 || '-1'),
        column: parseInt(match.groups?.column1 || '-1'),
      }],
      message: message
    };
  });


  if (output.match(INTERNAL_ERR_REG)) {
    return {
      warnings: warnings,
      errors: [{
        type: CompileErrorType.InternalError,
        filePath: getFullFilePath('stdin', srcDir, sourceFileName),
        message: `Compiler internal error: ${output.match(INTERNAL_ERR_REG).groups?.message || ''}`,
        position: [{
          line: 1,
          column: 1
        }, {
          line: 1,
          column: 1
        }]
      }]
    };
  } else if (output.includes('Syntax error:')) {
    const syntaxErrors: CompileError[] = [...output.matchAll(SYNTAX_ERR_REG)].map(match => {
      const filePath = match.groups?.filePath || '';
      const unexpected = match.groups?.unexpected || '';
      const expecting = match.groups?.expecting || '';
      return {
        type: CompileErrorType.SyntaxError,
        filePath: getFullFilePath(filePath, srcDir, sourceFileName),
        position: [{
          line: parseInt(match.groups?.line || '-1'),
          column: parseInt(match.groups?.column || '-1'),
        }],
        message: match.groups?.message || `unexpected ${unexpected}\nexpecting ${expecting}`,
        unexpected,
        expecting,
      };
    });
    return {
      warnings: warnings,
      errors: syntaxErrors
    };
  }
  else {

    const semanticErrors: CompileError[] = [...output.matchAll(SEMANTIC_ERR_REG)].map(match => {
      let message = match.groups?.message || '';
      const filePath = match.groups?.filePath || '';

      message = message.replace(/Symbol `(?<varName>\w+)` already defined at (?<fileIndex>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+)/,
        'Symbol `$1` already defined at $3:$4:$5:$6');

      return {
        type: CompileErrorType.SemanticError,
        filePath: getFullFilePath(filePath, srcDir, sourceFileName),
        position: [{
          line: parseInt(match.groups?.line || '-1'),
          column: parseInt(match.groups?.column || '-1'),
        }, {
          line: parseInt(match.groups?.line1 || '-1'),
          column: parseInt(match.groups?.column1 || '-1'),
        }],
        message: message
      };
    });
    return {
      warnings: warnings,
      errors: semanticErrors
    };
  }
}