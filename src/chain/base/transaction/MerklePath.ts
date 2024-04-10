import { ChainTracker } from "./ChainTracker";

export interface MerklePath {

    blockHeight: number;
    path: Array<Array<{
        offset: number
        hash?: string
        txid?: boolean
        duplicate?: boolean
    }>>;
    toBinary(): number[];
    toHex(): string;
    computeRoot(txid?: string): string;
    verify(txid: string, chainTracker: ChainTracker): Promise<boolean>;
    combine(other: MerklePath): void;
}
