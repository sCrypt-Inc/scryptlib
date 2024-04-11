import { BasePoint } from "./BasePoint"
import { BigNumber } from "./BigNumber"
export interface Point extends BasePoint {
    x: BigNumber | null
    y: BigNumber | null
    inf: boolean

    validate(): boolean;
    encode(compact?: boolean, enc?: 'hex'): number[] | string;
    toString(): string;
    toJSON(): [BigNumber | null, BigNumber | null, { doubles: { step: any, points: any[] } | undefined, naf: { wnd: any, points: any[] } | undefined }?];
    inspect(): string;
    isInfinity(): boolean;
    add(p: Point): Point;
    dbl(): Point;
    getX(): BigNumber;
    getY(): BigNumber;
    mul(k: BigNumber | number | number[] | string): Point;
    mulAdd(k1: BigNumber, p2: Point, k2: BigNumber): Point;
    eq(p: Point): boolean;
    neg(_precompute?: boolean): Point;
    dblp(k: number): Point;
}