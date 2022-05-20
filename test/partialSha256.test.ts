import { assert, expect } from 'chai';
import { partialSha256, sha256ByPartialHash } from '../src/partialSha256';
import { getRandomInt } from './helper'
const crypto = require('crypto');


function sha256(data: string | Buffer) {
    const hash = crypto.createHash('sha256');
    return hash.update(data).digest('hex');
}

const M = 1;
const N = 10000;

describe('partialSha256 test', () => {

    it('use partialSha256 to get sha256', () => {
        const str = 'abc';
        expect(partialSha256(Buffer.from(str, 'utf8'), -1)[0]).to.equal(sha256(str))
    })

    it('test partialSha256 random', () => {
        for (let i = M; i < N; i++) {
            const data = crypto.randomBytes(getRandomInt(M, N));
            const h1 = partialSha256(data, -1)[0];
            const h2 = sha256(data);
            expect(h1).to.equal(h2)
        }
    })

    it('test sha256ByPartialHash random', () => {
        for (let i = M; i < N; i++) {
            const data = crypto.randomBytes(getRandomInt(M, N));
            const [hash, partialPreimage, padding] = partialSha256(data, 0);
            const h1 = sha256ByPartialHash(hash, partialPreimage, padding)
            const h2 = sha256(data);
            expect(h1).to.equal(h2)
        }
    })
})