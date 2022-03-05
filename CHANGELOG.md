# CHANGELOG



## 0.13.2

- Support auto initializing instance property 

*Release Date: 2022/03/05*


## 0.13.1

- Fix `literal2ScryptType` issue

*Release Date: 2022/02/21*


## 0.13.0

- Support bytes with string literal: `new String("hello world 😊")`

*Release Date: 2022/02/19*


## 0.12.4

- Support verify public function without parameters

*Release Date: 2022/02/15*

## 0.12.3

- Added `buildScryptTypeResolver`

*Release Date: 2022/02/11*

## 0.12.2

- Added PubKeyHash type support
- Added `clone` function for `ScryptType` class

*Release Date: 2022/02/09*


## 0.12.1

- Supports property nested generic library

*Release Date: 2022/02/08*


## 0.12.0

- Support `library` as contract property, function parameter and return type
```javascript
// now you can new contract with library as a property.
const Test = buildContractClass(loadDescription('desc.json'));
const { L, ST } = buildTypeClasses(Test);
const contract = new Test(2, new L(1, 1));
```
- Add `library` and `statics` field to contract description file 
- Add two function `toHashedMap` and `toHashedSet` to convert origin `Map` and `Set` to `HashedMap` and `toHashedSet`

*Release Date: 2022/01/27*


## 0.11.0

- Support `constructor` in contract with `@state` property
- Upgrade Contract Description, see [VERSIONLOG.md](./VERSIONLOG.md)

*Release Date: 2022/01/12*


## 0.10.4

- Fix #156 sig become invalid after seal Transaction 

*Release Date: 2021/12/22*


## 0.10.3

- remove type defined for Script,It caused a conflict with the type definition of the BSV library
- add `parseAbiFromUnlockingScript`
- add `encodePubFunctionCallFromHex`

*Release Date: 2021/12/06*



## 0.10.2

- rename `cropCodeseparators` to `subScript`

*Release Date: 2021/12/02*

## 0.10.1

- support `Tx.checkPreimageOCS`
- add Util function: `buildOpreturnScript`, `buildPublicKeyHashScript`, `getLowSPreimage`

*Release Date: 2021/12/01*

## 0.10.0

- support `HashedSet`

*Release Date: 2021/11/27*

## 0.9.1

- add `codeHash` method for contract
- add `hash160`, `sha256`, `hash256` util functions
- add `prevouts` method for transaction

*Release Date: 2021/11/26*


## 0.9.0

- support [HashedMap](./docs/hashedmap_zh_CN.md)
- contract description file adds `generic` field

*Release Date: 2021/11/10*


## 0.8.0

- provides a set of chained APIs to simplify building transactions

*Release Date: 2021/11/8*

## 0.7.0

- support access structure members
- support the use of commands to compile contracts,  see [command in CLI](./README.md#contract-description-file)
- change `getStateScript` to `getNewStateScript`


*Release Date: 2021/10/23*


## 0.6.2

- support array/struct state
- add `getStateScript`, see [Contracts with State](https://github.com/sCrypt-Inc/scryptlib/tree/master#contracts-with-state)
- fix bsv library issue:  Signature error in the browser environment

*Release Date: 2021/10/15*



## 0.6.1

- fix state issue
- revert `serializeBool`

*Release Date: 2021/10/05*

## 0.6.0

- support `state` decorator
- add `hex` Compile setting, default `true`

*Release Date: 2021/10/04*

## 0.5.0

- add `hex` for Contract Description File
- fix not working properly if got very big number in contract
- fix circular dependencies

*Release Date: 2021/08/25*


## 0.4.6

- add `RelatedInformation` for diagnostics
- support [Compile Time Constant](https://scryptdoc.readthedocs.io/en/latest/ctc.html) used in struct & typeAlias
- fix typeAlias resolve issue #118

*Release Date: 2021/08/06*


## 0.4.5

- fix crash when using negative numbers to construct structures
- patch bsv to fix **Interpreter** bug
- add `checkValue` to check if an integer is used to construct `Int`

*Release Date: 2021/07/12*


## 0.4.3

- add topVars

*Release Date: 2021/07/1*


## 0.4.2

- support [browsers that are not compatible with bigint](./README.md#support-browsers-that-are-not-compatible-with-bigint)
- add [construct contracts from raw transactions](./README.md#construct-contracts-from-raw-transactions)
- remove ts-optchain which is now deprecated
- bump ssri from 6.0.1 to 6.0.2
- bump lodash from 4.17.20 to 4.17.21


*Release Date: 2021/06/21*




## 0.4.1

- bump ``bsv`` library to version ``1.5.6``
- Contract Description File add `buildType`
- remove ``debugUri`` command option, will print **Launch Debugger** uri default
- export ``bsv`` ECIES
- ``compileContract`` function supports whether to export the sourcemap
- 


## 0.3.10

- Fix loc undefined

## 0.3.9

- support bigint in ast

## 0.3.8

- support print launch.json for debugging in browser webview developer tool. see [commit](https://github.com/sCrypt-Inc/tic-tac-toe/commit/3a466de69095b05ca0da35408b324565d7eaa18a)

## 0.3.7

- remove CheckPreimage/CheckSig Fail Hints


## 0.3.6

- encodeConstructorCall RegExp replace error Fix #86

## 0.3.5

- remove `stdin` from error message
- fix IDE UnhandledPromiseRejectionWarning

## 0.3.4

- support warnings
- add CheckPreimage/CheckSig Fail Hints
- fix VerifyError: SCRIPT_ERR_MINIMALDATA
- fix struct toLiteral not working properly
- fix finalTypeResolver not working properly when passing struct array

## 0.3.2

- support being required in browser env
- update desc file version, remove finalType field
- add buildTypeResolver
- no more ImportError, using SemanticError
- git ignore desc fils
- add debugUri command option
- add timeout option for compile function

## 0.3.1

- support mixed struct and array
- CompileResult structs properties contains all dependencyAsts structs
- Does not force an error when the DESC file version is too old

## 0.2.34

- Support type alias
- Update contract description version, see `VERSIONLOG.md`

## 0.2.33

- export genLaunchConfigFile
- support InternalError

## 0.2.33

- export genLaunchConfigFile
- support InternalError

## 0.2.27

- Fix failure when launching debugger after test errors
- add file property to ContractDescription
- small refactor

## 0.2.26

- add goto source test
- Fix failure when launching debugger after test errors
- Fix source map failure on boilerplate/tests/js/tokenUtxo.scrypttest.js

## 0.2.25

- Fix desc2CompileResult fail when sourceMap empty

## 0.2.24

- add sourceMap to desc file
- Locate sCrypt source where scrypttest fails, exactly verify failed
- auto generate launch.json for debugging when contract verify failed
- move desc to out dir

## 0.2.23

- add struct support
- add static getAsmvars fn
- change rename to renameSync
- return error position with start/end in SemanticError

## 0.2.22

- remove scryptc dependencies
- fixed get scripcode bug of preimage

## 0.2.21

- support get asmVars
- bug fix: semantic errors contains end location, besides start loc

## 0.2.20

- add literal2ScryptType
- add parseLiteral
- deprecated literal2Asm

## 0.2.19

- support new array

## 0.2.18

- bug fix: used scrypt binary as compiler in 0.2.17

## 0.2.17

- support byte
- support bool and int array

## 0.2.14

- support empty bytes

## 0.2.13

- support serializer

## 0.2.4

- support SigHashPreimage type

## 0.2.0

- add some options to compile function
- change source location in compileResult from path to uri

## 0.1.9

- support ASM variable instantiation

## 0.1.8

- change pub function index start from 0, not 1

- type "Bytes" -> "byte[]"

## 0.1.6

Enhancements:

- simplify verify() return to error, not exception
