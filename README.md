# scryptjs

> Javascript SDK for integration of Bitcoin SV Smart Contracts written in the sCrypt language.

## Installation

You can install `scryptjs` in your project as usual:

```
$ npm i scryptjs
```

Then

```
import { buildContractClass, ... } from 'scryptjs';
```

## Usage

A smart contract is compiled to a locking script template. A contract function call is transformed to an unlocking script. Developers are responsible for setting the locking and unlocking scripts of a transaction properly before sending it to the Bitcoin network. This may include some actions described below:

* Instantiate locking script: replace the constructor formal parameters, represented by placeholders in the locking script template, with actual parameters/arguments to form the complete locking script.

* Assemble unlocking script: convert the arguments of a contract function call to script format and concatenate them to form the unlocking script.

By using `scryptjs`, both scripts can be obtained with ease.

### Contract Description File

The compiler outputs results in a JSON file. It’s a representation used to build locking and unlocking scripts. We call this file a **contract description file**. Here's its structure:

```
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

1. Use **sCrypt VSC extension**;
2. Use the function `compile` in `scryptjs` like:

> 
```
  import { compile } from 'scryptjs';
  
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

### Deploy A Contract and Call Its Function

Both **deploying a contract** and **calling a contract function**are achieved by sending a transaction. Generally speaking,

* Deploying a contract needs the locking script in the output of this transaction to be set properly;
* Calling a contract function needs the unlocking script in the input of this transaction to be set properly;

You can use the description file to build a reflected contract class in Javascript like this:

> `const MyContract = buildContractClass(JSON.parse(descFileContent));`

To create an instance of the contract class, for example:

> `const instance = new MyContract(1234, true, ...parameters);`

To get the locking script, use:

> `const lockingScript = instance.lockingScript;`

To convert it to ASM/hex format

> `const lockingScriptASM = lockingScript.toASM();`

> `const lockingScriptHex = lockingScript.toHex();`

Additionally, you can access OP_RETURN data of the contract locking script by using an accessor named `dataLoad`, for example:

> `instance.dataLoad = dataInASM;`

After that, the `instance.lockingScript` would include the dataLoad automatically. If you want to access the code part of the contract's locking script without `dataLoad` data, use:

> `const codePart = instance.codePart;`

> `const codePartASM = instance.codePart.toASM();`

> `const codePartHex = instance.codePart.toHex();`

Also to access the data part (in OP_RETURN) of the contract locking script, use:

> `const dataPart = instance.dataPart;`

> `const dataPartASM = instance.dataPart.toASM();`

> `const dataPartHex = instance.dataPart.toHex();`

To get the unlocking script, just call the function and turn the result to asm, for example:

> `const unlockingScript = instance.someFunc(new Sig('0123456'), new Bytes('aa11ff'), ...parameters);`

To convert it to ASM/hex format

> `const unlockingScriptASM = unlockingScript.toASM();`

> `const unlockingScriptHex = unlockingScript.toHex();`

Note that `parameters` in both constructor and function call are mapped to sCrypt types as follows:

* `boolean`: mapped to sCrypt `bool`
* `number`: mapped to sCrypt `int`
* `new Bytes(x)` / `new Sig(x)` / `new PubKey(x)` / `new Ripemd160(x)` / … : mapped to sCrypt `bytes` / `Sig` / `PubKey` / `Ripemd160` / … , where `x` is hex string

In this way, the type of parameters could be checked and potential bugs can be detected before running.
### Local Unit Tests

Another very useful functionality is provided by a method: `verify(txContext)`. It would run a contract function call with certain arguments locally. If they satisfy all the constraints of the contract function being called, the return value would be `true`, meaning the call succeeds; otherwise it would be `false` and the call fails.

It usually appears in unit tests, like:

```
const pass = instance.someFunc(...params).verify( { inputSatoshis, tx } );
expect(pass).to.equal(true)
```

The `txContext` argument provides some context information of the current transaction. It will be required only if `checkSig` or `checkMultiSig` is called inside the function.

```
{
  inputSatoshis?: number;  // input amount in satoshis
  tx?: any;               // current transaction represented in bsv.Transaction object
  hex?: string;           // current transaction represented in hex format
  inputIndex?: number;    // input index, default value: 0
  sighashFlags?: number;  // sighash type of current transaction, default value: SIGHASH_ALL | SIGHASH_FORKID
}
```

You could find more examples using `scryptjs` in the [boilerplate](https://github.com/scrypt-sv/boilerplate) project mentioned above.

