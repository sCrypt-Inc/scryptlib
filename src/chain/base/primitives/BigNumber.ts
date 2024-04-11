export interface BigNumber {

    copy(dest: BigNumber): void;
    clone(): BigNumber;
    expand(size): BigNumber;
    strip(): BigNumber;
    normSign(): BigNumber;
    inspect(): string;
    toString(base?: number | 'hex', padding?: number): string;
    toNumber(): number;
    toJSON(): string;
    toArray(endian?: 'le' | 'be', length?: number): number[];
    bitLength(): number;
    toBitArray(): Array<0 | 1>;
    zeroBits(): number;
    byteLength(): number;
    toTwos(width: number): BigNumber;
    fromTwos(width: number): BigNumber;
    isNeg(): boolean;
    neg(): BigNumber;
    or(num: BigNumber): BigNumber;
    xor(num: BigNumber): BigNumber;
    uxor(num: BigNumber): BigNumber;
    notn(width: number): BigNumber;

    setn(bit: number, val: 0 | 1 | true | false): BigNumber;
    add(num: BigNumber): BigNumber
    sub(num: BigNumber): BigNumber;
    mulTo(num: BigNumber, out: BigNumber): BigNumber;
    mul(num: BigNumber): BigNumber;
    muln(num: number): BigNumber;
    sqr(): BigNumber;
    pow(num: BigNumber): BigNumber;

    addn(num: number): BigNumber;
    subn(num: number): BigNumber;
    abs(): BigNumber;
    div(num: BigNumber): BigNumber;
    mod(num: BigNumber): BigNumber;
    umod(num: BigNumber): BigNumber;
    divRound(num: BigNumber): BigNumber;
    modrn(num: number): number;
    divn(num: number): BigNumber;
    isEven(): boolean;
    isOdd(): boolean;
    andln(num: number): number;
    bincn(bit: number): BigNumber;
    isZero(): boolean;
    cmpn(num: number): 1 | 0 | -1;
    cmp(num: BigNumber): 1 | 0 | -1;
    ucmp(num: BigNumber): 1 | 0 | -1;
    gtn(num: number): boolean;
    gt(num: BigNumber): boolean;
    gten(num: number): boolean;
    gte(num: BigNumber): boolean;
    ltn(num: number): boolean;
    lt(num: BigNumber): boolean;
    lten(num: number): boolean;
    lte(num: BigNumber): boolean;
    eqn(num: number): boolean;
    eq(num: BigNumber): boolean;

    toHex(length?: number): string;
    toSm(endian?: 'big' | 'little'): number[];
    toBits(): number;
    toScriptNum(): number[];
}