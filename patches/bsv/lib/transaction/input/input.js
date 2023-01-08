'use strict'

var _ = require('../../util/_')
var $ = require('../../util/preconditions')
var errors = require('../../errors')
var BufferWriter = require('../../encoding/bufferwriter')
var buffer = require('buffer')
var JSUtil = require('../../util/js')
var Script = require('../../script')
var Sighash = require('../sighash')
var Output = require('../output')
var Signature = require('../../crypto/signature')
var TransactionSignature = require('../signature')
var Hash = require('../../crypto/hash')
var Interpreter = require('../../script/interpreter')
var Opcode = require('../../opcode')
const PrivateKey = require('../../privatekey')

var MAXINT = 0xffffffff // Math.pow(2, 32) - 1;
var DEFAULT_RBF_SEQNUMBER = MAXINT - 2
var DEFAULT_SEQNUMBER = MAXINT
var DEFAULT_LOCKTIME_SEQNUMBER = MAXINT - 1

function getLowSPreimage (tx, sigtype, inputIndex, inputLockingScript, inputAmount) {
  var i = 0
  do {
    var preimage = Sighash.sighashPreimage(tx, sigtype, inputIndex, inputLockingScript, inputAmount)

    var sighash = Hash.sha256sha256(preimage)

    if (_.isPositiveNumber(sighash.readUInt8()) && _.isPositiveNumber(sighash.readUInt8(31))) {
      return preimage
    }

    tx.nLockTime++
  } while (i < Number.MAX_SAFE_INTEGER)
}

function Input (params) {
  if (!(this instanceof Input)) {
    return new Input(params)
  }
  if (params) {
    return this._fromObject(params)
  }
}

Input.MAXINT = MAXINT
Input.DEFAULT_SEQNUMBER = DEFAULT_SEQNUMBER
Input.DEFAULT_LOCKTIME_SEQNUMBER = DEFAULT_LOCKTIME_SEQNUMBER
Input.DEFAULT_RBF_SEQNUMBER = DEFAULT_RBF_SEQNUMBER
// txid + output index + sequence number
Input.BASE_SIZE = 32 + 4 + 4

Object.defineProperty(Input.prototype, 'script', {
  configurable: false,
  enumerable: true,
  get: function () {
    if (this.isNull()) {
      return null
    }
    if (!this._script) {
      this._script = new Script(this._scriptBuffer)
      this._script._isInput = true
    }
    return this._script
  }
})

Input.fromObject = function (obj) {
  $.checkArgument(_.isObject(obj))
  var input = new Input()
  return input._fromObject(obj)
}

Input.prototype._fromObject = function (params) {
  var prevTxId
  if (_.isString(params.prevTxId) && JSUtil.isHexa(params.prevTxId)) {
    prevTxId = buffer.Buffer.from(params.prevTxId, 'hex')
  } else {
    prevTxId = params.prevTxId
  }
  this.output = params.output
    ? (params.output instanceof Output ? params.output : new Output(params.output)) : undefined
  this.prevTxId = prevTxId || params.txidbuf
  this.outputIndex = _.isUndefined(params.outputIndex) ? params.txoutnum : params.outputIndex
  this.sequenceNumber = _.isUndefined(params.sequenceNumber)
    ? (_.isUndefined(params.seqnum) ? DEFAULT_SEQNUMBER : params.seqnum) : params.sequenceNumber
  if (_.isUndefined(params.script) && _.isUndefined(params.scriptBuffer)) {
    throw new errors.Transaction.Input.MissingScript()
  }
  this.setScript(params.scriptBuffer || params.script)
  return this
}

Input.prototype.toObject = Input.prototype.toJSON = function toObject () {
  var obj = {
    prevTxId: this.prevTxId.toString('hex'),
    outputIndex: this.outputIndex,
    sequenceNumber: this.sequenceNumber,
    script: this._scriptBuffer.toString('hex')
  }
  // add human readable form if input contains valid script
  if (this.script) {
    obj.scriptString = this.script.toString()
  }
  if (this.output) {
    obj.output = this.output.toObject()
  }
  return obj
}

Input.fromBufferReader = function (br) {
  var input = new Input()
  input.prevTxId = br.readReverse(32)
  input.outputIndex = br.readUInt32LE()
  input._scriptBuffer = br.readVarLengthBuffer()
  input.sequenceNumber = br.readUInt32LE()
  // TODO: return different classes according to which input it is
  // e.g: CoinbaseInput, PublicKeyHashInput, MultiSigScriptHashInput, etc.
  return input
}

Input.prototype.toBufferWriter = function (writer) {
  if (!writer) {
    writer = new BufferWriter()
  }
  writer.writeReverse(this.prevTxId)
  writer.writeUInt32LE(this.outputIndex)
  var script = this._scriptBuffer
  writer.writeVarintNum(script.length)
  writer.write(script)
  writer.writeUInt32LE(this.sequenceNumber)
  return writer
}

Input.prototype.setScript = function (script) {
  this._script = null
  if (script instanceof Script) {
    this._script = script
    this._script._isInput = true
    this._scriptBuffer = script.toBuffer()
  } else if (script === null) {
    this._script = Script.empty()
    this._script._isInput = true
    this._scriptBuffer = this._script.toBuffer()
  } else if (JSUtil.isHexa(script)) {
    // hex string script
    this._scriptBuffer = buffer.Buffer.from(script, 'hex')
  } else if (_.isString(script)) {
    // human readable string script
    this._script = new Script(script)
    this._script._isInput = true
    this._scriptBuffer = this._script.toBuffer()
  } else if (Buffer.isBuffer(script)) {
    // buffer script
    this._scriptBuffer = buffer.Buffer.from(script)
  } else {
    throw new TypeError('Invalid argument type: script')
  }
  return this
}

/**
 * Retrieve signatures for the provided PrivateKey.
 *
 * @param {Transaction} transaction - the transaction to be signed
 * @param {PrivateKey | Array} privateKeys - the private key to use when signing
 * @param {number} inputIndex - the index of this input in the provided transaction
 * @param {number} sigType - defaults to Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID
 * @abstract
 */
Input.prototype.getSignatures = function (transaction, privateKeys, inputIndex, sigtype) {
  $.checkState(this.output instanceof Output)
  sigtype = sigtype || (Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID)
  var results = []
  if (privateKeys instanceof PrivateKey) {
    results.push(new TransactionSignature({
      publicKey: privateKeys.publicKey,
      prevTxId: this.prevTxId,
      outputIndex: this.outputIndex,
      inputIndex: inputIndex,
      signature: Sighash.sign(transaction, privateKeys, sigtype, inputIndex, this.output.script, this.output.satoshisBN),
      sigtype: sigtype
    }))
  } else if (_.isArray(privateKeys)) {
    var self = this

    _.each(privateKeys, function (privateKey, index) {
      var sigtype_ = sigtype
      if (_.isArray(sigtype)) {
        sigtype_ = sigtype[index] || (Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID)
      }
      results.push(new TransactionSignature({
        publicKey: privateKey.publicKey,
        prevTxId: self.prevTxId,
        outputIndex: self.outputIndex,
        inputIndex: inputIndex,
        signature: Sighash.sign(transaction, privateKey, sigtype_, inputIndex, self.output.script, self.output.satoshisBN),
        sigtype: sigtype_
      }))
    })
  }
  return results
}

/**
 * Retrieve preimage for the Input.
 *
 * @param {Transaction} transaction - the transaction to be signed
 * @param {number} inputIndex - the index of this input in the provided transaction
 * @param {number} sigType - defaults to Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID
 * @param {boolean} isLowS - true if the sig hash is safe for low s.
 * @abstract
 */
Input.prototype.getPreimage = function (transaction, inputIndex, sigtype, isLowS) {
  $.checkState(this.output instanceof Output)
  sigtype = sigtype || (Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID)
  isLowS = isLowS || false
  return isLowS
    ? getLowSPreimage(transaction, sigtype, inputIndex, this.output.script, this.output.satoshisBN)
    : Sighash.sighashPreimage(transaction, sigtype, inputIndex, this.output.script, this.output.satoshisBN)
}

Input.prototype.isFullySigned = function () {
  throw new errors.AbstractMethodInvoked('Input#isFullySigned')
}

Input.prototype.isFinal = function () {
  return this.sequenceNumber === Input.MAXINT
}

Input.prototype.addSignature = function () {
  // throw new errors.AbstractMethodInvoked('Input#addSignature')
}

Input.prototype.clearSignatures = function () {
  // throw new errors.AbstractMethodInvoked('Input#clearSignatures')
}

Input.prototype.isValidSignature = function (transaction, signature) {
  // FIXME: Refactor signature so this is not necessary
  signature.signature.nhashtype = signature.sigtype
  return Sighash.verify(
    transaction,
    signature.signature,
    signature.publicKey,
    signature.inputIndex,
    this.output.script,
    this.output.satoshisBN
  )
}

/**
 * @returns true if this is a coinbase input (represents no input)
 */
Input.prototype.isNull = function () {
  return this.prevTxId.toString('hex') === '0000000000000000000000000000000000000000000000000000000000000000' &&
    this.outputIndex === 0xffffffff
}

Input.prototype._estimateSize = function () {
  return this.toBufferWriter().toBuffer().length
}

Input.prototype.verify = function (transaction, inputIndex) {
  $.checkState(this.output instanceof Output)
  $.checkState(this.script instanceof Script)
  $.checkState(this.output.script instanceof Script)

  var us = this.script
  var ls = this.output.script
  var inputSatoshis = this.output.satoshisBN

  Interpreter.MAX_SCRIPT_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER
  Interpreter.MAXIMUM_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER

  const bsi = new Interpreter()

  let failedAt = {}

  bsi.stepListener = function (step) {
    if (step.fExec || (Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= Opcode.OP_ENDIF)) {
      if ((Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= Opcode.OP_ENDIF) || step.opcode.toNumber() === Opcode.OP_RETURN) /** Opreturn */ {
        failedAt.opcode = step.opcode
      } else {
        failedAt = step
      }
    }
  }

  var success = bsi.verify(us, ls, transaction, inputIndex, Interpreter.DEFAULT_FLAGS, inputSatoshis)

  if (failedAt.opcode) {
    failedAt.opcode = failedAt.opcode.toNumber()
  }

  return { success, error: bsi.errstr, failedAt: success ? {} : failedAt }
}

module.exports = Input
