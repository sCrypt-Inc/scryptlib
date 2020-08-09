import { basename, dirname, join } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync, rename } from 'fs';
import { oc } from 'ts-optchain';
import { ABIEntity, ABIEntityType } from './abi';
import { ContractDescription } from './contract';

import md5 = require('md5');

const SYNTAX_ERR_REG = /(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+):\n([^\n]+\n){3}(unexpected (?<unexpected>[^\n]+)\nexpecting (?<expecting>[^\n]+)|(?<message>[^\n]+))/g;
const SEMANTIC_ERR_REG = /Error:\s*(?<filePath>[^\s]+):(?<line>\d+):(?<column>\d+)\n(?<message>[^\n]+)\n/g;
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
		ast?: boolean,
		asm?: boolean,
		debug?: boolean,
		desc?: boolean,
		outputDir?: string,
		outputToFiles?: boolean,
		cmdArgs?: string
	} = {
			asm: true,
			debug: true
		}
): CompileResult {
	const sourcePath = source.path;
	const srcDir = dirname(sourcePath);
	const sourceFileName = basename(sourcePath);
	const outputDir = settings.outputDir || srcDir;
	const outputFiles = {};
	try {
		const sourceContent = source.content !== undefined ? source.content : readFileSync(sourcePath, 'utf8');
		const cmd = `npx scryptc compile ${settings.asm || settings.desc ? '--asm' : ''} ${settings.ast || settings.desc ? '--ast' : ''} ${settings.debug == false ? '' : '--debug'} -r -o "${outputDir}" ${settings.cmdArgs ? settings.cmdArgs : ''}`;
		const output = execSync(cmd, { input: sourceContent, cwd: srcDir }).toString();
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

			const allAst = addSourceLocation(JSON.parse(readFileSync(outputFilePath, 'utf8')), srcDir);
			result.ast = allAst['stdin'];
			result.dependencyAsts = Object.keys(allAst)
				.filter(k => k !== 'stdin')
				.reduce((res, key) => {
					if (key === 'std') {
						res[key] = allAst[key];
					} else {
						res[join(srcDir, key)] = allAst[key];
					}
					return res;
				}, {});
		}

		if (settings.asm || settings.desc) {
			const outputFilePath = getOutputFilePath(outputDir, 'asm');
			outputFiles['asm'] = outputFilePath;

			if (settings.debug == false) {
				result.asm = readFileSync(outputFilePath, 'utf8');
			} else {
				const asmObj = JSON.parse(readFileSync(outputFilePath, 'utf8'));
				const sources = asmObj.sources.map((s: string) => {
					return join(srcDir, s);
				});
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
							file: fileIndex > -1 ? sources[fileIndex] : undefined,
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
			result.abi = abi;
			const outputFilePath = getOutputFilePath(outputDir, 'desc');
			outputFiles['desc'] = outputFilePath;
			const description: ContractDescription = {
				compilerVersion: compilerVersion(),
				contract: name,
				md5: md5(sourceContent),
				abi,
				asm: result.asm
			};
			writeFileSync(outputFilePath, JSON.stringify(description, null, 4));
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
	}
}

export function compilerVersion(): string {
	const text = execSync(`npx scryptc version`).toString();
	return /Version:\s*([^\s]+)\s*/.exec(text)[1];
}

function addSourceLocation(astRoot, basePath: string) {
	for (const fileName in astRoot) {
		const path = fileName === 'std' ? null : join(basePath, fileName);
		astRoot[fileName] = _addSourceLocationProperty(astRoot[fileName], path);
	}
	return astRoot;
}

function _addSourceLocationProperty(astObj, path: string | null) {
	if (!(astObj instanceof Object)) { return astObj; }

	for (const field in astObj) {
		const value = astObj[field];
		if (field === 'src') {
			const matches = /:(\d+):(\d+):(\d+):(\d+)/.exec(value);
			if (!matches) {
				astObj.loc = null;
			} else {
				astObj.loc = {
					source: path,
					start: { line: parseInt(matches[1]), column: parseInt(matches[2]) },
					end: { line: parseInt(matches[3]), column: parseInt(matches[4]) }
				};
			}
			delete astObj['src'];
		} else if (value instanceof Object) {
			_addSourceLocationProperty(value, path);
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
	if (mainContract['construcotr']) {
		interfaces.push({
			type: ABIEntityType.CONSTRUCTOR,
			name: 'constructor',
			params: mainContract['construcotr']['params'].map(p => { return { name: p['name'], type: p['type'] }; }),
		});
	} else {
		// implicit constructor
		if (mainContract['properties']) {
			interfaces.push({
				type: ABIEntityType.CONSTRUCTOR,
				name: 'constructor',
				params: mainContract['properties'].map(p => { return { name: p['name'].replace('this.', ''), type: p['type'] }; }),
			});
		}
	}

	return {
		contract: mainContract['name'],
		abi: interfaces
	};
}