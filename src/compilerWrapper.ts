import { ChildProcess, exec, execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import {
  buildTypeResolver, ContractArtifact, CURRENT_CONTRACT_ARTIFACT_VERSION, findCompiler, hash160, md5, path2uri, resolveConstValue, TypeResolver
} from './internal';
import rimraf = require('rimraf');
import JSONbig = require('json-bigint');


const SYNTAX_ERR_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}(unexpected (?<unexpected>[^\n]+)\nexpecting (?<expecting>[^\n]+)|(?<message>[^\n]+))/g;
const SEMANTIC_ERR_REG = /Error:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const INTERNAL_ERR_REG = /Internal error:(?<message>.+)/;
const WARNING_REG = /Warning:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const JSONbigAlways = JSONbig({ alwaysParseAsBig: true, constructorAction: 'preserve' });



//SOURCE_REG parser src eg: [0:6:3:8:4#Bar.constructor:0]
export const SOURCE_REG = /^(?<fileIndex>-?\d+):(?<line>\d+):(?<col>\d+):(?<endLine>\d+):(?<endCol>\d+)(#(?<tagStr>.+))?/;
const RELATED_INFORMATION_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+)/gi;

// see VERSIONLOG.md

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

export interface RelatedInformation {
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
  relatedInformation: RelatedInformation[]
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

export class CompileResult {

  constructor(public errors: CompileError[], public warnings: Warning[]) {

  }

  asm?: OpCode[];
  hex?: string;
  ast?: Record<string, unknown>;
  dependencyAsts?: Record<string, unknown>;
  abi?: Array<ABIEntity>;
  stateProps?: Array<ParamEntity>;
  compilerVersion?: string;
  contract?: string;
  md5?: string;
  structs?: Array<StructEntity>;
  library?: Array<LibraryEntity>;
  contracts?: Array<ContractEntity>;
  alias?: Array<AliasEntity>;
  file?: string;
  buildType?: string;
  autoTypedVars?: AutoTypedVar[];
  statics?: Array<StaticEntity>;
  sources?: Array<string>;
  sourceMap?: Array<string>;
  sourceMapFile?: string;
  dbgFile?: string;

  toArtifact(): ContractArtifact {

    const artifact: ContractArtifact = {
      version: CURRENT_CONTRACT_ARTIFACT_VERSION,
      compilerVersion: this.compilerVersion || '0.0.0',
      contract: this.contract || '',
      md5: this.md5 || '',
      structs: this.structs || [],
      library: this.library || [],
      alias: this.alias || [],
      abi: this.abi || [],
      stateProps: this.stateProps || [],
      buildType: this.buildType || BuildType.Debug,
      file: this.file || '',
      hex: this.hex || '',
      asm: '',
      sourceMap: [],
      sources: [],
      sourceMapFile: this.sourceMapFile || '',
    };

    return artifact;
  }
}


export enum DebugModeTag {
  FuncStart = 'F0',
  FuncEnd = 'F1',
  LoopStart = 'L0'
}

export interface DebugInfo {
  tag: DebugModeTag;
  contract: string;
  func: string;
  context: string;
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
  topVars?: string[];
  pos?: Pos;
  debugInfo?: DebugInfo;
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
  type: string;
  name?: string;
  params: Array<ParamEntity>;
  index?: number;
}

export interface StructEntity {
  name: string;
  params: Array<ParamEntity>;
  genericTypes: Array<string>;
}
export interface LibraryEntity extends StructEntity {
  properties: Array<ParamEntity>;
}
export interface AliasEntity {
  name: string;
  type: string;
}

export type ContractEntity = LibraryEntity

export interface StaticEntity {
  name: string;
  type: string;
  const: boolean;
  value?: any;
}

export interface CompilingSettings {
  ast?: boolean,
  asm?: boolean,
  hex?: boolean,
  debug?: boolean,
  artifact?: boolean,
  outputDir?: string,
  outputToFiles?: boolean,
  cwd?: string,
  cmdPrefix?: string,
  cmdArgs?: string,
  buildType?: string,
  stdout?: boolean,
  sourceMap?: boolean,
  timeout?: number  // in ms
}

function toOutputDir(artifactsDir: string, sourcePath: string) {
  return join(artifactsDir, basename(sourcePath) + '-' + hash160(sourcePath, 'utf-8').substring(0, 10));
}
export function doCompileAsync(source: {
  path: string,
  content?: string,
}, settings: CompilingSettings, callback?: (error: Error | null, result: {
  path: string,
  output: string,
  md5: string,
} | null) => void): ChildProcess {
  const sourcePath = source.path;
  const srcDir = dirname(sourcePath);
  const curWorkingDir = settings.cwd || srcDir;

  const timeout = settings.timeout || 1200000;
  const sourceContent = source.content !== undefined ? source.content : readFileSync(sourcePath, 'utf8');
  const cmd = settings2cmd(sourcePath, settings);
  const childProcess = exec(cmd, { cwd: curWorkingDir, timeout, killSignal: 'SIGKILL' },
    (error: Error | null, stdout: string) => {
      if (error) {
        console.error(`exec error: ${error} stdout: ${stdout}`);
        callback(error, null);
        return;
      }

      callback(null, {
        path: sourcePath,
        output: stdout,
        md5: md5(sourceContent),
      });
    });

  childProcess.stdin.write(sourceContent, (error: Error) => {
    if (error) {
      callback(error, null);
      return;
    }

    childProcess.stdin.end();
  });

  return childProcess;
}

export function compileAsync(source: {
  path: string,
  content?: string,
}, settings: CompilingSettings): Promise<CompileResult> {

  settings = Object.assign({}, defaultCompilingSettings, settings);
  return new Promise((resolve, reject) => {
    doCompileAsync(
      source,
      settings,
      async (error: Error, data) => {
        if (error) {
          reject(error);
          return;
        }

        try {

          const result = handleCompilerOutput(source.path, settings, data.output, data.md5);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}


const defaultCompilingSettings = {
  ast: true,
  asm: false,
  hex: true,
  debug: false,
  artifact: false,
  outputDir: '',
  outputToFiles: false,
  cwd: '',
  cmdPrefix: '',
  cmdArgs: '',
  buildType: BuildType.Debug,
  stdout: false,
  sourceMap: false,
  timeout: 1200000  // in ms
};

export function settings2cmd(sourcePath: string, settings: CompilingSettings): string {
  const srcDir = dirname(sourcePath);
  //dir that store artifact file
  const artifactDir = settings.outputDir || srcDir;
  //dir that store ast,asm file
  const outputDir = toOutputDir(artifactDir, sourcePath);
  const cmdPrefix = settings.cmdPrefix || findCompiler();
  let outOption = `-o "${outputDir}"`;
  if (settings.stdout) {
    outOption = '--stdout';
    return `"${cmdPrefix}" compile ${settings.asm || settings.artifact ? '--asm' : ''} ${settings.hex ? '--hex' : ''} ${settings.ast || settings.artifact ? '--ast' : ''} ${settings.debug == true ? '--debug' : ''} -r ${outOption} ${settings.cmdArgs ? settings.cmdArgs : ''}`;
  } else {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir);
    }
  }
  return `"${cmdPrefix}" compile ${settings.hex ? '--hex' : ''} ${settings.ast || settings.artifact ? '--ast' : ''} ${settings.debug == true ? '--debug' : ''} ${settings.sourceMap == true ? '--source-map' : ''} -r ${outOption} ${settings.cmdArgs ? settings.cmdArgs : ''}`;
}

export function compile(
  source: {
    path: string,
    content?: string,
  },
  settings: CompilingSettings
): CompileResult {
  const sourcePath = source.path;
  const srcDir = dirname(sourcePath);
  //dir that stores artifact file

  const curWorkingDir = settings.cwd || srcDir;

  settings = Object.assign({}, defaultCompilingSettings, settings);

  const sourceContent = source.content !== undefined ? source.content : readFileSync(sourcePath, 'utf8');

  const maxBuffer = settings.stdout ? 1024 * 1024 * 100 : 1024 * 1024;
  settings = Object.assign({}, defaultCompilingSettings, settings);
  const cmd = settings2cmd(sourcePath, settings);
  const output = execSync(cmd, { input: sourceContent, cwd: curWorkingDir, timeout: settings.timeout, maxBuffer: maxBuffer }).toString();
  return handleCompilerOutput(sourcePath, settings, output, md5(sourceContent));
}

export function handleCompilerOutput(
  sourcePath: string,
  settings: CompilingSettings,
  output: string,
  md5: string,
): CompileResult {

  const srcDir = dirname(sourcePath);
  const sourceFileName = basename(sourcePath);
  const artifactsDir = settings.outputDir || srcDir;
  const outputDir = toOutputDir(artifactsDir, sourcePath);
  const outputFiles = {};
  try {
    // Because the output of the compiler on the win32 platform uses crlf as a newline， here we change \r\n to \n. make SYNTAX_ERR_REG、SEMANTIC_ERR_REG、IMPORT_ERR_REG work.
    output = output.split(/\r?\n/g).join('\n');
    const result: CompileResult = new CompileResult([], []);
    result.compilerVersion = compilerVersion(settings.cmdPrefix ? settings.cmdPrefix : findCompiler());
    result.md5 = md5;
    result.buildType = settings.buildType || BuildType.Debug;
    if (output.startsWith('Error:') || output.startsWith('Warning:')) {
      Object.assign(result, getErrorsAndWarnings(output, srcDir, sourceFileName));

      if (result.errors.length > 0) {
        return result;
      }

      if (settings.stdout && result.warnings.length > 0) { // stdout not allowed warnings
        return result;
      }
    }


    if (settings.stdout) {
      const stdout = JSONbigAlways.parse(output);

      parserAst(result, stdout.ast, srcDir, sourceFileName, sourcePath);

      parserASM(result, stdout.asm, settings, srcDir, sourceFileName);

    } else {

      if (settings.ast || settings.artifact) {

        const outputFilePath = getOutputFilePath(outputDir, 'ast');
        const astFile = outputFilePath.replace('stdin', basename(sourcePath, '.scrypt'));
        renameSync(outputFilePath, astFile);
        outputFiles['ast'] = astFile;
        const ast = JSONbigAlways.parse(readFileSync(astFile, 'utf8'));
        parserAst(result, ast, srcDir, sourceFileName, sourcePath);
      }


      if (settings.hex || settings.artifact) {

        const outputFilePath = getOutputFilePath(outputDir, 'hex');
        const hexFile = outputFilePath.replace('stdin', basename(sourcePath, '.scrypt'));
        renameSync(outputFilePath, hexFile);
        outputFiles['hex'] = hexFile;
        result.hex = readFileSync(hexFile, 'utf8');
      }

      if (settings.sourceMap) {
        const outputFilePath = getOutputFilePath(outputDir, 'map');
        if (settings.artifact) {
          const dist = getOutputFilePath(artifactsDir, 'map');
          const sourceMapFile = dist.replace('stdin', basename(sourcePath, '.scrypt'));
          renameSync(outputFilePath, sourceMapFile);
          result.sourceMapFile = path2uri(sourceMapFile);
        } else {
          const sourceMapFile = outputFilePath.replace('stdin', basename(sourcePath, '.scrypt'));
          renameSync(outputFilePath, sourceMapFile);
          outputFiles['map'] = sourceMapFile;
          result.sourceMapFile = path2uri(sourceMapFile);
        }
      }


      if (settings.debug) {
        const outputFilePath = getOutputFilePath(outputDir, 'dbg');
        const dbgFile = outputFilePath.replace('stdin', basename(sourcePath, '.scrypt'));
        renameSync(outputFilePath, dbgFile);
        result.dbgFile = path2uri(dbgFile);
      }

      if (settings.artifact) {
        const outputFilePath = getOutputFilePath(artifactsDir, 'artifact');
        const artifactFile = outputFilePath.replace('stdin', basename(sourcePath, '.scrypt'));
        const artifact = result.toArtifact();

        writeFileSync(artifactFile, JSON.stringify(artifact, (key, value) => {
          //ignore deprecated fields
          if (key == 'sources' || key == 'sourceMap' || key === 'asm')
            return undefined;
          else
            return value;
        }, 4));
      }
    }


    return result;
  } finally {
    doClean(settings, outputFiles, outputDir);
  }
}

export function compilerVersion(cwd: string): string | undefined {

  try {
    const text = execSync(`"${cwd}" version`).toString();
    return /Version:\s*([^\s]+)\s*/.exec(text)[1];
  } catch (e) {
    throw new Error(`compilerVersion fail when run: ${cwd} version`);
  }

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

function getOutputFilePath(baseDir: string, target: 'ast' | 'asm' | 'hex' | 'artifact' | 'map' | 'dbg'): string {
  if (target == 'hex') {
    return join(baseDir, `stdin_${target}.txt`);
  } else if (target === 'map') {
    return join(baseDir, `stdin.${target}.json`);
  } else if (target === 'dbg') {
    return join(baseDir, `stdin.${target}.json`);
  } else if (target === 'artifact') {
    return join(baseDir, 'stdin.json');
  }
  return join(baseDir, `stdin_${target}.json`);
}

export function getFullFilePath(relativePath: string, baseDir: string, curFileName: string): string {
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

function getStateProps(astRoot): Array<ParamEntity> {
  const mainContract = astRoot['contracts'][astRoot['contracts'].length - 1];
  if (mainContract && mainContract['properties']) {
    return mainContract['properties'].filter(p => p.state).map(p => { return { name: p['name'].replace('this.', ''), type: p['type'] }; });
  }
  return [];
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


export function getContractName(astRoot: unknown): string {
  const mainContract = astRoot['contracts'][astRoot['contracts'].length - 1];
  if (!mainContract) {
    return '';
  }
  return mainContract['name'] || '';
}



function shortGenericType(genericType: string): string {
  const m = genericType.match(/__SCRYPT_(\w+)__/);
  if (m) {
    return m[1];
  }
  return genericType;
}

/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param typeResolver a Type Resolver
 * @returns All function ABIs defined by the main contract, including constructors
 */
export function getABIDeclaration(astRoot: unknown, typeResolver: TypeResolver): ABI {
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
        type: typeResolver(param.type).finalType
      });
    });
  });

  return {
    contract: getContractName(astRoot),
    abi: interfaces
  };
}

/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined structures of the main contract and dependent contracts
 */
export function getStructDeclaration(astRoot: unknown, dependencyAsts: unknown): Array<StructEntity> {


  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map(ast => {
    return (ast['structs'] || []).map(s => ({
      name: s['name'],
      params: s['fields'].map(p => { return { name: p['name'], type: p['type'] }; }),
      genericTypes: s.genericTypes || [],
    }));
  }).flat(1);
}



/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined Library of the main contract and dependent contracts
 */
export function getLibraryDeclaration(astRoot: unknown, dependencyAsts: unknown): Array<LibraryEntity> {

  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    if (key !== 'std') {
      allAst.push(dependencyAsts[key]);
    }
  });

  return allAst.map(ast => {
    return (ast['contracts'] || []).filter(c => c.nodeType == 'Library').map(c => {
      if (c['constructor']) {
        return {
          name: c.name,
          params: c['constructor']['params'].map(p => { return { name: `ctor.${p['name']}`, type: p['type'] }; }),
          properties: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
          genericTypes: c.genericTypes || [],
        };
      } else {
        // implicit constructor
        if (c['properties']) {
          return {
            name: c.name,
            params: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
            properties: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
            genericTypes: c.genericTypes || [],
          };
        }
      }
    });
  }).flat(1);
}


export function getContractDeclaration(astRoot: unknown, dependencyAsts: unknown): Array<ContractEntity> {

  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    if (key !== 'std') {
      allAst.push(dependencyAsts[key]);
    }
  });

  return allAst.map(ast => {
    return (ast['contracts'] || []).filter(c => c.nodeType == 'Contract').map(c => {
      if (c['constructor']) {
        return {
          name: c.name,
          params: c['constructor']['params'].map(p => { return { name: `ctor.${p['name']}`, type: p['type'] }; }),
          properties: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
          genericTypes: c.genericTypes || []
        };
      } else {
        // implicit constructor
        if (c['properties']) {
          return {
            name: c.name,
            params: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
            properties: c['properties'].map(p => { return { name: p['name'], type: p['type'] }; }),
            genericTypes: c.genericTypes || [],
          };
        }
      }
    });
  }).flat(1);
}


/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined type aliaes of the main contract and dependent contracts
 */
export function getAliasDeclaration(astRoot: unknown, dependencyAsts: unknown): Array<AliasEntity> {

  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map(ast => {
    return (ast['alias'] || []).map(s => ({
      name: s['alias'],
      type: s['type'],
    }));
  }).flat(1);
}



/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined static const int literal of the main contract and dependent contracts
 */
export function getStaticDeclaration(astRoot: unknown, dependencyAsts: unknown): Array<StaticEntity> {

  const allAst = [astRoot];
  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map((ast) => {
    return (ast['contracts'] || []).map(contract => {
      return (contract.statics || []).map(node => {
        return {
          const: node.const,
          name: `${contract.name}.${node.name}`,
          type: node.type,
          value: resolveConstValue(node)
        };
      });
    });
  }).flat(Infinity).flat(1);
}


function getRelatedInformation(message: string, srcDir: string, sourceFileName: string): {
  relatedInformation: RelatedInformation[],
  message: string
} {
  const relatedInformation: RelatedInformation[] = [];
  let result;


  while ((result = RELATED_INFORMATION_REG.exec(message))) {
    const relatedFilePath = result.groups.filePath;
    if (relatedFilePath === 'null') continue;
    const fullFilePath = getFullFilePath(relatedFilePath, srcDir, sourceFileName);
    const line = parseInt(result.groups?.line || '-1');
    const column = parseInt(result.groups?.column || '-1');
    relatedInformation.push(
      {
        filePath: fullFilePath,
        position: [{
          line: line,
          column: column,
        }, {
          line: parseInt(result.groups?.line1 || '-1'),
          column: parseInt(result.groups?.column1 || '-1'),
        }],
        message: ''
      }
    );
    message = message.replace(/([^\s]+):(\d+):(\d+):(\d+):(\d+)/, '');
  }
  return {
    relatedInformation,
    message
  };
}

function getErrorsAndWarnings(output: string, srcDir: string, sourceFileName: string): CompileResult {
  const warnings: Warning[] = [...output.matchAll(WARNING_REG)].map(match => {
    const filePath = match.groups?.filePath || '';
    const origin_message = match.groups?.message || '';
    const { message, relatedInformation } = getRelatedInformation(origin_message, srcDir, sourceFileName);
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
      message: message,
      relatedInformation: relatedInformation
    };
  });


  if (output.match(INTERNAL_ERR_REG)) {

    const errors: CompileError[] = [{
      type: CompileErrorType.InternalError,
      filePath: getFullFilePath('stdin', srcDir, sourceFileName),
      message: `Compiler internal error: ${output.match(INTERNAL_ERR_REG).groups?.message || ''}`,
      position: [{
        line: 1,
        column: 1
      }, {
        line: 1,
        column: 1
      }],
      relatedInformation: []
    }];

    return new CompileResult(errors, warnings);

  } else if (output.includes('Syntax error:')) {
    const syntaxErrors: CompileError[] = [...output.matchAll(SYNTAX_ERR_REG)].map(match => {
      const filePath = match.groups?.filePath || '';
      const unexpected = match.groups?.unexpected || '';
      const expecting = match.groups?.expecting || '';
      const origin_message = match.groups?.message || `unexpected ${unexpected}\nexpecting ${expecting}`;
      const { message, relatedInformation } = getRelatedInformation(origin_message, srcDir, sourceFileName);
      return {
        type: CompileErrorType.SyntaxError,
        filePath: getFullFilePath(filePath, srcDir, sourceFileName),
        position: [{
          line: parseInt(match.groups?.line || '-1'),
          column: parseInt(match.groups?.column || '-1'),
        }],
        message: message,
        unexpected,
        expecting,
        relatedInformation: relatedInformation
      };
    });

    return new CompileResult(syntaxErrors, warnings);
  }
  else {

    const semanticErrors: CompileError[] = [...output.matchAll(SEMANTIC_ERR_REG)].map(match => {
      const origin_message = match.groups?.message || '';
      const filePath = match.groups?.filePath || '';
      const { message, relatedInformation } = getRelatedInformation(origin_message, srcDir, sourceFileName);

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
        message: message,
        relatedInformation: relatedInformation
      };
    });

    return new CompileResult(semanticErrors, warnings);

  }
}

function parserAst(result: CompileResult, ast: any, srcDir: string, sourceFileName: string, sourcePath: string) {

  const allAst = addSourceLocation(ast, srcDir, sourceFileName);

  const sourceUri = path2uri(sourcePath);
  result.file = sourceUri;
  result.ast = allAst[sourceUri];
  delete allAst[sourceUri];
  result.dependencyAsts = allAst;

  const alias = getAliasDeclaration(result.ast, allAst);
  const structs = getStructDeclaration(result.ast, allAst);
  const library = getLibraryDeclaration(result.ast, allAst);

  const statics = getStaticDeclaration(result.ast, allAst);

  result.contracts = getContractDeclaration(result.ast, allAst);

  const typeResolver = buildTypeResolver(getContractName(result.ast), alias, structs, library, result.contracts, statics);

  result.alias = alias.map(a => ({
    name: a.name,
    type: typeResolver(a.type).finalType
  }));

  result.structs = structs.map(a => ({
    name: a.name,
    params: a.params.map(p => ({ name: p.name, type: typeResolver(p.type).finalType })),
    genericTypes: a.genericTypes.map(t => shortGenericType(t))
  }));

  result.library = library.map(a => ({
    name: a.name,
    params: a.params.map(p => ({ name: p.name, type: typeResolver(p.type).finalType })),
    properties: a.properties.map(p => ({ name: p.name, type: typeResolver(p.type).finalType })),
    genericTypes: a.genericTypes.map(t => shortGenericType(t))
  }));

  result.statics = statics.map(s => (Object.assign({ ...s }, {
    type: typeResolver(s.type).finalType
  })));



  const { contract: name, abi } = getABIDeclaration(result.ast, typeResolver);

  result.stateProps = getStateProps(result.ast).map(p => ({ name: p.name, type: typeResolver(p.type).finalType }));

  result.abi = abi;
  result.contract = name;
}

/**
 * @deprecated use `--hex` when compiling
 * @param result 
 * @param asmObj 
 * @param settings 
 * @param srcDir 
 * @param sourceFileName 
 */
function parserASM(result: CompileResult, asmObj: any, settings: CompilingSettings, srcDir: string, sourceFileName: string) {

  const sources = asmObj.sources;

  if (settings.debug) {
    Object.assign(result, {
      file: result.file,
      sources: asmObj.sources.map(source => getFullFilePath(source, srcDir, sourceFileName)),
      sourceMap: asmObj.output.map(item => item.src),
    });
  }

  result.hex = settings.hex ? asmObj.output.map(item => item.hex).join('') : '';

  result.asm = asmObj.output.map(item => {

    if (!settings.debug) {
      return {
        opcode: item.opcode
      };
    }

    const match = SOURCE_REG.exec(item.src);

    if (match && match.groups) {
      const fileIndex = parseInt(match.groups.fileIndex);

      let debugInfo: DebugInfo | undefined;

      const tagStr = match.groups.tagStr;

      const m = /^(\w+)\.(\w+):(\d)(#(?<context>.+))?$/.exec(tagStr);

      if (m) {
        debugInfo = {
          contract: m[1],
          func: m[2],
          tag: m[3] == '0' ? DebugModeTag.FuncStart : DebugModeTag.FuncEnd,
          context: m.groups.context
        };
      } else if (/loop:0/.test(tagStr)) {
        debugInfo = {
          contract: '',
          func: '',
          tag: DebugModeTag.LoopStart,
          context: ''
        };
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
        topVars: item.topVars || [],
        pos: pos,
        debugInfo
      } as OpCode;
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





function doClean(settings: CompilingSettings, outputFiles: Record<string, string>, outputDir: string) {

  if (settings.stdout || settings.outputToFiles || settings.sourceMap) {
    return;
  }

  try {
    Object.keys(outputFiles).forEach(outputType => {
      const file = outputFiles[outputType];
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });

    rimraf.sync(outputDir);
  } catch (error) {
    console.error('clean compiler output files failed!');
  }


  // console.log('compile time spent: ', Date.now() - st)
}

export function loadSourceMapfromArtifact(artifact: ContractArtifact): Array<{
  pos: Pos | undefined,
  opcode: string
}> {

  const sources = artifact.sources;
  const asm = artifact.asm.split(' ');

  if (!artifact.sourceMap || artifact.sourceMap.length == 0) {
    return [];
  }

  return asm.map((opcode, index) => {
    const item = artifact.sourceMap[index];
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
        opcode: opcode
      };
    }
  });
}