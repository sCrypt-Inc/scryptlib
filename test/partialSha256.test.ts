import { assert, expect } from 'chai';
import { partialSha256, sha256ByPartialHash } from '../src/partialSha256';
import { getRandomInt } from './helper'
const crypto = require('crypto');


function sha256(data: string | Buffer) {
    const hash = crypto.createHash('sha256');
    return hash.update(data).digest('hex');
}

describe('partialSha256 test', () => {

    it('use partialSha256 to get sha256', () => {
        const str = 'abc';
        expect(partialSha256(Buffer.from(str, 'utf8'), -1)[0]).to.equal(sha256(str))

        const data = Buffer.from('772b2dcd81e997919a09d3eaf6f25783d785e0baf114bedfc67198b8118d147a68bfc3ecf3e6a805beda8abe3176e6752c29a46fb19ef10e067be7d2b99111442a6983a61d8178b1bf048ea2aa57e83ff24e7b3c9daedf5e99d730b5043099e2b8d843d9f979406b0da74ebf3d8ff719ef3e022133e0d80f300c14de42b831e4cd6aa0b8cd3d73501faefcbcd1a998b0b2607d5527506574ad1b35d9d595b02b0a90c3d802f0cc79bc07f21453ad0a492f56997010d626dcd240a7a78497240c70be234acc336701620ea2ed990df8fa23d6a34c8f1920c74018cf8e40c1b8fd6395e3d3570270b89f102afb16c550f3da56f9421b0e6a8a3904186e37c639e0720736e3c6c32e9fb846c12429a6f1c0bcd2af1a7d8c11b95ce863e851f0d87bbeb406cbcd71d766211f8d362d9cc9b30a96b6db029add95c7a6f3e58054a3357d339702a0e8881274e7fc967ad5421c9f89f3233c264401b7a2bcc1ca67912b0b016ffd569f40b84b4b7595b23cbc8e92d9a347a416a9464df92eb3df0e292f55ba0c303c5594830435ab9e1e41308b08bc3fb41c42f4c8f0009eff9e7e820907824a512ec5a8d807e10dae42e29228ce55586897862b7491c17e6a43d58b4e1e1aec0f7cc9c07815a4a1ff9f4528161b31740a87d958cf166f3da9169f2e17f5ed1b3516fe2f956275faa75c03fd7c48e7aeb2cf03f41d6d72b993e1ecfbbbbc0a81c2960bf5205d2bf4e8e97b4ae9ef0865912d75edda16e4032b2e12e960e0fdda387d943746f90c9ad9c35df567b32dccecfc7d5e0e09926dfea109d0526c60ecbcddbbe23fb9e0417c04576e7abb53cb4c9eccfe41582829cda7a8de66738618006c04549fe25462da21e100c02b4281f08a1ec3', 'hex')
        expect(partialSha256(data, -1)[0]).to.equal(sha256(data))
    })

    it('test partialSha256 random', () => {
        let counter = 10000;
        let n = 0;
        while (--counter > 0) {
            const data = crypto.randomBytes(getRandomInt(1, 10000));
            const h1 = partialSha256(data, -1)[0];
            const h2 = sha256(data);
            expect(h1).to.equal(h2)
        }
    })

    it('test sha256ByPartialHash random', () => {
        let counter = 10000;
        while (--counter > 0) {
            const data = crypto.randomBytes(getRandomInt(1, 10000));
            const [hash, partialPreimage, padding] = partialSha256(data, 0);
            const h1 = sha256ByPartialHash(hash, partialPreimage, padding)
            const h2 = sha256(data);
            expect(h1).to.equal(h2)
        }
    })
})