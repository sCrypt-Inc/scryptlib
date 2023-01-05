# Manually Maintain Mutable State

One way to implement state in contract is dividing the contract in the locking script into two parts: data and code. Data part is the state. Code part contains the business logic of a contract that encodes rules for state transition. 

![](https://miro.medium.com/max/936/0*Bc4mNeNnhN24G45E)

sCrypt offers [stateful contracts](https://medium.com/xiaohuiliu/stateful-smart-contracts-on-bitcoin-sv-c24f83a0f783). Let us look at a simple example of a stateful contract: a counter contract tracking how many times its function `increment()` has been called. Its code is shown below with comments inline.

```javascript
contract Counter {
    public function increment(SigHashPreimage txPreimage, int amount) {
        require(Tx.checkPreimage(txPreimage));

        // deserialize state (i.e., counter value)
        bytes scriptCode = Util.scriptCode(txPreimage);
        int scriptLen = len(scriptCode);
        // counter is at the end
        int counter = unpack(scriptCode[scriptLen - Util.DataLen :]);

        // increment counter
        counter++;

        // serialize state
        bytes outputScript = scriptCode[: scriptLen - Util.DataLen] + num2bin(counter, Util.DataLen);
        
        bytes output = Util.buildOutput(outputScript, amount);
        // ensure output is expected: amount is same with specified
        // also output script is the same with scriptCode except counter incremented
        require(hash256(output) == Util.hashOutputs(txPreimage));
    }
}
```

`OP_RETURN` data of the contract locking script can be accessed by using an accessor named `dataPart`, for example:


```typescript
const Counter = buildContractClass(loadArtifact('counter.json'));
counter = new Counter();
const dataPart = counter.dataPart;
const dataPartASM = counter.dataPart.toASM();
const dataPartHex = counter.dataPart.toHex();
// to set it using ASM
counter.setDataPart('01');
```

After that, the `counter.lockingScript` would include the data part automatically. You can use it to calculate preimage.


```typescript
const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)
```


If you want to access the code part of the contract's locking script including the trailing `OP_RETURN`, use:

```typescript
const codePart = instance.codePart;
const codePartASM = instance.codePart.toASM();
const codePartHex = instance.codePart.toHex();
```

