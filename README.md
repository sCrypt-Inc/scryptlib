# scryptlib
Javascript/TypeScript SDK for integration of Bitcoin SV Smart Contracts written in the sCrypt language.

[![Build Status](https://travis-ci.com/sCrypt-Inc/scryptlib.svg?branch=master)](https://travis-ci.com/sCrypt-Inc/scryptlib)

You can install `scryptlib` in your project as below:

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
  "version": 2,  // version of description file, you can look at VERSIONLOG.md to see what has changed in each version
  "compilerVersion": "0.1.0+commit.312f643",    // version of compiler used to produce this file
  "contract": "DemoP2PKH",    // name of the contract
  "md5": "01234...",    // md5 of the contract source code file
  "structs": [          // All structures defined in the contracts, including dependent contracts
        {
            "name": "Person",
            "params": [
                {
                    "name": "age",
                    "type": "Age",
                    "finalType": "int"
                },
                {
                    "name": "name",
                    "type": "Name",
                    "finalType": "bytes"
                },
                {
                    "name": "token",
                    "type": "Token",
                    "finalType": "int"
                }
            ]
        },
        ...
    ],
  "alias": [  // All type alias defined in the contracts, including dependent contracts
        {
            "name": "Male",
            "type": "Person"
        },
        {
            "name": "Female",
            "type": "Person"
        },
        ...
    ],
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
  "file": "file:///C:/Users/sCrypt/code/project/mainContract.scrypt", //file uri of the main contract source code file.
  "asm": "$pubKeyHash OP_OVER OP_HASH160 ...",    // locking script of the contract in ASM format, including placeholders for constructor parameters
  "sources": [ // all compiled sources file related to the contract
        "std",
        "C:\\Users\\sCrypt\\code\\project\\util.scrypt"
        "C:\\Users\\sCrypt\\code\\project\\contract.scrypt"
  ],
  "sourceMap": [  //sourceMap, you need to enable sourceMap setting in sCrypt IDE, default is disabled.
    "0:76:53:76:58",
    ...
  ]
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
      asm: true // set this flag to be `true` to get the asm file output
      optimize: false //set this flag to be `true` to get optimized asm opcode
      sourceMap: true //set this flag to be `true` to get source map
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
* `bigint`: mapped to sCrypt `int`
* `new Int(x)`/ `new Bool(x)` / `new Bytes(x)` / `new Sig(x)` / `new PubKey(x)` / `new Ripemd160(x)` / … : mapped to sCrypt `int` / `bool` / `bytes` / `Sig` / `PubKey` / `Ripemd160` / … , where `x` is hex string

In this way, the type of parameters could be checked and potential bugs can be detected before running.

Composite types, including structs and type aliases, are dynamically generated by `buildTypeClasses`.

```typescript
const {Person, Male, Female} = buildTypeClasses(JSON.parse(descFileContent));
```

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
const context = { tx, inputIndex, inputSatoshis };

// 1) set context per verify()
const funcCall = instance.someFunc(new Sig('0123456'), new Bytes('aa11ff'), ...parameters);
const result = funcCall.verify(context);
// 2) alternatively, context can be set at instance level and all following verify() will use it
instance.txContext = context;
const result = funcCall.verify();

expect(result.success, result.error).to.be.true;
assert.isFalse(result.success, result.error);
```

## Contracts with State
sCrypt offers [stateful contracts](https://medium.com/xiaohuiliu/stateful-smart-contracts-on-bitcoin-sv-c24f83a0f783). `OP_RETURN` data of the contract locking script can be accessed by using an accessor named `dataPart`, for example:
```typescript
const dataPart = instance.dataPart;
const dataPartASM = instance.dataPart.toASM();
const dataPartHex = instance.dataPart.toHex();
// to set it using ASM
instance.setDataPart(dataInASM);
// to set it using state object (no nesting)
let state = {'counter': 11, 'bytes': '1234', 'flag': true}
instance.setDataPart(state)
```
After that, the `instance.lockingScript` would include the data part automatically.

If you want to access the code part of the contract's locking script including the trailing `OP_RETURN`, use:
```typescript
const codePart = instance.codePart;
const codePartASM = instance.codePart.toASM();
const codePartHex = instance.codePart.toHex();
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

You could find more examples using `scryptlib` in the [boilerplate](https://github.com/sCrypt-Inc/boilerplate) repository.


## Construct contracts from raw transactions

In addition to using the constructor to construct the contract, you can also use raw transactions to construct the contract.

```typescript
    const axios = require('axios');

    const Counter = buildContractClass(loadDesc("counter_debug_desc.json"));
    let response = await axios.get("https://api.whatsonchain.com/v1/bsv/test/tx/7b9bc5c67c91a3caa4b3212d3a631a4b61e5c660f0369615e6e3a969f6bef4de/hex")
    // constructor from raw Transaction.
    let counter = Counter.fromTransaction(response.data, 0/** output index**/);

    // constructor from Utxo lockingScript
    let counterClone = Counter.fromHex(counter.lockingScript.toHex());

```


## Support browsers that are not compatible with BigInt

Some contracts use ``Bigint`` to construct or unlock. but some browsers do not support ``Bigint``, such as IE11. In this case, we use strings to build ``Bigint``.

```typescript

// polyfill

import 'react-app-polyfill/ie11';  
import 'core-js/features/number';
import 'core-js/features/string';
import 'core-js/features/array';



let demo = new Demo("11111111111111111111111111111111111", 1);

let result = demo.add(new Int("11111111111111111111111111111111112")).verify();

console.assert(result.success, result.error)


```
