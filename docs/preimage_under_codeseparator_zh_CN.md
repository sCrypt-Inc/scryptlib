# 脚本操作码 `OP_CODESEPARATOR` 下的 preimage 原象

The preimage under the script opcode `OP_CODESEPARATOR` [English Version](preimage_under_codeseparator_en.md)


`OP_CHECKSIG` 检查的签名是对 preimage 原象的哈希的签名。原象包含整个交易的输出、输入和锁定脚本。通常锁定脚本是完整的。但是如果 `OP_CHECKSIG` 之前执行了 `OP_CODESEPARATOR`，那么原象只包含锁定脚本从最近执行的 `OP_CODESEPARATOR` 的位置直到脚本结束，即只包含部分锁定脚本。利用这个特性，可以用来减少原象的大小，从而减少整个交易的大小。

sCrypt 标准库 `Tx` 提供了以下函数来检查这种只包含部分锁定脚本的原象：

| 函数名 | 描述 | 
| :-----| :---- |
| `Tx.checkPreimageOCS` | 检查的原象只包含部分锁定脚本的，默认检查的签名类型是 `SigHash.ALL \| SigHash.FORKID` ，不支持选择签名类型|
| `Tx.checkPreimageSigHashTypeOCS` | 支持选择签名类型|
| `Tx.checkPreimageAdvancedOCS` | 持选择签名类型以及自定义临时密钥|
| `Tx.checkPreimageOptOCS` | 优化版的 `Tx.checkPreimageOCS` |
| `Tx.checkPreimageOptOCS_` | 优化版的 `Tx.checkPreimageOCS`，支持选择签名类型 |


下面是一个使用 `Tx.checkPreimageOCS()` 来检查原象的例子：

```javascript
contract CheckLockTimeVerifyOCS {
    int time;

    public function unlock(SigHashPreimage preimage) {
        require(Tx.checkPreimageOCS(preimage));
        require(SigHash.nLocktime(preimage) > this.time);
    }
}
```

执行这个合约的 [交易](https://classic-test.whatsonchain.com/tx/430b65cde01692579be1159077c7c09b29f96aa654771301dbae5d6e602b2284) 大小是 `288` 字节，包含一个 `288` 字节的 preimage 原象。  而执行使用 `Tx.checkPreimage()` 版本的 [CheckLockTimeVerify](https://github.com/sCrypt-Inc/boilerplate/blob/master/contracts/cltv.scrypt) 合约的 [交易](https://classic-test.whatsonchain.com/tx/7b72fc1e8cc8229d9c54675bf1011ec96291257927e989e53d98a3130f2d9248) 大小是 `1005` 字节，包含一个 `915` 字节的 preimage 原象。 这两个合约的功能是完全一样的，但是交易的大小却优化了 `80%` 。

下面是如何部署和调用使用 `CheckLockTimeVerifyOCS` 合约的例子：

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

在使用 `getPreimage` 计算原象时，不能传递整个锁定脚本了。需要使用 `subScript(opsIndex: number)` 来裁剪锁定脚本。其参数 `index` 是本脚本中 `OP_CODESEPARATOR` 的索引，即第几个 `OP_CODESEPARATOR`。需要注意的是，该函数没有考虑动态执行的情况。