# The preimage under the script opcode `OP_CODESEPARATOR`

脚本操作码 `OP_CODESEPARATOR` 下的 preimage 原象 [简体中文版](preimage_under_codeseparator_zh_CN.md)


The signature checked by `OP_CHECKSIG` is the signature of the hash of the preimage. The preimage contains outputs of the entire transaction, input and the locking script. Usually the locking script is complete. But if `OP_CHECKSIG` has executed `OP_CODESEPARATOR` before, then the preimage only contains the locking script from the position of the most recently executed `OP_CODESEPARATOR` until the end of the script, that is, only part of the locking script is included. Using this feature can be used to reduce the size of the preimage, thereby reducing the size of the entire transaction.


The sCrypt standard library `Tx` provides the following functions to check this preimage that only contains partial locking scripts:

| Function | Description | 
| :-----| :---- |
| `Tx.checkPreimageOCS` | The preimage to be checked only contains part of the locking script. The signature type checked by default is `SigHash.ALL \| SigHash.FORKID`, and does not support custom signature type.|
| `Tx.checkPreimageSigHashTypeOCS` | Support custom signature type|
| `Tx.checkPreimageAdvancedOCS` | Support custom signature type and custom temporary key|
| `Tx.checkPreimageOptOCS` | Optimized version of `Tx.checkPreimageOCS` |
| `Tx.checkPreimageOptOCS_` | Optimized version of `Tx.checkPreimageOCS`, support custom signature type |


The following is an example of using `Tx.checkPreimageOCS()` to check the preimage:

```javascript
contract CheckLockTimeVerifyOCS {
    int time;

    public function unlock(SigHashPreimage preimage) {
        require(Tx.checkPreimageOCS(preimage));
        require(SigHash.nLocktime(preimage) > this.time);
    }
}
```


The [transaction](https://classic-test.whatsonchain.com/tx/430b65cde01692579be1159077c7c09b29f96aa654771301dbae5d6e602b2284) size for executing this contract is `288` bytes, which contains a preimage with `201` size, and the [transaction](https://classic-test.whatsonchain.com/tx/7b72fc1e8cc8229d9c54675bf1011ec96291257927e989e53d98a3130f2d9248) size for executing the [CheckLockTimeVerify](https://github.com/sCrypt-Inc/boilerplate/blob/master/contracts/cltv.scrypt) contract using the `Tx.checkPreimage()` version is `1005` bytes, which contains a preimage with `915` size.  The functions of these two contracts are exactly the same, but the transaction size is optimized by `80%`.


The following is an example of how to deploy and call the `CheckLockTimeVerifyOCS` contract:

```javascript

const amount = 2000

// get locking script
const CLTVOCS = buildContractClass(loadArtifact('cltvOCS_debug.json'));
cltv = new CLTVOCS(1422674);

// lock fund to the script
const lockingTx = await deployContract(cltv, amount)
console.log('funding txid:      ', lockingTx.id);

// unlock
const unlockingTx = new bsv.Transaction();

unlockingTx.addInput(createInputFromPrevTx(lockingTx))
    .setLockTime(1422674 + 1)
    .change(privateKey.toAddress())
    .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script.subScript(0), output.satoshis)
        return cltv.spend(new SigHashPreimage(toHex(preimage))).toScript()
    })
    .seal()


const unlockingTxid = await sendTx(unlockingTx)
console.log('unlocking txid:   ', unlockingTxid)

console.log('Succeeded on testnet')

```

When using `getPreimage` to calculate the preimage, the entire lock script cannot be passed. Need to use `subScript(opsIndex: number)` to tailor the locking script. The parameter `index` is the index of `OP_CODESEPARATOR` in this script, which is the number of `OP_CODESEPARATOR`. It should be noted that this function does not consider dynamic execution.