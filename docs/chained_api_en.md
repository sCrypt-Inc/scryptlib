# Using Chained APIs

Chained APIs [简体中文版](chained_api_zh_CN.md)

In the process of deploying the contract and calling the contract, it is usually necessary to calculate the transaction fee and change the output. Without knowing the size of the unlocking script, it is difficult to accurately calculate transaction fees and change output. **scryptlib** extends the **BSV** library and provides a set of chain APIs to construct transactions. This makes it easy to calculate transaction fees and change output even in this case.

## Deploy Contract

The following is a function that implements the deployment contract function. Any type of contract can be deployed using this function.

```javascript

async function deployContract(contract, amount) {

  const address = privateKey.toAddress()
  const tx = new bsv.Transaction()
  tx.from(await fetchUtxos(address))  // Add UTXO that is used to pay for miner fees and the bitcoin locked into the contract. Wallets usually do UTXO screening here to prevent adding too much UTXO
  .addOutput(new bsv.Transaction.Output({  
    script: contract.lockingScript, // Deploy the contract to the 0-th output lock script
    satoshis: amount,
  }))
  .change(address)   // Add change output
  .sign(privateKey) // Private key signature
  await sendTx(tx) // Broadcast transaction
  return tx
}

```

## Call contract

### The contract public function does not contain parameters of type `SigHashPreimage`

If the public function of the contract does not contain parameters of type `SigHashPreimage`, it is relatively simple to construct a transaction that calls the contract. Generally, you can construct a transaction according to the following steps:

1. Create an input from the transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction.
2. Use `change(address)` to add a change output.
3. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1.
4. Call `seal()` to seal the transaction, and automatically calculate the correct transaction fee and change balance.
   

```javascript

const demo = new Demo(4, 7);

const deployTx = await deployContract(demo, 1000); // Deploy contract

const unlockingTx = new bsv.Transaction();

unlockingTx.addInput(createInputFromPrevTx(deployTx))
.change(privateKey.toAddress())
.setInputScript(0, (_) => {  // Set the unlocking script for 0-th input
    return demo.add(11).toScript();
})
.feePerKb(250) // Set transaction fee rate, optional, default is 500 satoshis per KB
.seal()  // Seal the transaction, and automatically calculate the correct transaction fee and change balance

// Broadcast transaction
await sendTx(unlockingTx)
```

### Contract public functions include parameters of type `SigHashPreimage`

If the public function of the contract contains parameters of type `SigHashPreimage`, it is more complicated to construct the transaction that calls the contract. Because the size of the unlocking script affects the calculation of transaction fees, and thus affects the `satoshis` balance in the output. The balance of `satoshis` in the output will affect the calculation of `preimage`. The chained APIs providing by **scryptlib** hides the details of processing these tedious calculations. You only need to structure the transaction in the following way:

#### **Transaction fees are paid by the contract:**

In this case, no independent change output is included. The balance of all outputs is unknown before the transaction is constructed. Transaction fees will affect the calculation of all output balances.

1. Create an input from the transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction.
2. Use `setOutput(outputIndex, (tx) => bsv.Transaction.Output)` to add one or more outputs. The output balance usually needs to subtract transaction fees;
   
    ```javascript
    const newAmount = amount - tx.getEstimateFee();
    ```

3. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1. The unlocking parameter usually contains a parameter that specifies the new balance of the contract, and its calculation method is the same as the previous step.
   
4. Call `seal()` to seal the transaction, and automatically calculate the correct transaction fee and change balance.

```javascript

const counter = new StateCounter(0)

let amount = 8000

const lockingTx =  await deployContract(counter, amount) // Deploy contract

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
.setInputScript(0, (tx, output) => {  // output contains the locking script and satoshis balance corresponding to the input
    const preimage = getPreimage(tx, output.script, output.satoshis)
    const newAmount =  amount - tx.getEstimateFee(); // To calculate the new balance of the contract, you need to subtract the transaction fee
    return counter.unlock(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
})
.seal() // Seal the transaction, and automatically calculate the correct transaction fee and change balance

// Broadcast transaction
await sendTx(unlockingTx)

```

#### **Transaction fees are paid by adding other inputs:**

In this case, an independent change output is included. The balance of other outputs can generally be calculated before the transaction is constructed. Transaction fees only affect the calculation of change output.

1. Create an input from the transaction where the contract is located by `createInputFromPrevTx(tx, outputIndex)` and add it to the transaction
2. Use `from([utxo])` to add input used to pay transaction fees.
3. Use `addOutput()` to add one or more outputs (add according to the contract business logic).
4. Use `change(address)` to add a change output.
5. Use `setInputScript(inputIndex, (tx, output) => bsv.Script)` to set the unlocking script for the input added in step 1. The unlocking parameters usually contains a parameter that specifies the change balance, which can be obtained through `tx.getChangeAmount()`.
6. Use `sign(privateKey)` to sign all inputs added to pay transaction fees.
7. Call `seal()` to seal the transaction, and automatically calculate the correct transaction fee and change balance.


```javascript

...

const unlockingTx = new bsv.Transaction();

const newAmount = amount + spendAmount； // The new balance of contract has nothing to do with transaction fees

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
.sign(privateKey) // Sign all inputs added to pay transaction fees
.seal() // Seal the transaction, and automatically calculate the correct transaction fee and change balance

// Broadcast transaction
lockingTxid = await sendTx(unlockingTx)

```


## Extended APIs list


| Api | description | parameters |
| :-----| :---- | :---- |
| `setInputScript` | Set input unlocking script | 1. `inputIndex` Input index <br>2. `(tx, output) => bsv.Script` A callback function returns the unlocking script of the input |
| `setOutput` | Add output to the specified index | 1. `outputIndex` Output index  <br>2. `(tx) => bsv.Transaction.Output` A callback function returns the output  |
| `setLockTime` | Set the transaction's `nLockTime` | 1. `nLockTime` |
| `setInputSequence` | Set the entered `sequenceNumber` |  1. `inputIndex` Input index <br>2. `sequenceNumber` |
| `seal` | Sealed transactions, transactions after sealing can no longer be modified | - |
| `getChangeAmount` | Get the balance of the change output | - |
| `getEstimateFee` | Evaluate transaction fees based on transaction size and fee rate | - |
| `checkFeeRate` | Check whether the transaction fee meets the fee rate | 1. `feePerKb` fee rate, satoshis per KB |
