# DataPart

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