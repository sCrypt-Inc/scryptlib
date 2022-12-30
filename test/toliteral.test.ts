import { assert, expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass, } from '../src/contract';
import { Bytes } from '../src';

const BytesLiteralContract = buildContractClass(loadArtifact('bytesLiteral.json'));

const bytesLiteral = new BytesLiteralContract();

describe('passing bytes Literal to public function', () => {

    it('passing bytes Literal to public function', () => {

        let result = bytesLiteral.main(Bytes(""), Bytes("00"), Bytes("01"), Bytes("02"), Bytes("0002"), Bytes("10"), Bytes("11")).verify();

        assert.isTrue(result.success, result.error);

    })
})

