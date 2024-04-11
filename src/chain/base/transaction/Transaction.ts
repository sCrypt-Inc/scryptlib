import { Broadcaster, BroadcastResponse, BroadcastFailure } from "./Broadcaster";
import { ChainTracker } from "./ChainTracker";
import { FeeModel } from "./FeeModel";
import { TransactionInput } from "./TransactionInput";
import { TransactionOutput } from "./TransactionOutput";


export interface Transaction {
    version: number
    inputs: TransactionInput[]
    outputs: TransactionOutput[]
    lockTime: number
    metadata: Record<string, any>

    addInput(input: TransactionInput): void;
    addOutput(output: TransactionOutput): void;

    updateMetadata(metadata: Record<string, any>): void;

    fee(model?: FeeModel, changeDistribution?: 'equal' | 'random'): Promise<void>;
    sign(): Promise<void>;

    broadcast(broadcaster: Broadcaster): Promise<BroadcastResponse | BroadcastFailure>;

    toBinary(): number[];
    toEF(): number[];
    toHexEF(): string;
    toHex(): string;
    toHexBEEF(): string;
    hash(enc?: 'hex'): number[] | string;
    id(enc?: 'hex'): number[] | string;
    verify(chainTracker: ChainTracker | 'scripts only'): Promise<boolean>;
    toBEEF(): number[];
}