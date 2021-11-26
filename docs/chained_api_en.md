# Using Chained APIs

Chained APIs [简体中文版](chained_api_zh_CN.md)

When deploying and calling a contract, it is often necessary to calculate the transaction fee and the change output. Without knowing the size of the unlocking script, it is difficult to calculate both. **scryptlib** extends the **[bsv](https://github.com/moneybutton/bsv)** library and provides a set of chained APIs to simplify building transactions in these cases.

## Deploy Contract

The following is a function that deploys any type of contracts.

```javascript

async function deployContract(contract, amount) {

  const address = privateKey.toAddress()
  const tx = new bsv.Transaction()
  tx.from(await fetchUtxos(address))  // Add UTXOs/bitcoins that are locked into the contract and pay for miner fees. In practice, wallets only add enough UTXOs, not all UTXOs as done here for ease of exposition.
  .addOutput(new bsv.Transaction.Output({  
    script: contract.lockingScript, // Deploy the contract to the 0-th output
    satoshis: amount,
  }))
  .change(address)   // Add change output
  .sign(privateKey) // Sign inputs. Only apply to P2PKH inputs.
  
  await sendTx(tx) // Broadcast transaction
  return tx
}

```

## Call contract

There are two cases when calling a public function of a contract:
1. The function takes a parameter of type `SigHashPreimage`
2. No `SigHashPreimage` parameter.

### No `SigHashPreimage`

If the public function of the contract being called does not contain parameter of type `SigHashPreimage`, it is relatively simple to build a transaction calling it. Generally, you can build a transaction according to the following steps:

1. Create an input from a previous transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction.
2. Use `change(address)` to add a change output.
3. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1.
4. Call `seal()` to finalize the transaction, and automatically calculate the correct transaction fee and change balance.
   

```javascript

const demo = new Demo(4, 7);

const deployTx = await deployContract(demo, 1000); // Deploy a contract

const unlockingTx = new bsv.Transaction();

unlockingTx.addInput(createInputFromPrevTx(deployTx))
.change(privateKey.toAddress())
.setInputScript(0, (_) => {  // Set the unlocking script for 0-th input
    return demo.add(11).toScript();
})
.feePerKb(250) // Set transaction fee rate. Optional, default is 500 satoshis per KB
.seal()  // Finalize the transaction and automatically calculate the correct transaction fee and change amount

// Broadcast transaction
await sendTx(unlockingTx)
```

### `SigHashPreimage`

If the public function of the contract contains parameters of type `SigHashPreimage`, it is more complicated to build the transaction calling it. This is because unlocking script containing `SigHashPreimage` affects the calculation of transaction fee and thus the `satoshis` amount in the output. In turn, `satoshis` affects the calculation of `SigHashPreimage`. The chained APIs provided by **scryptlib** hides the details of processing these inter-dependent calculations. You only need to build the transaction in the following way:

#### **1. Transaction fees paid by the bitcoins locked in the contract:**

In this case, no separate change output is included. The balances of all outputs are unknown before the transaction is built. Transaction fees will affect the calculation of all output balances.

1. Create an input from the transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction.
2. Use `setOutput(outputIndex, (tx) => bsv.Transaction.Output)` to add one or more outputs. The output balance usually needs to subtract transaction fee;
   
    ```javascript
    const newAmount = amount - tx.getEstimateFee();
    ```

3. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1. The unlocking parameter usually contains a parameter that specifies the new balance of the contract and its calculation is the same as the previous step.
   
4. Call `seal()` to finalize the transaction and automatically calculate the correct transaction fee and change amount.

```javascript

const counter = new StateCounter(0)

let amount = 8000

const lockingTx =  await deployContract(counter, amount) // Deploy a contract

const unlockingTx = new bsv.Transaction();
            
unlockingTx.addInput(createInputFromPrevTx(prevTx))
.setOutput(0, (tx) => {
    const newLockingScript = counter.getNewStateScript({
        counter: i + 1
    })
    const newAmount = amount - tx.getEstimateFee(); // To calculate the new balance of the contract, you need to subtract the transaction fee
    return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
        })
})
.setInputScript(0, (tx, output) => {  // output contains the locking script and satoshis balance of the UTXO
    const preimage = getPreimage(tx, output.script, output.satoshis)
    const newAmount = amount - tx.getEstimateFee(); // To calculate the new balance of the contract, you need to subtract the transaction fee
    return counter.unlock(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
})
.seal() // Finalize the transaction

// Broadcast transaction
await sendTx(unlockingTx)

```

#### **2. Transaction fees paid by adding other inputs:**

In this case, a separate change output is included. The balance of other outputs can generally be calculated before the transaction is built. Transaction fees only affect the calculation of change output.

1. Create an input from the transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction
2. Use `from([utxo])` to add inputs used to pay transaction fee.
3. Use `addOutput()` to add one or more outputs (add according to the contract business logic).
4. Use `change(address)` to add a change output.
5. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1. The unlocking parameters usually contains a parameter that specifies the change amount, which can be obtained through `tx.getChangeAmount()`.
6. Use `sign(privateKey)` to sign all inputs added to pay transaction fee.
7. Call `seal()` to finalize the transaction.


```javascript

...

const unlockingTx = new bsv.Transaction();

const newAmount = amount + spendAmount； // The new balance of contract has nothing to do with transaction fee

unlockingTx.addInput(createInputFromPrevTx(lockingTx))
.from(await fetchUtxos(privateKey.toAddress())) // Add inputs to pay transaction fees
.addOutput(new bsv.Transaction.Output({ // Add one or more outputs, newAmount is the new balance of the contract
    script: newLockingScript,
    satoshis: newAmount,
}))
.change(privateKey.toAddress())  // Add change output
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
    new Ripemd160(toHex(pkh)), // Change address
    tx.getChangeAmount(), // Calculate the change balance
    new Bytes(toHex(publicKeys[i])), 
    numBought 
    ).toScript();

})
.sign(privateKey) // Sign all inputs added to pay transaction fee
.seal() // Finalize the transaction

// Broadcast transaction
lockingTxid = await sendTx(unlockingTx)

```


## Extended APIs list


| Api | description | parameters |
| :-----| :---- | :---- |
| `setInputScript` | Set input unlocking script | 1. `inputIndex` Input index <br>2. `(tx, output) => bsv.Script` A callback function returns the unlocking script of the input |
| `setOutput` | Add output to the specified index | 1. `outputIndex` Output index  <br>2. `(tx) => bsv.Transaction.Output` A callback function returns the output  |
| `setLockTime` | Set the transaction's `nLockTime` | 1. `nLockTime` |
| `setInputSequence` | Set the `sequenceNumber` |  1. `inputIndex` Input index <br>2. `sequenceNumber` |
| `seal` | Seal transactions. Transactions after sealing can no longer be modified | - |
| `getChangeAmount` | Get the balance of the change output | - |
| `getEstimateFee` | Estimate transaction fee based on transaction size and fee rate | - |
| `checkFeeRate` | Check whether the transaction fee meets the fee rate | 1. `feePerKb` fee rate, satoshis per KB |
| `prevouts` | returns the serialization of all input outpoints | - |
