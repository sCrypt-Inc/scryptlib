# 使用链式 APIs

链式 APIs [English Version](chained_api_en.md)

在部署合约和调用合约的过程中，通常需要计算交易费用和找零输出。在不知道解锁脚本大小的情况，很难准确地计算交易费用以及找零输出。**scryptlib** 扩展了 **[bsv](https://github.com/moneybutton/bsv)** 库， 提供一套链式 APIs 来构造交易。使得即使在这种情况下，计算交易费用和找零都变得简单。

## 部署

下面是一个实现部署合约功能的函数。任意类型的合约都可以使用该函数来部署。

```javascript

async function deployContract(contract, amount) {

  const address = privateKey.toAddress()
  const tx = new bsv.Transaction()
  tx.from(await fetchUtxos(address))  // 添加用来支付矿工费用和锁进合约的比特币的UTXO。钱包通常会在这里做 UTXO 的筛选，以防止添加过多 UTXO
  .addOutput(new bsv.Transaction.Output({  
    script: contract.lockingScript, // 将合约部署到第0个输出的锁定脚本
    satoshis: amount,
  }))
  .change(address)   // 添加找零输出
  .sign(privateKey) // 私钥签名, 只对P2PKH输入有效
  
  await sendTx(tx) // 广播交易
  return tx
}

```

## 调用合约

调用合约公共函数时分两种情况：
1. 该公共函数不包含 `SigHashPreimage` 类型的参数
2. 改公共函数包含 `SigHashPreimage` 类型的参数

### 不包含 `SigHashPreimage`

如果合约的公共函数不包含 `SigHashPreimage` 类型的参数，则构造调用合约的交易比较简单。一般可以按照以下步骤构建交易：

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中。
2. 使用 `change(address)` 添加一个找零输出。
3. 使用 `setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本。
4. 调用 `seal()` 封印交易，同时自动计算出正确的交易费用和找零余额。
   

```javascript

const demo = new Demo(4, 7);

const deployTx = await deployContract(demo, 1000); // 部署合约

const unlockingTx = new bsv.Transaction();

unlockingTx.addInput(createInputFromPrevTx(deployTx))
.change(privateKey.toAddress())
.setInputScript(0, (_) => {  //设置第0个输入的解锁脚本
    return demo.add(11).toScript();
})
.feePerKb(250) // 设置交易费率，可选，默认是每KB 500 satoshis
.seal()  // 封印交易, 同时自动计算出正确的交易费用和找零余额

// 广播交易
await sendTx(unlockingTx)
```

### 包含 `SigHashPreimage`

如果合约的公共函数包含 `SigHashPreimage` 类型的参数，则构造调用合约的交易比较复杂。因为解锁脚本的大小影响到交易费用的计算，从而影响输出中的 `satoshis` 余额。输出中的 `satoshis` 余额又会影响 `SigHashPreimage` 的计算。使用 **scryptlib** 的链式 APIs 隐藏了处理这些繁琐计算的细节。 你只需按照以下方式来构造交易：

#### **交易费用是由合约里的余额支付：**

这种情况下不包含独立的找零输出。所有输出的余额在构造交易之前是未知的。交易费用会影响所有输出的余额的计算。

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中。
2. 使用 `setOutput(outputIndex, (tx) => bsv.Transaction.Output)` 添加一个或多个输出。输出的余额通常需要减去交易费用；
   
    ```javascript
    const newAmount = amount - tx.getEstimateFee();
    ```

3. 使用 `setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本。解锁参数通常包含一个指定合约新余额的参数，其计算方式与上一步相同。
   
4. 调用 `seal()` 封印交易，同时自动计算出正确的交易费用和找零余额。

```javascript

const counter = new StateCounter(0)

let amount = 8000

const lockingTx =  await deployContract(counter, amount) // 部署合约

const unlockingTx = new bsv.Transaction();
            
unlockingTx.addInput(createInputFromPrevTx(prevTx))
.setOutput(0, (tx) => {
    const newLockingScript = counter.getNewStateScript({
        counter: i + 1
    })
    const newAmount = amount - tx.getEstimateFee(); // 计算合约的新余额，需要减去交易的费用
    return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
        })
})
.setInputScript(0, (tx, output) => {  // output 包含输入/UTXO对应的锁定脚本和 satoshis 余额
    const preimage = getPreimage(tx, output.script, output.satoshis)
    const newAmount = amount - tx.getEstimateFee(); //计算合约的新余额，需要减去交易的费用
    return counter.unlock(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
})
.seal() // 封印交易

// 广播交易
await sendTx(unlockingTx)

```

#### **交易费用是通过添加其它输入来支付：** 

这种情况下包含一个独立的找零输出。其它输出的余额一般是可以在构造交易之前计算出来的。交易费用只会影响找零输出的计算。

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中。
2. 通过 `from([utxo])` 来添加用于支付交易费用的输入。
3. 使用 `addOutput()` 添加一个或多个的输出(根据合约业务逻辑添加)。
4. 使用 `change(address)` 添加一个找零输出。
5. 使用 `setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本。解锁参数通常包含一个指定找零余额的参数，该参数可以通过 `tx.getChangeAmount()` 来获取。
6. 使用 `sign(privateKey)` 来签名所有添加用于支付交易费用的输入。
7. 调用 `seal()` 封印交易，同时自动计算出正确的交易费用和找零余额。


```javascript

const unlockingTx = new bsv.Transaction();

const newAmount = amount + spendAmount； // 合约新余额与交易费用无关

unlockingTx.addInput(createInputFromPrevTx(prevTx))
.from(await fetchUtxos(privateKey.toAddress())) // 添加用于支付交易费用的输入
.addOutput(new bsv.Transaction.Output({ // 添加一个或多个的输出, newAmount 是合约新的余额
    script: newLockingScript,
    satoshis: newAmount,
}))
.change(privateKey.toAddress())  //添加找零输出
.setInputScript(0, (tx, output) => {
    let preimage = getPreimage(
    tx,
    output.script,
    output.satoshis,
    0,
    sighashType
    );

    return advTokenSale.buy(
    new SigHashPreimage(toHex(preimage)), 
    new Ripemd160(toHex(pkh)), // 找零地址
    tx.getChangeAmount(), // 计算找零余额
    new Bytes(toHex(publicKeys[i])), 
    numBought 
    ).toScript();

})
.sign(privateKey) // 签名所有添加用于支付交易费用的输入
.seal() //封印交易, 同时自动计算出正确的交易费用和找零余额

// 广播交易
lockingTxid = await sendTx(unlockingTx)

```


## 扩展的 APIs 列表


| Api | 描述 | 参数 |
| :-----| :---- | :---- |
| `setInputScript` | 设置输入的解锁脚本 | 1. `inputIndex` 输入索引 <br>2. `(tx, output) => bsv.Script` 返回解锁脚本的回调函数 |
| `setOutput` | 将输出添加到指定索引 | 1. `outputIndex` 输出索引  <br>2. `(tx) => bsv.Transaction.Output` 返回一个输出的回调函数  |
| `setLockTime` | 设置交易的 `nLockTime` | 1. `nLockTime` |
| `setInputSequence` | 设置输入的 `sequenceNumber` |  1. `inputIndex` 输入索引 <br>2. `sequenceNumber` |
| `seal` | 封印交易,封印后的交易不能再修改 | - |
| `getChangeAmount` | 获取找零输出的余额 | - |
| `getEstimateFee` | 根据交易大小和设置的费率评估出交易费用 | - |
| `checkFeeRate` | 检查交易的费用是否满足设置的费率 | 1. `feePerKb` 费率， satoshis 每 KB |
| `prevouts` | 返回所有输入点的序列化串 | - |
