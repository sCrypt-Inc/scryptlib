
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';





describe('library as property or return or param', () => {

  describe('library as property', () => {
    describe('LibAsProperty1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty1_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(1, 2));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty2_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(1));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty3_desc.json'));
      const { L, L1 } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L1(new L(1)));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty4 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty4_desc.json'));
      const { L, L1 } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1, new L1(1, 1));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty5 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty5_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, [new L(1), new L(2), new L(3)]);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(5).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(4).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty6 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty6_desc.json'));
      const { L } = buildTypeClasses(Test);
      // before(() => {
      //   instance = new Test(1, [new L(1, 1), new L(2, 2), new L(3, 3)]);
      // });

      // it('should success when call unlock', () => {
      //   result = instance.unlock(12).verify()
      //   expect(result.success, result.error).to.be.true
      // });

      // it('should success when call unlock', () => {
      //   result = instance.unlock(11).verify()
      //   expect(result.success, result.error).to.be.false
      // });

    });


    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty7_desc.json'));
      const { L, ST } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(new ST({
          x: 1,
          y: 1
        })));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty8_desc.json'));
      const { L, ST } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(2, new L([new ST({
          x: 1,
          y: 1
        }), new ST({
          x: 2,
          y: 2
        }), new ST({
          x: 3,
          y: 3
        })]));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(10).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(12).verify()
        expect(result.success, result.error).to.be.false
      });

    });

  })


  describe('Library as return type', () => {

    describe('LibAsReturn1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn1_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsReturn2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn2_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn3_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should success when call unlock1', () => {
        result = instance.unlock2(4).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock2(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn4 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn4_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

    });
  })

  describe('Library as function param', () => {
    describe('LibAsParam1 test', () => {
      const Test = buildContractClass(loadDescription('LibAsParam1_desc.json'));
      const { L } = buildTypeClasses(Test);
      let instance, result;

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.false
      });

    });
  })
})

