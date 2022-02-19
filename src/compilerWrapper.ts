import { basename, dirname, join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from 'fs';
import md5 = require('md5');
import JSONbig = require('json-bigint');
import {
  path2uri, ContractDescription, findCompiler,
  buildTypeResolver, TypeResolver, resolveConstValue, shortType
} from './internal';


const SYNTAX_ERR_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}(unexpected (?<unexpected>[^\n]+)\nexpecting (?<expecting>[^\n]+)|(?<message>[^\n]+))/g;
const SEMANTIC_ERR_REG = /Error:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const INTERNAL_ERR_REG = /Internal error:(?<message>.+)/;
const WARNING_REG = /Warning:(\s|\n)*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+):*\n(?<message>[^\n]+)\n/g;
const JSONbigAlways = JSONbig({ alwaysParseAsBig: true, constructorAction: 'preserve' });



//SOURCE_REG parser src eg: [0:6:3:8:4#Bar.constructor:0]
const SOURCE_REG = /^(?<fileIndex>-?\d+):(?<line>\d+):(?<col>\d+):(?<endLine>\d+):(?<endCol>\d+)(#(?<tagStr>.+))?/;
const RELATED_INFORMATION_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+)/gi;

// see VERSIONLOG.md
const CURRENT_CONTRACT_DESCRIPTION_VERSION = 8;
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

export interface CompileResult {
  asm?: OpCode[];
  hex?: string;
  ast?: Record<string, unknown>;
  dependencyAsts?: Record<string, unknown>;
  abi?: Array<ABIEntity>;
  stateProps?: Array<ParamEntity>;
  errors: CompileError[];
  warnings: Warning[];
  compilerVersion?: string;
  contract?: string;
  md5?: string;
  structs?: Array<StructEntity>;
  library?: Array<LibraryEntity>;
  alias?: Array<AliasEntity>;
  file?: string;
  buildType?: string;
  autoTypedVars?: AutoTypedVar[];
  statics?: Array<StaticEntity>;
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
  type: ABIEntityType;
  name?: string;
  params: Array<ParamEntity>;
  index?: number;
}

export interface StructEntity {
  name: string;
  params: Array<ParamEntity>;
}
export interface LibraryEntity extends StructEntity {
  properties: Array<ParamEntity>;
  genericTypes: Array<string>;
}
export interface AliasEntity {
  name: string;
  type: string;
}

export interface StaticEntity {
  name: string;
  type: string;
  const: boolean;
  value?: any;
}

export function compile(
  source: {
    path: string,
    content?: string,
  },
  settings: {
    ast?: boolean,
    asm?: boolean,
    hex?: boolean,
    debug?: boolean,
    desc?: boolean,
    outputDir?: string,
    outputToFiles?: boolean,
    cwd?: string,
    cmdPrefix?: string,
    cmdArgs?: string,
    buildType?: string,
    timeout?: number  // in ms
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
    const cmdPrefix = settings.cmdPrefix || findCompiler();
    const cmd = `${cmdPrefix} compile ${settings.asm || settings.desc ? '--asm' : ''} ${settings.hex ? '--hex' : ''} ${settings.ast || settings.desc ? '--ast' : ''} ${settings.debug == false ? '' : '--debug'} -r -o "${outputDir}" ${settings.cmdArgs ? settings.cmdArgs : ''}`;
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

      const alias = getAliasDeclaration(result.ast, allAst);
      const structs = getStructDeclaration(result.ast, allAst);
      const library = getLibraryDeclaration(result.ast, allAst);

      const statics = getStaticDeclaration(result.ast, allAst);

      const typeResolver = buildTypeResolver(getContractName(result.ast), alias, structs, library, statics);

      result.alias = alias.map(a => ({
        name: a.name,
        type: shortType(typeResolver(a.type))
      }));

      result.structs = structs.map(a => ({
        name: a.name,
        params: a.params.map(p => ({ name: p.name, type: shortType(typeResolver(p.type)) }))
      }));

      result.library = library.map(a => ({
        name: a.name,
        params: a.params.map(p => ({ name: p.name, type: shortType(typeResolver(p.type)) })),
        properties: a.properties.map(p => ({ name: p.name, type: shortType(typeResolver(p.type)) })),
        genericTypes: a.genericTypes.map(t => shortGenericType(t))
      }));

      result.statics = statics.map(s => (Object.assign({ ...s }, {
        type: shortType(typeResolver(s.type))
      })));



      const { contract: name, abi } = getABIDeclaration(result.ast, typeResolver);

      result.stateProps = getStateProps(result.ast).map(p => ({ name: p.name, type: shortType(typeResolver(p.type)) }));

      result.abi = abi;
      result.contract = name;

    }

    let asmObj = null;

    if (settings.asm || settings.desc) {
      const outputFilePath = getOutputFilePath(outputDir, 'asm');
      outputFiles['asm'] = outputFilePath;

      asmObj = JSON.parse(readFileSync(outputFilePath, 'utf8'));
      const sources = asmObj.sources;

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

    if (settings.desc) {
      settings.outputToFiles = true;
      const outputFilePath = getOutputFilePath(outputDir, 'desc');
      outputFiles['desc'] = outputFilePath;
      const description: ContractDescription = {
        version: CURRENT_CONTRACT_DESCRIPTION_VERSION,
        compilerVersion: compilerVersion(settings.cmdPrefix ? settings.cmdPrefix : findCompiler()),
        contract: result.contract,
        md5: md5(sourceContent),
        structs: result.structs || [],
        library: result.library || [],
        alias: result.alias || [],
        abi: result.abi || [],
        stateProps: result.stateProps || [],
        buildType: settings.buildType || BuildType.Debug,
        file: '',
        asm: result.asm.map(item => item['opcode'].trim()).join(' '),
        hex: result.hex || '',
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

export function compilerVersion(cwd: string): string | undefined {

  try {
    const text = execSync(`${cwd} version`).toString();
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


export function getContractName(astRoot): string {
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
export function getABIDeclaration(astRoot, typeResolver: TypeResolver): ABI {
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
        type: shortType(typeResolver(param.type))
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



/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined Library of the main contract and dependent contracts
 */
export function getLibraryDeclaration(astRoot, dependencyAsts): Array<LibraryEntity> {

  const allAst = [astRoot];

  Object.keys(dependencyAsts).forEach(key => {
    if (key !== 'std') {
      allAst.push(dependencyAsts[key]);
    }
  });

  return allAst.map(ast => {
    return (ast.contracts || []).filter(c => c.nodeType == 'Library').map(c => {
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


/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined type aliaes of the main contract and dependent contracts
 */
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



/**
 * 
 * @param astRoot AST root node after main contract compilation
 * @param dependencyAsts AST root node after all dependency contract compilation
 * @returns all defined static const int literal of the main contract and dependent contracts
 */
export function getStaticDeclaration(astRoot, dependencyAsts): Array<StaticEntity> {

  const allAst = [astRoot];
  Object.keys(dependencyAsts).forEach(key => {
    allAst.push(dependencyAsts[key]);
  });

  return allAst.map((ast) => {
    return (ast.contracts || []).map(contract => {
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

/**
 * Convert the JSON object of the contract description file to CompileResult, and fill in the default values for the partially missing fields
 * @param description Contract description JSON object
 * @returns CompileResult
 */
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
    structs: description.structs || [],
    alias: description.alias || [],
    file: description.file,
    buildType: description.buildType || BuildType.Debug,
    stateProps: description.stateProps || [],
    library: description.library || [],
    errors: [],
    warnings: [],
    statics: [],
    hex: description.hex || '',
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
            stack: [],
            topVars: []
          };
        }
      }

      return {
        opcode: opcode,
        stack: [],
        topVars: []
      };
    })
  };
  return result;
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
        }],
        relatedInformation: []
      }]
    };
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
    return {
      warnings: warnings,
      errors: syntaxErrors
    };
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
    return {
      warnings: warnings,
      errors: semanticErrors
    };
  }
}