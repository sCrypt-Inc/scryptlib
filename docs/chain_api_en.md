# 使用链式 API 构造交易

在部署合约和调用合约的过程中构造，通常需要计算交易费用和找零输出，在不知道解锁脚本大小的情况，很难准确地计算交易费用以及找零输出。**scryptlib** 扩展了 **BSV** 库， 提供一套链式API来构造交易，使得即使在这种情况下，计算交易费用和找零都变得简单。

## 部署

下面是一个实现部署合约功能的函数，任意类型的合约都可以使用该函数来部署。

```javascript

async function deployContract(contract, amount) {

  const address = privateKey.toAddress()
  const tx = new bsv.Transaction()
  tx.from(await fetchUtxos(address))  // 添加用来支付矿工费用的UTXO，钱包通常会在这里做 UTXO 的筛选，以防止添加过多 UTXO
  .addOutput(new bsv.Transaction.Output({  本中
    script: contract.lockingScript, // 将合约部署到第一个输出的锁定脚
    satoshis: amount,
  }))
  .change(address)   //找零
  .sign(privateKey) //私钥签名
  await sendTx(tx) //广播交易
  return tx
}

```

## 调用合约

### 调用无状态合约

构造调用无状态合约的交易比较简单。一般可以按照以下步骤构建交易：

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中
2. 使用 `.change(address)` 添加一个找零输出。
3. 使用 `.setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本
4. 调用 `.seal()` 封印交易，同时自动计算出正确的交易费用和找零余额
   

```javascript

const demo = new Demo(4, 7);

const deployTx = await deployContract(demo, 1000); // 部署合约

const unlockingTx = new bsv.Transaction();

unlockingTx.addInput(createInputFromPrevTx(deployTx))
.change(privateKey.toAddress())
.setInputScript(0, (_) => {  //设置第一个输入的解锁脚本
    return demo.add(11).toScript();
})
.feePerKb(250) // 可选，默认是每KB 500 satoshis
.seal()  //封印交易, 同时自动计算出正确的交易费用和找零余额

// 广播交易
await sendTx(unlockingTx)
```

### 调用有状态合约

构造调用有状态合约的交易比较复杂。因为解锁脚本的大小影响到交易费用的计算，从而影响输出中的 `satoshis` 余额，输出中的 `satoshis` 余额又会影响 `preimage` 的计算。使用 **scryptlib** 的链式 API 隐藏了处理这些繁琐计算的细节， 你只需按照以下方式来构造交易：

#### 交易费用是由合约支付：

这种情况下合约的新余额在构造交易之前是未知的，交易费用会影响合约的新余额。

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中
2. 使用 `.setOutput(outputIndex, (tx) => bsv.Transaction.Output)` 添加一个有状态合约的输出。合约新的余额通常需要减去交易费用；
   
    ```javascript
    const newAmount = amount - tx.getEstimateFee();
    ```

3. 使用 `.setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本，解锁参数通常包含一个指定合约新余额的参数，其计算方式与上一步相同
   
4. 调用 `.seal()` 封印交易，同时自动计算出正确的交易费用和找零余额

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
    const newAmount = amount - tx.getEstimateFee(); //计算合约的新余额，需要减去交易的费用
    return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
        })
})
.setInputScript(0, (tx, output) => {  //output 包含输入对应的锁定脚本和 satoshis 余额
    const preimage = getPreimage(tx, output.script, output.satoshis)
    const newAmount =  amount - tx.getEstimateFee(); //计算合约的新余额，需要减去交易的费用
    return counter.unlock(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
})
.seal()

// 广播交易
await sendTx(unlockingTx)

```

#### 交易费用是通过添加其它输入来支付： 

这种情况下合约的新余额一般是已知的，交易费用不会影响合约的新余额。

1. 通过 `createInputFromPrevTx(tx, outputIndex)` 从合约所在的交易创建输入，并添加到交易中
2. 通过 `.from([utxo])` 来添加用于支付交易费用的输入
3. 使用 `.addOutput()` 添加一个或多个有状态合约的输出(根据合约业务逻辑添加)
4. 使用 `.change(address)` 添加一个找零输出。
5. 使用 `.setInputScript(inputIndex, (tx, output) => bsv.Script)` 为步骤 1 添加的输入设置解锁脚本，解锁参数通常包含一个指定找零余额的参数，该参数可以通过 `tx.getChangeAmount()` 来获取。
6. 使用 `.sign(privateKey)` 来签名所有添加用于支付交易费用的输入
7. 调用 `.seal()` 封印交易，同时自动计算出正确的交易费用和找零余额


```javascript

const unlockingTx = new bsv.Transaction();

const newAmount = amount + spendAmount； //合约新余额与交易费用无关

unlockingTx.addInput(createInputFromPrevTx(prevTx))
.from(await fetchUtxos(privateKey.toAddress())) //添加用于支付交易费用的输入
.addOutput(new bsv.Transaction.Output({ // 添加一个有状态合约的输出, newAmount 是合约新的余额
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
.seal()

// 广播交易
lockingTxid = await sendTx(unlockingTx)

```