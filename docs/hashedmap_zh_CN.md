# HashedMap

Map是一种非常常用的数据结构。sCrypt 的标准库提供了一个实现了 `Map` 数据结构的库合约 `HashedMap`。概念上与java中的map，python中的字典类型类似，但在使用上有一些区别。

## HashedMap定义

在 `HashedMap` 中， `key` 和 `value` 的类型没有限制，可以是整型、字节、布尔等基本数据类型，也可以是数组、结构体等复杂数据结构。定义 `HashedMap` 的语法如下：

1. 完整定义
```javascript
HashedMap<int, int> map = new HashedMap<int, int>(b'')
```
2. 右边简写定义
```javascript
HashedMap<int, int> map = new HashedMap(b'')
```
3. 使用 `auto` 关键字定义
```javascript
auto map = new HashedMap<int, int>(b'')
```
## 序列化

`data()` 方法可以将 `HashedMap` 序列化成 `bytes` 字节。scryptlib 也提供了对应的 `toData(map)` 函数。用来在链外序列化 map。

下面是一个将 `HashedMap` 作为状态的有状态合约。

```javascript
contract StateMapTest {

    @state
    bytes _mpData;

    public function insert(MapEntry entry, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.set(entry.key, entry.val, entry.keyIndex));
        require(this.passMap(map.data(), preimage));
    }

    public function update(MapEntry entry, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.set(entry.key, entry.val, entry.keyIndex));
        require(this.passMap(map.data(), preimage));
    }

    public function delete(int key, int keyIndex, SigHashPreimage preimage) {
        require(Tx.checkPreimage(preimage));
        HashedMap<int, int> map = new HashedMap(this._mpData);
        require(map.delete(key, keyIndex));
        require(this.passMap(map.data(), preimage));
    }

    ...
}
```


## 添加元素

`HashedMap` 合约提供了很多有用的方法，添加键值对(key-value)可以使用 `HashedMap` 合约的 `set(K key, V val, int keyIndex)` 方法。与其它语言的 `map` 不同的是添加键值需要传递 `keyIndex` 参数。该参数可以通过 `scryptlib` 提供的 `findKeyIndex` 函数在链下计算。首先我们需要在链外维护一个和链上保存同步的 `map`，并把要添加的元素先添加到该 `map` 中，然后使用 `findKeyIndex` 计算出 `keyIndex`。

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
map.set(key, val);  //先把键值对添加到链外的 map

const tx = buildTx(map);
const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
const result = mapTest.insert(new MapEntry({
    key: key,
    val: val,
    keyIndex: findKeyIndex(map, key) // 获取 `keyIndex` 参数
}), preimage).verify()
expect(result.success, result.error).to.be.true;

mapTest._mpData = toData(map)
```

如果把所有元素添加到添加到 `map` 之后，再开始计算 `keyIndex`，那需要先将 `map` 转换成有序的数组。
使用以下代码可以直接转换：

```typescript
const mapEntrys = Array.from(sortmap(map), ([key, val]) => ({ key, val }))
    .map((entry, index) => {
        ...entry,
        keyIndex: index
    })
```

## 更新元素

更新元素和添加元素一样，都使用 `HashedMap` 合约的 `set(K key, V val, int keyIndex)` 方法。

## 删除元素

使用 `HashedMap` 合约的 `delete(K key, int keyIndex)` 方法来删除元素，如果删除的元素不存在会返回失败。同样需要在链外使用 `findKeyIndex(map, key)` 函数来计算 `keyIndex`。

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
const keyIndex = findKeyIndex(map, key);  //从链外map删除之前，先计算出keyIndex，并保存
map.delete(key);

const tx = buildTx(map);
const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

const result = mapTest.delete(key, keyIndex, preimage).verify()  // 调用合约的删除方法需要提供key, keyIndex
expect(result.success, result.error).to.be.true;

mapTest._mpData = toData(map)
```


## 存储模型

`HashedMap` 只存储 `key` 和 `value` 的哈希。无法通过 `HashedMap` 的序列化 `data` 反序列出原始的键值对。这对于一些注重隐私性的应用场景很有帮助。

可以通过从外部传入原始键值对，并调用 `canGet(key, val, keyIndex)` 接口来检查是否包含某个键值对。

```javascript
require(map.canGet(key, val, keyIndex));
```

或者通过 `has(key, keyIndex)` 接口检查是否包含某个键。

```javascript
require(map.has(key, keyIndex));
```

