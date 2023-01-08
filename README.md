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

## Contract Artifact File

The compiler output results in a JSON file. It’s a representation used to build locking and unlocking scripts. We call this file a [**contract artifact file**](docs/counter_debug.json).

There are three ways to generate this file (named as `<contract_name>.json`):

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
      artifact: true  // set this flag to be `true` to get the artifact file output
      asm: true // set this flag to be `true` to get the asm file output
      optimize: false //set this flag to be `true` to get optimized asm opcode
      sourceMap: true //set this flag to be `true` to get source map
      hex: true //set this flag to be `true` to get hex format script
      stdout: false//set this flag to be `true` to make that the compiler will output the compilation result through stdout
    }
  );
```

3. `compileAsync` is the asynchronous version of the function `compile`

```javascript
  import { compileAsync } from 'scryptlib';

  ...

  compileAsync(
    {
      path: contractFilePath  //  the file path of the contract
    },
    settings
  ) : Promise<CompileResult>;
```

4. Run `npx` command in CLI:
```sh
  # install compiler binary
  npx scryptlib download
  # the latest compiler may be incompatible with the current scryptlib
  npx scryptlib download latest
  # compiling contract
  npx scryptlib compile your_directory/your_scrypt.scrypt
```

## Types

### 1. Basic Types
All basic types of the **sCrypt** language have their corresponding javascript classes in scryptlib. In this way, the type of parameters could be checked and potential bugs can be detected before running.

|  Types (scrypt) | scryptlib (javascript/typescript)|
| :---------: | :--------: |
| `int` | `Int(1)` or `number` or `bigint` |
| `bool` | `Bool(true)` or `boolean` |
| `bytes` | `Bytes('0001')` or `stringToBytes("hello world 😊")`|
| `PubKey` | `PubKey('0001')`|
| `PrivKey` | `PrivKey(1)`|
| `Sig` | `Sig('0001')`|
| `Ripemd160` | `Ripemd160('0001')`|
| `Sha1` | `Sha1('0001')`|
| `Sha256` | `Sha256('0001')`|
| `SigHashType` | `SigHashType('01')`|
| `SigHashPreimage` | `SigHashPreimage('010001')`|
| `OpCodeType` | `OpCodeType('76')`|

### 2. Array Types

scryptlib uses javascript array to represent the array types of the **sCrypt** language.

```typescript

[[1, 3, 1]] // represent `int[1][3]` in **sCrypt** language

[Bytes("00"), Bytes("00"), Bytes("00")] // represent `bytes[3]` in **sCrypt** language

```



### 3. Structure and Type Aliases

The structure in sCrypt needs to be represented by object in **SDK**. When creating a structure, all members must specify values. Use `.` to access structure members.

A type alias needs to be represented by a value corresponding to the original type

Structure and type aliases defined in sCrypt:

```ts
/*Person is structure and Male, Female are type aliases */
struct Person {
    bytes addr;
    bool isMale;
    int age;
}

type Male = Person;
type Female = Person;

contract PersonContract {
    Male man;
    Female woman;
    ...

}
```

Access Structure and type aliases by **SDK** :

```typescript

const PersonContract = buildContractClass(loadArtifact('person.json'));


let man = {
    isMale: true,
    age: 14n,
    addr: Bytes("68656c6c6f20776f726c6421")
  };

man.age = 20n;

let woman = {
    isMale: false,
    age: 18n,
    addr: Bytes("68656c6c6f20776f726c6421")
  };

woman.addr = Bytes("")

const instance = new PersonContract(man, woman);
```

### 4. HashedMap
[HashedMap](./docs/hashedmap_en.md) is a hashtable-like data structure.

### 5. Library

Library is another composite types. When the constructor parameter of the contract contains library, we have to pass an array according to the constructor parameter of the library.

Library defined in sCrypt:

```javascript
library L {
  private int x;

  constructor(int a, int b) {
    this.x = a + b;
  }
  function f() : int {
    return this.x;
  }
}

contract Test {
  public int x;
  L l;

  public function unlock(int x) {
    require(this.l.f() == x + this.x);
  }
}
```

Access Library by **SDK** :

```typescript

const Test = buildContractClass(loadArtifact('test.json'));

let l = [1n, 2n];

let test = new Test(1n, l);
```

Sometimes the constructor parameters of the library may be generic types. At this time, the sdk will deduce the generic type based on the constructor arguments you pass.

## Deploy a Contract and Call Its Function

Both **deploying a contract** and **calling a contract function** are achieved by sending a transaction. Generally speaking,

* deploying a contract needs the locking script in the output of this transaction to be set properly;
* calling a contract function needs the unlocking script in the input of this transaction to be set properly.

There are 2 steps.
### 1. Get Locking and Unlocking Script
You can use the artifact file to build a reflected contract class in Javascript/TypeScript like this:
```typescript
const MyContract = buildContractClass(JSON.parse(artifactFileContent));
```
To create an instance of the contract class, for example:
```typescript
const instance = new MyContract(1234n, true, ...parameters);
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

### 2. Wrap Locking and Unlocking Script into a Transaction
[Chained APIs](./docs/chained_api_en.md) make building transactions super easy.

## Local Unit Tests

A useful method `verify(txContext)` is provided for each contract function call. It would execute the function call with the given context locally. The `txContext` argument provides some context information of the current transaction, **needed only if signature is checked inside the contract**.
```typescript
{
  tx?: bsv.Transaction;                 // current transaction represented in bsv.Transaction object
  inputIndex?: number;      // input index, default value: 0
  /**
   * @deprecated no need any more
   */
  inputSatoshis?: number;   // input amount in satoshis
  opReturn?: string;        // contract state in ASM format
  opReturnHex?: string;     // contract state in hex format
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
const funcCall = instance.someFunc(Sig('0123456'), Bytes('aa11ff'), ...parameters);
const result = funcCall.verify(context);
// 2) alternatively, context can be set at instance level and all following verify() will use it
instance.txContext = context;
const result = funcCall.verify();

expect(result.success, result.error).to.be.true;
assert.isFalse(result.success, result.error);
```

## Contracts with State
sCrypt offers [stateful contracts](https://scryptdoc.readthedocs.io/en/latest/state.html#stateful-contract). Declare any property that is part of the state with a decorator `@state` in a contract, for example:
```typescript
contract Counter {
    @state
    int counter;

    constructor(int counter) {
        this.counter = counter;
    }
}
```

Use the initial state to instantiate the contract and read the state by accessing the properties of the contract instance.

```typescript
const instance = new Counter(0n);

let state = instance.counter;
// update state
instance.counter++;
```

Then use `instance.getNewStateScript()` to get a locking script that includes the new state. It accepts an object as a parameter. Each key of the object is the name of a state property, and each value is the value of the state property. You should provide all state properties in the object.

```typescript
const tx = newTx(inputSatoshis);
let newLockingScript = instance.getNewStateScript({
    counter: 1
});

tx.addOutput(new bsv.Transaction.Output({
  script: newLockingScript,
  satoshis: outputAmount
}))

preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

```

You can also access the state of the contract by accessing the properties of the instance.


```typescript

instance.counter++;
instance.person.name = Bytes('0001');

```


You can also maintain state manually to, for example, optimize your contract or use customized state de/serialization [rawstate](docs/rawstate.md).


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

In addition to using a constructor to create a contract, you can also use a raw transaction to construct it.

```typescript
const axios = require('axios');

const Counter = buildContractClass(loadArtifact("counter_debug.json"));
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



let demo = new Demo(Int("11111111111111111111111111111111111"), 1n);

let result = demo.add(Int("11111111111111111111111111111111112")).verify();

console.assert(result.success, result.error)
```
