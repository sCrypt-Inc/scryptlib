import { loadDescription } from './helper';
import { assert, expect } from 'chai';
import { buildContractClass, buildTypeClass } from '../src/contract';

const jsonDescr = loadDescription('alias_desc.json');

const AliasContract = buildContractClass(jsonDescr);



const { Male, MaleAAA, Female, Tokens, Name, Age, Token, Person, Block, Height, Time, Coinbase } = buildTypeClass(jsonDescr);

let man = new Person({
    name: new Name("68656c6c6f20776f726c6421"),
    age: new Age(33),
    token: new Token(101)
});





const alias = new AliasContract(new Female({
    name: new Name("68656c6c6f20776f726c6421"),
    age: new Age(1),
    token: new Token(101)
}));


describe('Alias type check', () => {

    it('should success when using MaleAAA', () => {

        let result = alias.unlock(new MaleAAA({
            name: new Name("68656c6c6f20776f726c6421"),
            age: new Age(33),
            token: new Token(101)
        })).verify()
        assert.isTrue(result.success, result.error);
      
    })

    it('should success when using Male', () => {

        let result = alias.unlock(new Male({
            name: new Name("68656c6c6f20776f726c6421"),
            age: new Age(33),
            token: new Token(101)
        })).verify()
        assert.isTrue(result.success, result.error);
      
    })


    it('should success when using Person', () => {

        let result = alias.unlock(new Person({
            name: new Name("68656c6c6f20776f726c6421"),
            age: 33,
            token: new Token(101)
        })).verify()
        assert.isTrue(result.success, result.error);
    })

    it('should success when using Female', () => {
        let result = alias.unlock(new Female({
            name: new Name("68656c6c6f20776f726c6421"),
            age: new Age(33),
            token: new Token(101)
        })).verify()
        assert.isTrue(result.success, result.error);
    })


    it('should throw when using Block', () => {
        expect(() => { 
            alias.unlock(new Block({
                height: new Height(1),
                time: new Time(333),
                coinbase: new Coinbase("68656c6c6f20776f726c6421")
              }))
        }).to.throw('expect struct Person but got struct Block');
    })

    it('should success when using Female', () => {
        let result = alias.unlock(new Male({
            name: new Coinbase("68656c6c6f20776f726c6421"),
            age: new Time(33),
            token: new Age(101)
        })).verify()
        assert.isTrue(result.success, result.error);
    })



    it('should success when using number', () => {
        let result = alias.setToken([10,3,3]).verify()
        assert.isTrue(result.success, result.error);
    })

    it('should success when using all int alias', () => {
        let result = alias.setToken([new Time(10),new Age(3),new Token(3)]).verify()
        assert.isTrue(result.success, result.error);
    })

    // it('should success when using all int alias', () => {
    //     let result = alias.setToken(new Tokens([new Token(10),new Token(3),new Token(3)])).verify()
    //     assert.isTrue(result.success, result.error);
    // })
})
