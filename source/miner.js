/* Thread for intensive mining work */

const { isMainThread, workerData, parentPort } = require('worker_threads');
const Logger = require('./ConsoleLogger')
const Crypto = require('crypto');

if (!isMainThread) {
 var HASH_ALGO = workerData.HASH_ALGO
 var DIFFICULTY = workerData.DIFFICULTY
 parentPort.postMessage(mine(workerData.block));
}

function mine(block){
    hash = Crypto.createHash(HASH_ALGO).update(JSON.stringify(block)).digest('hex');
    n = 0
    while (!(hash.slice(0, DIFFICULTY) == "0".repeat(DIFFICULTY))){
        n += 1
        block['nonce'] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        hash = Crypto.createHash(HASH_ALGO).update(JSON.stringify(block)).digest('hex');
    }
    //console.log(`Mined block with hash ${hash.slice(0,10)}... in ${n} tries`)
    Logger.log("MINED", {hash: hash.slice(0,10)+"...", tries: n})
    return block
}