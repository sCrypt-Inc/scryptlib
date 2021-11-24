# HashedMap

HashedMap [简体中文版](hashedmap_zh_CN.md)

Map is a very commonly used data structure. sCrypt's standard library provides a library contract `HashedMap` that implements the `Map` data structure. The concept is similar to the map in java and the dictionary in python, but there are some differences in usage.

## Definition of HashedMap

In `HashedMap`, there are no restrictions on the types of `key` and `value`. They can be basic data types such as integers, bytes, and booleans, or they can be complex data structures such as arrays and structures. The syntax for defining `HashedMap` is as follows:

1. Full definition
```javascript
HashedMap<int, int> map = new HashedMap<int, int>(b'')
```
2. Abbreviated definition on the right
```javascript
HashedMap<int, int> map = new HashedMap(b'')
```
3. Use the `auto` keyword definition
```javascript
auto map = new HashedMap<int, int>(b'')
```
## Serialization

The `data()` method can serialize `HashedMap` into `bytes`. scryptlib also provides the corresponding `toData(map)` function. Used to serialize the HashedMap off-chain.

Below is a stateful contract with HashedMap as the state.

```javascript
contract StateMapTest {

    @state
    bytes _mpData;  //Save the serialized data of the map

    // Add key-value pairs to the map
    public function insert(MapEntry entry, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.set(entry.key, entry.val, entry.keyIndex));
        require(this.passMap(map.data(), preimage));
    }

    // update key-value pairs in the map
    public function update(MapEntry entry, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.set(entry.key, entry.val, entry.keyIndex));
        require(this.passMap(map.data(), preimage));
    }

    // delete key-value pairs in the map
    public function delete(int key, int keyIndex, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.delete(key, keyIndex));
        // Serialize map, update state
        require(this.passMap(map.data(), preimage));
    }

    // update state _mpData, and build a output contains new state
    function passMap(bytes newData, SigHashPreimage preimage) : bool {
        this._mpData = newData;
        bytes outputScript = this.getStateScript();
        bytes output = Util.buildOutput(outputScript, Util.value(preimage));
        return (hash256(output) == Util.hashOutputs(preimage));
    }
}
```


## Add Element

The `HashedMap` contract provides many useful methods. To add key-value pairs, you can use the `set(K key, V val, int keyIndex)` method of the `HashedMap` contract. Unlike `map` in other languages, adding key-value pairs requires passing the `keyIndex` parameter, which can be calculated off-chain by the `findKeyIndex` function provided by scryptlib. First, we need to maintain a map outside the chain that is synchronized with the chain, and add the elements to be added to the map first. Then use `findKeyIndex` to calculate `keyIndex`.

**scrypt**: 
```typescript
public function insert(MapEntry entry, SigHashPreimage preimage) {
    require(Tx.checkPreimage(preimage));
    HashedMap<int, int> map = new HashedMap(this._mpData);
    require(map.set(entry.key, entry.val, entry.keyIndex));
    require(this.passMap(map.data(), preimage));
}
```

**typescript**:

```javascript
let map = new Map<number, number>();
map.set(key, val);  // First add the key-value pair to the map outside the chain

const tx = buildTx(map);
const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
const result = mapTest.insert(new MapEntry({
    key: key,
    val: val,
    keyIndex: findKeyIndex(map, key) // Get the `keyIndex` parameter
}), preimage).verify()
expect(result.success, result.error).to.be.true;

mapTest._mpData = toData(map)
```

If you add all the elements to the `map` before starting to calculate the `keyIndex`, you need to convert the `map` into an ordered array first.
Use the following code to convert directly:

```typescript
const mapEntrys = Array.from(sortmap(map), ([key, val]) => ({ key, val }))
    .map((entry, index) => {
        ...entry,
        keyIndex: index
    })
```

## Update Element

Updating elements is the same as adding elements, using the `set(K key, V val, int keyIndex)` method of the `HashedMap` contract.

## Delete Element

Use the `delete(K key, int keyIndex)` method of the `HashedMap` contract to delete elements. If the deleted element does not exist, it will return failure. It is also necessary to use the `findKeyIndex(map, key)` function outside the chain to calculate the `keyIndex`.

**scrypt**: 
```javascript
public function delete(int key, int keyIndex, SigHashPreimage preimage) {
    require(Tx.checkPreimage(preimage));
    HashedMap<int, int> map = new HashedMap(this._mpData);
    require(map.delete(key, keyIndex));
    require(this.passMap(map.data(), preimage));
}
```

**typescript**:

```javascript
const keyIndex = findKeyIndex(map, key);  // Before deleting from the off-chain map, first calculate the keyIndex and save it
map.delete(key);

const tx = buildTx(map);
const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

const result = mapTest.delete(key, keyIndex, preimage).verify()  // To call the delete method of the contract, you need to provide the key and keyIndex
expect(result.success, result.error).to.be.true;

mapTest._mpData = toData(map)
```


## Storage Model

`HashedMap` only stores the hash of `key` and `value`. It is not possible to deserialize the original key-value pairs through the serialization of `data` of `HashedMap`. This is very helpful for some privacy-focused application scenarios. You can pass in the original key-value pair from the outside and call the `canGet(key, val, keyIndex)` interface to check whether a key-value pair is included.


```javascript
require(map.canGet(key, val, keyIndex));
```

Or check whether a key is included through the `has(key, keyIndex)` interface.

```javascript
require(map.has(key, keyIndex));
```

