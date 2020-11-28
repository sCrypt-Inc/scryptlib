import { basename, dirname, join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync, rename, fstat, readdirSync } from 'fs';
import { oc } from 'ts-optchain';
import { ABIEntity, ABIEntityType } from './abi';
import { ContractDescription } from './contract';
import * as os from 'os';
import md5 = require('md5');
import { path2uri } from './utils';
import compareVersions = require('compare-versions');

const SYNTAX_ERR_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}(unexpected (?<unexpected>[^\n]+)\nexpecting (?<expecting>[^\n]+)|(?<message>[^\n]+))/g;
const SEMANTIC_ERR_REG = /Error:\s*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):(?<line1>\d+):(?<column1>\d+)\n(?<message>[^\n]+)\n/g;
const IMPORT_ERR_REG = /Syntax error:\s*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}File not found: (?<fileName>[^\s]+)/g;

export enum CompileErrorType {
	SyntaxError = 'SyntaxError',
	SemanticError = 'SemanticError',
	ImportError = 'ImportError'
}

export interface CompileErrorBase {
	type: string;
	filePath: string;
	position: {
		line: number;
		column: number;
	};
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

export interface ImportError extends CompileErrorBase {
	type: CompileErrorType.ImportError;
	file: string;
}

export type CompileError = SyntaxError | SemanticError | ImportError;

export interface CompileResult {
	asm?: string;
	debugAsm?: DebugModeAsmWord[];
	ast?: Record<string, unknown>;
	dependencyAsts?: Record<string, unknown>;
	abi?: Array<ABIEntity>;
	errors: CompileError[];
	compilerVersion?: string;
	contract?: string;
	md5?: string;
}

export enum DebugModeTag {
	FuncStart = 'F0',
	FuncEnd = 'F1',
	LoopStart = 'L0'
}

export interface DebugModeAsmWord {
	file?: string;
	line?: number;
	endLine?: number;
	column?: number;
	endColumn: number;
	opcode: string;
	stack: string[];
	debugTag?: DebugModeTag;
}

export function compile(
	source: {
		path: string,
		content?: string,
	},
	settings: {
		npxArgs?: string,
		scVersion?: string,
		ast?: boolean,
		asm?: boolean,
		debug?: boolean,
		desc?: boolean,
		outputDir?: string,
		outputToFiles?: boolean,
		cwd?: string,
		cmdPrefix?: string,
		cmdArgs?: string,
	} = {
			asm: true,
			debug: true
		}
): CompileResult {
	const st = Date.now();
	const npxArg = settings.npxArgs || '--no-install';
	const sourcePath = source.path;
	const srcDir = dirname(sourcePath);
	const curWorkingDir = settings.cwd || srcDir;
	const sourceFileName = basename(sourcePath);
	const outputDir = settings.outputDir || srcDir;
	const outputFiles = {};
	try {
		const sourceContent = source.content !== undefined ? source.content : readFileSync(sourcePath, 'utf8');
		const cmdPrefix = settings.cmdPrefix || getDefaultScryptc();
		const cmd = `${cmdPrefix} compile ${settings.asm || settings.desc ? '--asm' : ''} ${settings.ast || settings.desc ? '--ast' : ''} ${settings.debug == false ? '' : '--debug'} -r -o "${outputDir}" ${settings.cmdArgs ? settings.cmdArgs : ''}`;
		let output = execSync(cmd, { input: sourceContent, cwd: curWorkingDir }).toString();
		// Because the output of the compiler on the win32 platform uses crlf as a newline， here we change \r\n to \n. make SYNTAX_ERR_REG、SEMANTIC_ERR_REG、IMPORT_ERR_REG work.
		output = output.split(/\r?\n/g).join('\n');
		if (output.startsWith('Error:')) {
			if (output.includes('import') && output.includes('File not found')) {
				const importErrors: ImportError[] = [...output.matchAll(IMPORT_ERR_REG)].map(match => {
					const filePath = oc(match.groups).filePath('');
					return {
						type: CompileErrorType.ImportError,
						filePath: getFullFilePath(filePath, srcDir, sourceFileName),
						message: `Imported file ${oc(match.groups).fileName()} does not exist`,
						position: {
							line: parseInt(oc(match.groups).line('-1')),
							column: parseInt(oc(match.groups).column('-1')),
						},
						file: oc(match.groups).fileName('')
					};
				});

				return {
					errors: importErrors
				};
			} else if (output.includes('Syntax error:')) {
				const syntaxErrors: CompileError[] = [...output.matchAll(SYNTAX_ERR_REG)].map(match => {
					const filePath = oc(match.groups).filePath('');
					const unexpected = oc(match.groups).unexpected('');
					const expecting = oc(match.groups).expecting('');
					return {
						type: CompileErrorType.SyntaxError,
						filePath: getFullFilePath(filePath, srcDir, sourceFileName),
						position: {
							line: parseInt(oc(match.groups).line('-1')),
							column: parseInt(oc(match.groups).column('-1')),
						},
						message: oc(match.groups).message(`unexpected ${unexpected}\nexpecting ${expecting}`),
						unexpected,
						expecting,
					};
				});
				return {
					errors: syntaxErrors
				};
			} else {
				const semanticErrors: CompileError[] = [...output.matchAll(SEMANTIC_ERR_REG)].map(match => {
					const filePath = oc(match.groups).filePath('');
					return {
						type: CompileErrorType.SemanticError,
						filePath: getFullFilePath(filePath, srcDir, sourceFileName),
						position: {
							line: parseInt(oc(match.groups).line('-1')),
							column: parseInt(oc(match.groups).column('-1')),
						},
						message: oc(match.groups).message('')
					};
				});

				return {
					errors: semanticErrors
				};
			}
		}

		const result: CompileResult = { errors: [] };

		if (settings.ast || settings.desc) {
			const outputFilePath = getOutputFilePath(outputDir, 'ast');
			outputFiles['ast'] = outputFilePath;

			const allAst = addSourceLocation(JSON.parse(readFileSync(outputFilePath, 'utf8')), srcDir, sourceFileName);

			const sourceUri = path2uri(sourcePath);

			result.ast = allAst[sourceUri];
			delete allAst[sourceUri];
			result.dependencyAsts = allAst;
		}

		if (settings.asm || settings.desc) {
			const outputFilePath = getOutputFilePath(outputDir, 'asm');
			outputFiles['asm'] = outputFilePath;

			if (settings.debug == false) {
				result.asm = JSON.parse(readFileSync(outputFilePath, 'utf8')).join(' ');
			} else {
				const asmObj = JSON.parse(readFileSync(outputFilePath, 'utf8'));
				const sources = asmObj.sources;
				result.debugAsm = asmObj.output.map(item => {
					const match = /^(?<fileIndex>-?\d+):(?<line>\d+):(?<col>\d+):(?<endLine>\d+):(?<endCol>\d+)(#(?<tagStr>.+))?/.exec(item.src);

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

						return {
							file: sources[fileIndex] ? getFullFilePath(sources[fileIndex], srcDir, sourceFileName) : undefined,
							line: sources[fileIndex] ? parseInt(match.groups.line) : undefined,
							endLine: sources[fileIndex] ? parseInt(match.groups.endLine) : undefined,
							column: sources[fileIndex] ? parseInt(match.groups.col) : undefined,
							endColumn: sources[fileIndex] ? parseInt(match.groups.endCol) : undefined,
							opcode: item.opcode,
							stack: item.stack,
							debugTag
						};
					}
					throw new Error('Compile Failed: Asm output parsing Error!');
				});

				result.asm = result.debugAsm.map(item => item["opcode"].trim()).join(' ');
			}
		}

		if (settings.desc) {
			settings.outputToFiles = true;
			const { contract: name, abi } = getABIDeclaration(result.ast);
			const outputFilePath = getOutputFilePath(outputDir, 'desc');
			outputFiles['desc'] = outputFilePath;
			const description: ContractDescription = {
				compilerVersion: compilerVersion(settings.cmdPrefix ? settings.cmdPrefix : getDefaultScryptc() ),
				contract: name,
				md5: md5(sourceContent),
				abi,
				asm: result.asm
			};

			writeFileSync(outputFilePath, JSON.stringify(description, null, 4));

			result.compilerVersion = description.compilerVersion;
			result.contract = description.contract;
			result.md5 = description.md5;
			result.abi = abi;
		}

		return result;
	} finally {
		if (settings.outputToFiles) {
			Object.keys(outputFiles).forEach(outputType => {
				const file = outputFiles[outputType];
				if (existsSync(file)) {
					if (settings[outputType]) {
						// rename all output files
						rename(file, file.replace('stdin', basename(sourcePath, '.scrypt')), () => { return; });
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
			astRoot['std'] = _addSourceLocationProperty(astRoot['std'], null);
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
	if (!(astObj instanceof Object)) { return astObj; }

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
		} else if (value instanceof Object) {
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
	return join(baseDir, relativePath);
}

function getABIDeclaration(astRoot): { contract: string, abi: Array<ABIEntity> } {
	const mainContract = astRoot["contracts"][astRoot["contracts"].length - 1];
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

	// explict constructor
	if (mainContract['constructor']) {
		interfaces.push({
			type: ABIEntityType.CONSTRUCTOR,
			params: mainContract['constructor']['params'].map(p => { return { name: p['name'], type: p['type'] }; }),
		});
	} else {
		// implicit constructor
		if (mainContract['properties']) {
			interfaces.push({
				type: ABIEntityType.CONSTRUCTOR,
				params: mainContract['properties'].map(p => { return { name: p['name'].replace('this.', ''), type: p['type'] }; }),
			});
		}
	}

	return {
		contract: mainContract['name'],
		abi: interfaces
	};
}

export function getPlatformScryptc() : string {
	switch (os.platform()) {
		case "win32":
			return "compiler/scryptc/win32/scryptc.exe";
		case "linux":
			return "compiler/scryptc/linux/scryptc";
		case "darwin":
			return "compiler/scryptc/mac/scryptc";
		default:
			throw `sCrypt doesn't support ${os.platform()}`;
	}
}

function vscodeExtensionPath() : string  {
	const homedir = os.homedir();
	const extensionPath =  join(homedir, ".vscode/extensions");
	if(!existsSync(extensionPath)) {
		throw `No Visual Studio Code extensions found. Please ensure Visual Studio Code is installed.`;
	}
	return extensionPath;
}

function findVscodeScrypt(extensionPath: string) : string {
	const sCryptPrefix = "bsv-scrypt.scrypt-";
	let versions = readdirSync(extensionPath).reduce((filtered, item) => {
		if(item.indexOf(sCryptPrefix) > -1 ) {
			const version = item.substring(sCryptPrefix.length);
			if(compareVersions.validate(version)) {
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
	if(!sCrypt) {
		throw `No sCrypt extension found. Please install it at extension marketplace:
		https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt`;
	} 

	const scryptc = join(extensionPath, sCrypt, getPlatformScryptc());

	if(!existsSync(scryptc)) {
		throw `No sCrypt compiler found. Please update your sCrypt extension to the latest version`;
	}

	return scryptc;
}
