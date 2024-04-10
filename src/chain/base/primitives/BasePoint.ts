export interface BasePoint {
    type: 'affine' | 'jacobian'
    precomputed: {
        doubles: { step: number, points: any[] } | undefined
        naf: { wnd: any, points: any[] } | undefined
        beta: BasePoint | null | undefined
    } | null
}