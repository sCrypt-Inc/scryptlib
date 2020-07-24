# scryptjs

> Javascript SDK for integration of Bitcoin SV Smart Contracts written in the sCrypt language.

## Guide

[**sCrypt**](https://scryptdoc.readthedocs.io) is a high-level programming language for writing smart contracts on Bitcoin SV. This SDK aims to provide useful tools to help developers integrate sCrypt smart contracts to their Javascript-based projects. Our recommended procedure of developing smart contract based applications is as follows:

1. Contract Development and Test

[The sCrypt Visual Studio Extension](https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt) is a tool for developers to write, test, and debug sCrypt smart contracts. There is also a [boilerplate](https://github.com/scrypt-sv/boilerplate) project to help beginners to bootstrap quickly.

2. Contract Integration and Application Launch

After developing and unit testing the smart contracts, the next step is to integrate them into your application which is written in other languages such as Javascript or Python. Integration tests should be run on Bitcoin SV [Testnet](https://test.whatsonchain.com/) or [Scaling Test Network(STN)](https://bitcoinscaling.io/) before launching the application to the public on mainnet.

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
  "compilerVersion": "...",   // the version of compiler used to produce this file
  "contract": "...",          // the name of the contract
  "abi": [...],               // the ABI array of the contract, ie. the interfaces of the public functions.
  "asm": "..."                // the locking script asm template of the contract
}
```

There are two ways to generate this file (named as `xxx_descr.json`):

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
      descr: true  // set this flag to be `true` to get the descripion file output
    }
  );
```

### Deploy A Contract and Call Its Function

Both **deploying a contract** and **calling a contract function**are achieved by sending a transaction. Generally speaking,

* Deploying a contract needs the locking script in the output of this transaction to be set properly;
* Calling a contract function needs the unlocking script in the input of this transaction to be set properly;

You can use the description file to build a reflected contract class in Javascript like this:

> `const MyContract = buildContractClass(JSON.parse(descriptionFileContent));`

To create instance of the contract class, for example:

> `const instance = new MyContract(1234, true, ...parameters);`

To get the locking script in asm format, use:

> `const lockingScriptASM = instance.lockingScript.toASM();`

or just use:

> `const lockingScriptASM = instance.toASM();`

To get the unlocking script in asm format, just call the function and turn the result to asm, for example:

> `const unlockingScriptASM = instance.someFunc(new Sig('0123456...'), ...parameters).toASM();`

Note that the `parameter` in both constructor and function call should be instance or has the same type of these objects:

* sCrypt Native Type Wrapper: like `Int` / `Bool` / `Sig` / `PubKey` / `Ripemd160` / ...
* Javascript `boolean`: true / false, is equivalent to use Wrapper `Int`
* Javascript `number`: only integer accepted, is equivalent to use Wrapper `Bool`

In this way, the type of parameters could be checked during compile time and the potential bugs might be detected before running.
### Local Unit Tests

Another very useful functionality is provided by a method: `verify(txContext)`. It would run a contract function call with certain arguments locally. If they satisfy all the constraints of the contract function being called, the return value would be `true`, meaning the call succeeds; otherwise it would be `false` and the call fails.

It usually appears in unit tests, like:

```
const pass = instance.someFunc(...params).verify( { inputSatoshis, tx } );
expect(pass).to.equal(true)
```

The `txContext` argument provides some context information of current transaction. The optional parts will be required if `checkSig` or `checkMultiSig` was called inside the function.

```
{
  inputSatoshis: number;  // the input amount in satoshis
  tx?: any;               // current transaction represented in bsv.Transaction object
  hex?: string;           // current transaction represented in hex format
  inputIndex?: number;    // the input index, default value: 0
  sighashFlags?: number;  // the sighash type of current transaction, default value: SIGHASH_ALL | SIGHASH_FORKID
}
```

You could find more examples using `scryptjs` in the [boilerplate](https://github.com/scrypt-sv/boilerplate) project mentioned above.

