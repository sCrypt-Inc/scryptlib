'use strict'

var Stack = function Stack (rawstack, varStack) {
  this.stack = rawstack
  this.varStack = varStack || []
}

module.exports = Stack

Stack.prototype.pushVar = function (varName) {
  this.varStack.push(varName || '$tmp')
}

Stack.prototype.popVar = function () {
  this.varStack.pop()
}

Stack.prototype.push = function (n, varName) {
  this.pushVar(varName)
  this.stack.push(n)
  this.checkConsistency()
}

Stack.prototype.pop = function () {
  this.popVar()
  let top = this.stack.pop()
  this.checkConsistency()
  return top
}

Stack.prototype.updateTopVars = function (vars) {
  if (vars.length > this.varStack.length) {
    throw new Error(`updateTopVars fail, stack: ${this.stack.length},  varStack: ${this.varStack.length}, vars:${vars.length}`)
  }
  vars = vars.reverse()
  this.varStack.splice(this.varStack.length - vars.length, vars.length, ...vars)
}

Stack.prototype.stacktop = function (i) {
  return this.stack[this.stack.length + i]
}

Stack.prototype.vartop = function (i) {
  return this.varStack[this.varStack.length + i]
}

Stack.prototype.slice = function (start, end) {
  return this.stack.slice(start, end)
}

Stack.prototype.splice = function (start, deleteCount, ...items) {
  this.varStack.splice(start, deleteCount, ...items)
  return this.stack.splice(start, deleteCount, ...items)
}

Stack.prototype.write = function (i, value) {
  this.stack[this.stack.length + i] = value
}

Stack.prototype.copy = function () {
  return new Stack(this.stack.slice() || [], this.varStack.slice() || [])
}

function bytesToHexString (bytearray) {
  return bytearray.reduce(function (o, c) {
    o += ('0' + (c & 0xFF).toString(16)).slice(-2)
    return o
  }, '')
}

Stack.prototype.printVarStack = function () {
  let array = this.varStack.map((v, i) => ({
    name: v,
    value: bytesToHexString(this.rawstack[i].data)
  }))
  console.log(JSON.stringify(array, null, 4))
}

Stack.prototype.checkConsistency = function () {
  if (this.stack.length !== this.varStack.length) {
    this.printVarStack()
    throw new Error(`checkConsistency fail, stack: ${this.stack.length}, varStack:${this.varStack.length}`)
  }
}

Stack.prototype.checkConsistencyWithVars = function (varStack) {
  if (this.stack.length < varStack.length) {
    this.printVarStack()
    throw new Error(`checkConsistencyWithVars fail, stack: ${this.stack.length}, varStack:${varStack.length}`)
  }
}

Object.defineProperty(Stack.prototype, 'length', {
  get: function () {
    return this.stack.length
  }
})

Object.defineProperty(Stack.prototype, 'rawstack', {
  get: function () {
    return this.stack
  }
})
