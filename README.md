# scryptlib

> Javascript/TypeScript SDK for integration of Bitcoin SV Smart Contracts written in the sCrypt language.

You can install `scryptlib` in your project as usual:

```
$ npm install scryptlib
```

A smart contract is compiled to a locking script template. A contract function call is transformed to an unlocking script. Developers are responsible for setting the locking and unlocking scripts of a transaction properly before sending it to the Bitcoin network. This may include some actions described below:

* Instantiate locking script: replace the constructor formal parameters, represented by placeholders in the locking script template, with actual parameters/arguments to form the complete locking script.

* Assemble unlocking script: convert the arguments of a contract function call to script format and concatenate them to form the unlocking script.

By using `scryptlib`, both scripts can be obtained with ease.

## Contract Description File

The compiler outputs results in a JSON file. It’s a representation used to build locking and unlocking scripts. We call this file a **contract description file**. Here's its structure:

```json
{
  "compilerVersion": "0.1.0+commit.312f643",    // version of compiler used to produce this file
  "contract": "DemoP2PKH",    // name of the contract
  "md5": "01234...",    // md5 of the contract source code file
  "abi": [    // ABI of the contract: interfaces of its public functions and constructor.
    {
        "type": "constructor",
        "name": "constructor",
        "params": [
            {
                "name": "pubKeyHash",
                "type": "Ripemd160"
            }
        ]
    },
    {
        "type": "function",
        "name": "unlock",
        "index": 0,
        "params": [
            {
                "name": "sig",
                "type": "Sig"
            },
            {
                "name": "pubKey",
                "type": "PubKey"
            }
        ]
    },
    ...
  ],
  "asm": "$pubKeyHash OP_OVER OP_HASH160 ..."    // locking script of the contract in ASM format, including placeholders for constructor parameters
}
```

There are two ways to generate this file (named as `xxx_desc.json`):

1. Use [**sCrypt VS Code extension**](https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt) to compile manually;
2. Use the function `compile` programmatically:
```javascript
  import { compile } from 'scryptlib';
  
  ...
  
  compile( 
    { 
      path: contractFilePath  //  the file path of the contract
    }, 
    {
      desc: true  // set this flag to be `true` to get the description file output
    }
  );
```

## Deploy A Contract and Call Its Function

Both **deploying a contract** and **calling a contract function**are achieved by sending a transaction. Generally speaking,

* Deploying a contract needs the locking script in the output of this transaction to be set properly;
* Calling a contract function needs the unlocking script in the input of this transaction to be set properly;

You can use the description file to build a reflected contract class in Javascript/TypeScript like this:
```typescript
const MyContract = buildContractClass(JSON.parse(descFileContent));
```
To create an instance of the contract class, for example:
```typescript
const instance = new MyContract(1234, true, ...parameters);
```
To get the locking script, use:
```typescript
const lockingScript = instance.lockingScript;
// To convert it to ASM/hex format
const lockingScriptASM = lockingScript.toASM();
const lockingScriptHex = lockingScript.toHex();
```
To get the unlocking script, just call the function and turn the result to `bsv.Script` object, for example:
```typescript
const funcCall = instance.someFunc(new Sig('0123456'), new Bytes('aa11ff'), ...parameters);
const unlockingScript = funcCall.toScript();
// To convert it to ASM/hex format
const unlockingScriptASM = unlockingScript.toASM();
const unlockingScriptHex = unlockingScript.toHex();
```
Note that `parameters` in both constructor and function call are mapped to sCrypt types as follows:

* `boolean`: mapped to sCrypt `bool`
* `number`: mapped to sCrypt `int`
* `new Bytes(x)` / `new Sig(x)` / `new PubKey(x)` / `new Ripemd160(x)` / … : mapped to sCrypt `bytes` / `Sig` / `PubKey` / `Ripemd160` / … , where `x` is hex string

In this way, the type of parameters could be checked and potential bugs can be detected before running.

## Local Unit Tests

A useful method `verify(txContext)` is provided for each contract function call. It would execute the function call with the given context locally. The `txContext` argument provides some context information of the current transaction, **needed only if signature is checked inside the contract**.
```typescript
{
  tx?: any;                 // current transaction represented in bsv.Transaction object
  inputIndex?: number;      // input index, default value: 0
  inputSatoshis?: number;   // input amount in satoshis
}
```
It returns an object:
```typescript
{
  success: boolean;       // script evaluates to true or false
  error: string;          // error message, empty if success
}
```

It usually appears in unit tests, like:

```typescript
const funcCall = instance.someFunc(new Sig('0123456'), new Bytes('aa11ff'), ...parameters);
const context = { tx, inputIndex, inputSatoshis };
const result = funcCall.verify(context);
expect(result.success, result.error).to.be.true;
assert.isFalse(result.success, result.error);
```

## Contracts with State
sCrypt offers [stateful contracts](https://medium.com/xiaohuiliu/stateful-smart-contracts-on-bitcoin-sv-c24f83a0f783). `OP_RETURN` data of the contract locking script can be accessed by using an accessor named `dataLoad`, for example:
```typescript
instance.dataLoad = dataInASM;
```
After that, the `instance.lockingScript` would include the dataLoad automatically. If you want to access the code part of the contract's locking script without `dataLoad` data, use:
```typescript
const codePart = instance.codePart;
const codePartASM = instance.codePart.toASM();
const codePartHex = instance.codePart.toHex();
```
Also to access the data part (in `OP_RETURN`) of the contract locking script, use:
```typescript
const dataPart = instance.dataPart;
const dataPartASM = instance.dataPart.toASM();
const dataPartHex = instance.dataPart.toHex();
```

## Instantiate Inline Assembly Variables
Assembly variables can be replaced with literal Script in ASM format using `replace()`. Each variable is prefixed by its unique scope, namely, the contract and the function it is under.
```typescript
const asmVars = {
  'contract1.function1.variable1': 'ff41',
  'contract2.function2.variable2': 'OP_4'
};
instance.replaceAsmVars(asmVars);
```

You could find more examples using `scryptlib` in the [boilerplate](https://github.com/scrypt-sv/boilerplate) repository.

