/* eslint-disable @typescript-eslint/ban-types */
// Type definitions for bsv 1.5.6
// Project: https://github.com/moneybutton/bsv
// Forked From: https://github.com/bitpay/bitcore-lib
// Definitions by: Lautaro Dragan <https://github.com/lautarodragan>
// Definitions extended by: David Case <https://github.com/shruggr>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

// TypeScript Version: 3.0

/// <reference types="node" />

declare module 'bsv' {
    class Opcode {
        static OP_0: number;
        static OP_PUSHDATA1: number;
        static OP_PUSHDATA2: number;
        static OP_PUSHDATA4: number;
        static OP_1NEGATE: number;
        static OP_RESERVED: number;
        static OP_TRUE: number;
        static OP_1: number;
        static OP_2: number;
        static OP_3: number;
        static OP_4: number;
        static OP_5: number;
        static OP_6: number;
        static OP_7: number;
        static OP_8: number;
        static OP_9: number;
        static OP_10: number;
        static OP_11: number;
        static OP_12: number;
        static OP_13: number;
        static OP_14: number;
        static OP_15: number;
        static OP_16: number;

        // control
        static OP_NOP: number;
        static OP_VER: number;
        static OP_IF: number;
        static OP_NOTIF: number;
        static OP_VERIF: number;
        static OP_VERNOTIF: number;
        static OP_ELSE: number;
        static OP_ENDIF: number;
        static OP_VERIFY: number;
        static OP_RETURN: number;

        // stack ops
        static OP_TOALTSTACK: number;
        static OP_FROMALTSTACK: number;
        static OP_2DROP: number;
        static OP_2DUP: number;
        static OP_3DUP: number;
        static OP_2OVER: number;
        static OP_2ROT: number;
        static OP_2SWAP: number;
        static OP_IFDUP: number;
        static OP_DEPTH: number;
        static OP_DROP: number;
        static OP_DUP: number;
        static OP_NIP: number;
        static OP_OVER: number;
        static OP_PICK: number;
        static OP_ROLL: number;
        static OP_ROT: number;
        static OP_SWAP: number;
        static OP_TUCK: number;

        // splice ops
        static OP_CAT: number;
        static OP_SPLIT: number;
        static OP_NUM2BIN: number;
        static OP_BIN2NUM: number;
        static OP_SIZE: number;

        // bit logic
        static OP_INVERT: number;
        static OP_AND: number;
        static OP_OR: number;
        static OP_XOR: number;
        static OP_EQUAL: number;
        static OP_EQUALVERIFY: number;
        static OP_RESERVED1: number;
        static OP_RESERVED2: number;

        // numeric
        static OP_1ADD: number;
        static OP_1SUB: number;
        static OP_2MUL: number;
        static OP_2DIV: number;
        static OP_NEGATE: number;
        static OP_ABS: number;
        static OP_NOT: number;
        static OP_0NOTEQUAL: number;

        static OP_ADD: number;
        static OP_SUB: number;
        static OP_MUL: number;
        static OP_DIV: number;
        static OP_MOD: number;
        static OP_LSHIFT: number;
        static OP_RSHIFT: number;

        static OP_BOOLAND: number;
        static OP_BOOLOR: number;
        static OP_NUMEQUAL: number;
        static OP_NUMEQUALVERIFY: number;
        static OP_NUMNOTEQUAL: number;
        static OP_LESSTHAN: number;
        static OP_GREATERTHAN: number;
        static OP_LESSTHANOREQUAL: number;
        static OP_GREATERTHANOREQUAL: number;
        static OP_MIN: number;
        static OP_MAX: number;

        static OP_WITHIN: number;

        // crypto
        static OP_RIPEMD160: number;
        static OP_SHA1: number;
        static OP_SHA256: number;
        static OP_HASH160: number;
        static OP_HASH256: number;
        static OP_CODESEPARATOR: number;
        static OP_CHECKSIG: number;
        static OP_CHECKSIGVERIFY: number;
        static OP_CHECKMULTISIG: number;
        static OP_CHECKMULTISIGVERIFY: number;

        static OP_CHECKLOCKTIMEVERIFY: number;
        static OP_CHECKSEQUENCEVERIFY: number;

        // expansion
        static OP_NOP1: number;
        static OP_NOP2: number;
        static OP_NOP3: number;
        static OP_NOP4: number;
        static OP_NOP5: number;
        static OP_NOP6: number;
        static OP_NOP7: number;
        static OP_NOP8: number;
        static OP_NOP9: number;
        static OP_NOP10: number;

        // template matching params
        static OP_PUBKEYHASH: number;
        static OP_PUBKEY: number;
        static OP_INVALIDOPCODE: number;

        constructor(op_code: number);
    }

    export namespace encoding {
        class Base58 { }
        class Base58Check { }
        class BufferReader {
            constructor(buf: Buffer);
            read(len: number): Buffer;
            readUInt8(): number;
            readUInt16BE(): number;
            readUInt16LE(): number;
            readUInt32BE(): number;
            readUInt32LE(): number;
            readInt32LE(): number;
            readUInt64BEBN(): number;
            readUInt64LEBN(): number;
            readVarintNum(): number;
            readVarLengthBuffer(): Buffer;
            readVarintBuf(): Buffer;
            readVarintBN(): crypto.BN;
            reverse(): this;
            readReverse(len: number): Buffer;
        }
        class BufferWriter {
            write(buf: Buffer): this;
            writeUInt8(n: number): this;
            writeUInt16BE(n: number): this;
            writeUInt16LE(n: number): this;
            writeUInt32BE(n: number): this;
            writeUInt32LE(n: number): this;
            writeInt32LE(n: number): this;
            writeUInt64BEBN(n: number): this;
            writeUInt64LEBN(n: number): this;
            writeVarintNum(n: number): this;
            writeVarintBN(n: crypto.BN): this;
            writeReverse(buf: Buffer): this;
            toBuffer(): Buffer;
        }
        class Varint { }
    }

    export namespace crypto {
        interface IOpts {
            endian: 'big' | 'little';
            size?: number;
        }

        type Endianness = "le" | "be";

        class BN {
            constructor(
                number: number | bigint | string | number[] | ReadonlyArray<number> | Buffer | BN,
                base?: number,
                endian?: Endianness,
            );
            clone(): BN;
            toString(base?: number | 'hex', length?: number): string;
            toNumber(): number;
            toJSON(): string;
            toArray(endian?: Endianness, length?: number): number[];
            toBuffer(opts?: IOpts): Buffer;
            bitLength(): number;
            zeroBits(): number;
            byteLength(): number;
            isNeg(): boolean;
            isEven(): boolean;
            isOdd(): boolean;
            isZero(): boolean;
            cmp(b: any): number;
            lt(b: any): boolean;
            lte(b: any): boolean;
            gt(b: any): boolean;
            gte(b: any): boolean;
            eq(b: any): boolean;
            eqn(b: any): boolean;
            gten(b: any): boolean;
            lten(b: any): boolean;
            isBN(b: any): boolean;

            neg(): BN;
            abs(): BN;
            add(b: BN): BN;
            sub(b: BN): BN;
            mul(b: BN): BN;
            sqr(): BN;
            pow(b: BN): BN;
            div(b: BN): BN;
            mod(b: BN): BN;
            divRound(b: BN): BN;

            or(b: BN): BN;
            and(b: BN): BN;
            xor(b: BN): BN;
            setn(b: number): BN;
            shln(b: number): BN;
            shrn(b: number): BN;
            testn(b: number): boolean;
            maskn(b: number): BN;
            bincn(b: number): BN;
            notn(w: number): BN;

            gcd(b: BN): BN;
            egcd(b: BN): { a: BN; b: BN; gcd: BN };
            invm(b: BN): BN;
            static fromSM(buf: Buffer, opts?: IOpts): BN;
            neg(): BN;
            add(one: BN): BN;
            toSM(opts?: IOpts): Buffer;
            toNumber(): number;
            static fromBuffer(buf: Buffer, opts?: IOpts): BN;
            static fromNumber(n: number): BN;
            //toBuffer(opts?: IOpts): Buffer;
            static fromHex(hex: string, opts?: IOpts): BN;
            static fromString(hex: string, base?: number): BN;
        }

        namespace ECDSA {
            function sign(message: Buffer, key: PrivateKey): Signature;
            function verify(
                hashbuf: Buffer,
                sig: Signature,
                pubkey: PublicKey,
                endian?: 'little'
            ): boolean;
        }

        namespace Hash {
            function sha1(buffer: Buffer): Buffer;
            function sha256(buffer: Buffer): Buffer;
            function sha256sha256(buffer: Buffer): Buffer;
            function sha256ripemd160(buffer: Buffer): Buffer;
            function sha512(buffer: Buffer): Buffer;
            function ripemd160(buffer: Buffer): Buffer;

            function sha256hmac(data: Buffer, key: Buffer): Buffer;
            function sha512hmac(data: Buffer, key: Buffer): Buffer;
        }

        namespace Random {
            function getRandomBuffer(size: number): Buffer;
        }

        class Point {
            static fromX(odd: boolean, x: crypto.BN | string): Point;
            static getG(): any;
            static getN(): crypto.BN;
            getX(): crypto.BN;
            getY(): crypto.BN;
            validate(): this;
            mul(n: crypto.BN): Point;
        }

        class Signature {
            static fromDER(sig: Buffer): Signature;
            static fromTxFormat(buf: Buffer): Signature;
            static fromString(data: string): Signature;
            static SIGHASH_ALL: number;
            static SIGHASH_NONE: number;
            static SIGHASH_SINGLE: number;
            static SIGHASH_FORKID: number;
            static SIGHASH_ANYONECANPAY: number;
            nhashtype: number;
            toString(): string;
            toBuffer(): Buffer;
            toDER(): Buffer;
            hasDefinedHashtype(): boolean;
            static isTxDER(buf: Buffer): boolean;
            hasLowS(): boolean;
            toTxFormat(): Buffer;
        }
    }

    export namespace Transaction {
        interface IUnspentOutput {
            address?: string;
            txId: string;
            outputIndex: number;
            script: string;
            satoshis: number;
        }
        class UnspentOutput {
            static fromObject(o: IUnspentOutput): UnspentOutput;
            constructor(data: IUnspentOutput);
            inspect(): string;
            toObject(): IUnspentOutput;
            toString(): string;
        }

        class Output {
            readonly script: Script;
            readonly satoshis: number;
            readonly satoshisBN: crypto.BN;
            spentTxId: string | null;
            constructor(data: {
                script: Script,
                satoshis: number
            });

            setScript(script: Script | string | Buffer): this;
            inspect(): string;
            toObject(): { satoshis: number; script: string };
            getSize(): number;
            toBufferWriter(writer?: encoding.BufferWriter): encoding.BufferWriter;
        }

        class Input {
            readonly prevTxId: Buffer;
            readonly outputIndex: number;
            sequenceNumber: number;
            readonly script: Script;
            output?: Output;
            constructor(params: object);
            isValidSignature(tx: Transaction, sig: any): boolean;
            setScript(script: Script): this;
            getSignatures(tx: Transaction, privateKey: PrivateKey, inputIndex: number, sigtype?: number): any;
            getPreimage(tx: Transaction, inputIndex: number, sigtype?: number, isLowS?: boolean): any;
        }


        namespace Input {
            class PublicKeyHash extends Input {

            }
        }




        class Signature {
            constructor(arg: Signature | string | object);

            signature: crypto.Signature;
            publicKey: PublicKey;
            prevTxId: Buffer;
            outputIndex: number;
            inputIndex: number;
            sigtype: number;
        }

        namespace Sighash {
            function sighashPreimage(
                transaction: Transaction,
                sighashType: number,
                inputNumber: number,
                subscript: Script,
                satoshisBN: crypto.BN,
                flags?: number
            ): Buffer;
            function sighash(
                transaction: Transaction,
                sighashType: number,
                inputNumber: number,
                subscript: Script,
                satoshisBN: crypto.BN,
                flags?: number
            ): Buffer;
            function sign(
                transaction: Transaction,
                privateKey: PrivateKey,
                sighashType: number,
                inputIndex: number,
                subscript: Script,
                satoshisBN: crypto.BN,
                flags?: number
            ): crypto.Signature;
            function verify(
                transaction: Transaction,
                signature: Signature,
                publicKey: PublicKey,
                inputIndex: number,
                subscript: Script,
                satoshisBN: crypto.BN,
                flags?: number
            ): boolean;
        }
    }

    export class Transaction {
        static DUMMY_PRIVATEKEY: PrivateKey;
        inputs: Transaction.Input[];
        outputs: Transaction.Output[];
        readonly id: string;
        readonly hash: string;
        readonly inputAmount: number;
        readonly outputAmount: number;
        nid: string;
        nLockTime: number;

        constructor(raw?: string);

        from(
            utxos: Transaction.IUnspentOutput | Transaction.IUnspentOutput[]
        ): this;
        to(address: Address[] | Address | string, amount: number): this;
        change(address: Address | string): this;
        fee(amount: number): this;
        feePerKb(amount: number): this;
        sign(
            privateKey: PrivateKey[] | string[] | PrivateKey | string,
            sigtype?: number
        ): this;
        applySignature(sig: crypto.Signature): this;
        verifySignature(sig: crypto.Signature, pubkey: PublicKey, nin: number, subscript: Script, satoshisBN: crypto.BN, flags: number): boolean;
        addInput(
            input: Transaction.Input,
            outputScript?: Script | string,
            satoshis?: number
        ): this;
        addOutput(output: Transaction.Output): this;
        addData(value: Buffer | string): this;
        lockUntilDate(time: Date | number): this;
        lockUntilBlockHeight(height: number): this;

        hasWitnesses(): boolean;
        getFee(): number;
        getChangeOutput(): Transaction.Output | null;
        getLockTime(): Date | number;
        setLockTime(t: number): void;

        verify(): string | true;
        isCoinbase(): boolean;

        enableRBF(): this;
        isRBF(): boolean;

        inspect(): string;
        serialize(opts?: object): string;
        uncheckedSerialize(): string;

        toObject(): any;
        toBuffer(): Buffer;

        isFullySigned(): boolean;

        getSerializationError(opts?: object): any;

        _getUnspentValue(): number;
        _estimateFee(): number;
        _estimateSize: number;
        setInputScript(inputIndex: number | {
            inputIndex: number,
            privateKey?: PrivateKey | Array<PrivateKey>,
            sigtype?: number,
            isLowS?: boolean
        }, unlockingScript: Script | ((tx: Transaction, outputInPrevTx: Transaction.Output) => Script)): this;
        setInputSequence(inputIndex: number, sequence: number): this;
        setOutput(outputIndex: number, output: Transaction.Output | ((tx: Transaction) => Transaction.Output)): this;
        seal(): this;
        isSealed(): boolean;
        getChangeAmount(): number;
        getEstimateFee(): number;
        checkFeeRate(feePerKb?: number): boolean;
        prevouts(): string;
        getSignature(inputIndex: number, privateKey?: PrivateKey | Array<PrivateKey>, sigtype?: number): string;
        getPreimage(inputIndex: number, sigtype?: number, isLowS?: boolean): string;
        addInputFromPrevTx(prevTx: Transaction, outputIndex?: number): this;
        addDummyInput(script: Script, satoshis: number): this;
        dummyChange(): this;
        verifyInputScript(inputIndex: number): {
            success: boolean,
            error: string,
            failedAt: any
        };
        getInputAmount(inputIndex: number): number;
        getOutputAmount(outputIndex: number): number;
    }

    export class ECIES {
        constructor(opts?: any, algorithm?: string);

        privateKey(privateKey: PrivateKey): ECIES;
        publicKey(publicKey: PublicKey): ECIES;
        encrypt(message: string | Buffer): Buffer;
        decrypt(encbuf: Buffer): Buffer;
    }
    export class Block {
        hash: string;
        height: number;
        transactions: Transaction[];
        header: {
            time: number;
            prevHash: string;
        };

        constructor(data: Buffer | object);
    }

    export class PrivateKey {
        constructor(key?: string | PrivateKey, network?: Networks.Type);

        readonly bn: crypto.BN;

        readonly publicKey: PublicKey;
        readonly compressed: boolean;
        readonly network: Networks.Network;

        toAddress(network?: Networks.Type): Address;
        toPublicKey(): PublicKey;
        toString(): string;
        toObject(): object;
        toJSON(): object;
        toWIF(): string;
        toHex(): string;
        toBigNumber(): any; //BN;
        toBuffer(): Buffer;
        inspect(): string;

        static fromString(str: string): PrivateKey;
        static fromWIF(str: string): PrivateKey;
        static fromRandom(netowrk?: string): PrivateKey;
        static fromBuffer(buf: Buffer, network: Networks.Type): PrivateKey;
        static fromHex(hex: string, network: Networks.Type): PrivateKey;
        static getValidationError(data: string): any | null;
        static isValid(data: string): boolean;
    }

    export class PublicKey {
        constructor(source: string | PublicKey | crypto.Point, extra?: object);

        readonly point: crypto.Point;
        readonly compressed: boolean;
        readonly network: Networks.Network;

        toDER(): Buffer;
        toObject(): object;
        toBuffer(): Buffer;
        toAddress(network?: Networks.Type): Address;
        toString(): string;
        toHex(): string;
        inspect(): string;

        static fromPrivateKey(privateKey: PrivateKey): PublicKey;
        static fromBuffer(buf: Buffer, strict?: boolean): PublicKey;
        static fromDER(buf: Buffer, strict?: boolean): PublicKey;
        //static fromPoint(point: Point, compressed: boolean): PublicKey;
        //static fromX(odd: boolean, x: Point): PublicKey;
        static fromString(str: string): PublicKey;
        static fromHex(hex: string): PublicKey;
        static getValidationError(data: string): any | null;
        static isValid(data: string): boolean;
    }

    export class Message {
        constructor(message: string | Buffer);

        readonly messageBuffer: Buffer;

        sign(privateKey: PrivateKey): string;
        verify(address: string | Address, signature: string): boolean;
        toObject(): object;
        toJSON(): string;
        toString(): string;
        inspect(): string;

        static sign(message: string | Buffer, privateKey: PrivateKey): string;
        static verify(
            message: string | Buffer,
            address: string | Address,
            signature: string
        ): boolean;
        static MAGIC_BYTES: Buffer;
        static magicHash(): string;
        static fromString(str: string): Message;
        static fromJSON(json: string): Message;
        static fromObject(obj: object): Message;
    }

    export class Mnemonic {
        constructor(data: string | Array<string>, wordList?: Array<string>);

        readonly wordList: Array<string>;
        readonly phrase: string;

        toSeed(passphrase?: string): Buffer;
        toHDPrivateKey(passphrase: string, network: Networks.Type): HDPrivateKey;
        toString(): string;
        inspect(): string;

        static fromRandom(wordlist?: Array<string>): Mnemonic;
        static fromString(mnemonic: string, wordList?: Array<string>): Mnemonic;
        static isValid(mnemonic: string, wordList?: Array<string>): boolean;
        static fromSeed(seed: Buffer, wordlist: Array<string>): Mnemonic;
    }

    export class HDPrivateKey {
        constructor(data?: string | Buffer | object);

        readonly hdPublicKey: HDPublicKey;

        readonly xprivkey: Buffer;
        readonly xpubkey: Buffer;
        readonly network: Networks.Network;
        readonly depth: number;
        readonly privateKey: PrivateKey;
        readonly publicKey: PublicKey;
        readonly fingerPrint: Buffer;

        derive(arg: string | number, hardened?: boolean): HDPrivateKey;
        deriveChild(arg: string | number, hardened?: boolean): HDPrivateKey;
        deriveNonCompliantChild(
            arg: string | number,
            hardened?: boolean
        ): HDPrivateKey;

        toString(): string;
        toObject(): object;
        toJSON(): object;
        toBuffer(): Buffer;
        toHex(): string;
        inspect(): string;

        static fromRandom(): HDPrivateKey;
        static fromString(str: string): HDPrivateKey;
        static fromObject(obj: object): HDPrivateKey;
        static fromSeed(
            hexa: string | Buffer,
            network: string | Networks.Type
        ): HDPrivateKey;
        static fromBuffer(buf: Buffer): HDPrivateKey;
        static fromHex(hex: string): HDPrivateKey;
        static isValidPath(arg: string | number, hardened: boolean): boolean;
        static isValidSerialized(
            data: string | Buffer,
            network?: string | Networks.Type
        ): boolean;
        static getSerializedError(
            data: string | Buffer,
            network?: string | Networks.Type
        ): any | null;
    }

    export class HDPublicKey {
        constructor(arg: string | Buffer | object);

        readonly xpubkey: Buffer;
        readonly network: Networks.Network;
        readonly depth: number;
        readonly publicKey: PublicKey;
        readonly fingerPrint: Buffer;

        derive(arg: string | number, hardened?: boolean): HDPublicKey;
        deriveChild(arg: string | number, hardened?: boolean): HDPublicKey;

        toString(): string;
        toObject(): object;
        toJSON(): object;
        toBuffer(): Buffer;
        toHex(): string;
        inspect(): string;

        static fromString(str: string): HDPublicKey;
        static fromObject(obj: object): HDPublicKey;
        static fromBuffer(buf: Buffer): HDPublicKey;
        static fromHex(hex: string): HDPublicKey;

        static fromHDPrivateKey(hdPrivateKey: HDPrivateKey): HDPublicKey;
        static isValidPath(arg: string | number): boolean;
        static isValidSerialized(
            data: string | Buffer,
            network?: string | Networks.Type
        ): boolean;
        static getSerializedError(
            data: string | Buffer,
            network?: string | Networks.Type
        ): any | null;
    }

    export namespace Script {
        const types: {
            DATA_OUT: string;
        };

        interface IOpChunk {
            buf: Buffer;
            len: number;
            opcodenum: number;
        }

        function buildMultisigOut(
            publicKeys: PublicKey[],
            threshold: number,
            opts: object
        ): Script;
        function buildMultisigIn(
            pubkeys: PublicKey[],
            threshold: number,
            signatures: Buffer[],
            opts: object
        ): Script;

        function buildPublicKeyHashOut(
            address: Address | PublicKey | string
        ): Script;
        function buildPublicKeyOut(pubkey: PublicKey): Script;
        function buildSafeDataOut(
            data: string | Buffer | Array<string | Buffer>,
            encoding?: string
        ): Script;
        function buildScriptHashOut(script: Script): Script;
        function buildPublicKeyIn(
            signature: crypto.Signature | Buffer,
            sigtype: number
        ): Script;
        function buildPublicKeyHashIn(
            publicKey: PublicKey,
            signature: crypto.Signature | Buffer,
            sigtype: number
        ): Script;

        function fromAddress(address: string | Address): Script;
        function fromASM(str: string): Script;
        function fromHex(hex: string): Script;
        function fromString(str: string): Script;
        function fromBuffer(buf: Buffer): Script;

        function toASM(): string;
        function toBuffer(): Buffer;
        function toHex(): string;
        function toString(): string;

        function empty(): Script;

        namespace Interpreter {
            interface InterpretState {
                step: any;
                mainstack: any;
                altstack: any;
            }
            type StepListenerFunction = (
                step: any,
                stack: any[],
                altstack: any[]
            ) => void;
        }

        export class Interpreter {
            static SCRIPT_ENABLE_MAGNETIC_OPCODES: number;
            static SCRIPT_ENABLE_MONOLITH_OPCODES: number;
            static SCRIPT_VERIFY_STRICTENC: number;
            static SCRIPT_ENABLE_SIGHASH_FORKID: number;
            static SCRIPT_VERIFY_LOW_S: number;
            static SCRIPT_VERIFY_NULLFAIL: number;
            static SCRIPT_VERIFY_DERSIG: number;
            static SCRIPT_VERIFY_MINIMALDATA: number;
            static SCRIPT_VERIFY_NULLDUMMY: number;
            static SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS: number;
            static SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY: number;
            static SCRIPT_VERIFY_CHECKSEQUENCEVERIFY: number;
            static MAX_SCRIPT_ELEMENT_SIZE: number;
            static MAXIMUM_ELEMENT_SIZE: number;
            static SCRIPT_VERIFY_CLEANSTACK: number;
            static DEFAULT_FLAGS: number;
            stepListener?: Interpreter.StepListenerFunction;
            errstr?: string;
            verify: (
                inputScript: Script,
                outputScript: Script,
                txn: Transaction,
                nin: number,
                flags: any,
                satoshisBN: crypto.BN
            ) => boolean;
        }
    }

    export class Script {
        constructor(data: string | object);

        chunks: Array<Script.IOpChunk>;
        length: number;

        set(obj: object): this;

        toBuffer(): Buffer;
        toASM(): string;
        toString(): string;
        toHex(): string;

        isPublicKeyHashOut(): boolean;
        isPublicKeyHashIn(): boolean;

        getPublicKey(): Buffer;
        getPublicKeyHash(): Buffer;

        isPublicKeyOut(): boolean;
        isPublicKeyIn(): boolean;

        isScriptHashOut(): boolean;
        isWitnessScriptHashOut(): boolean;
        isWitnessPublicKeyHashOut(): boolean;
        isWitnessProgram(): boolean;
        isScriptHashIn(): boolean;
        isMultisigOut(): boolean;
        isMultisigIn(): boolean;
        isDataOut(): boolean;
        isSafeDataOut(): boolean;

        getData(): Buffer;
        isPushOnly(): boolean;

        classify(): string;
        classifyInput(): string;
        classifyOutput(): string;

        isStandard(): boolean;

        prepend(obj: any): this;
        add(obj: any): this;

        hasCodeseparators(): boolean;
        removeCodeseparators(): this;

        equals(script: Script): boolean;

        getAddressInfo(): Address | boolean;
        findAndDelete(script: Script): this;
        checkMinimalPush(i: number): boolean;
        getSignatureOperationsCount(accurate: boolean): number;

        toAddress(network?: Networks.Type): Address;

        clone(): Script;

        subScript(n: number): Script;

        static fromChunks(chunks: Array<Script.IOpChunk>): Script

    }

    export interface Util {
        readonly buffer: {
            reverse(a: any): any;
        };
    }

    export namespace Networks {
        interface Network {
            readonly name: string;
            readonly alias: string;
        }

        type Type = 'livenet' | 'testnet' | Network;

        const livenet: Network;
        const mainnet: Network;
        const testnet: Network;
        const defaultNetwork: Network;

        function add(data: any): Network;
        function remove(network: Networks.Type): void;
        function get(
            args: string | number | Networks.Type,
            keys: string | string[]
        ): Network;
    }

    export class Address {
        readonly hashBuffer: Buffer;
        readonly network: Networks.Network;
        readonly type: string;

        constructor(
            data: Buffer | Uint8Array | string | object,
            network?: Networks.Type | string,
            type?: string
        );
        static fromString(address: string, network: Networks.Type): Address;
        static fromPublicKey(data: PublicKey, network: Networks.Type): Address;
        static fromPrivateKey(
            privateKey: PrivateKey,
            network: Networks.Type
        ): Address;
        static fromPublicKeyHash(
            hash: Buffer | Uint8Array,
            network: Networks.Type
        ): Address;
        static fromScriptHash(
            hash: Buffer | Uint8Array,
            network: Networks.Type
        ): Address;
        isValid(
            data: Buffer | Uint8Array | string | object,
            network?: Networks.Type | string,
            type?: string
        ): boolean;
        toBuffer(): Buffer;
        toHex(): string;
        toString(): string;
        toObject(): {
            hash: string;
            type: string;
            network: string;
        };
    }

    export class Unit {
        static fromBTC(amount: number): Unit;
        static fromMilis(amount: number): Unit;
        static fromBits(amount: number): Unit;
        static fromSatoshis(amount: number): Unit;

        constructor(amount: number, unitPreference: string);

        toBTC(): number;
        toMilis(): number;
        toBits(): number;
        toSatoshis(): number;
    }

    export class BlockHeader {
        constructor(arg: Buffer | JSON | object);

        toObject(): {
            hash: string;
            version: number;
            prevHash: string;
            merkleRoot: string;
            time: number;
            bits: number;
            nonce: number;
        };
    }
    export class MerkleBlock {
        constructor(arg: Buffer | JSON | object);

        toObject(): {
            header: {
                hash: string;
                version: number;
                prevHash: string;
                merkleRoot: string;
                time: number;
                bits: number;
                nonce: number;
            };
            numTransactions: number;
            hashes: Array<string>;
            flags: Array<number>;
        };
    }
}