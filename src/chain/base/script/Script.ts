
export interface ScriptChunk {
    op: number
    data?: number[]
}


export interface Script {

    chunks: ScriptChunk[];

    toASM(): string;

    toHex(): string;

    toBinary(): number[];

    writeScript(script: Script): this;

    writeOpCode(op: number): this;

    writeBn(bn: bigint): this;

    writeBin(bin: number[]): this;

    writeNumber(num: number): this;

    removeCodeseparators(): this;

    findAndDelete(script: Script): this;

    isPushOnly(): boolean;

    isLockingScript(): boolean;

    isUnlockingScript(): boolean;

    setChunkOpCode(): Script;

}