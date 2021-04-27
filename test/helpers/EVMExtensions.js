const PREFIX = "Returned error: VM Exception while processing transaction: ";

tryCatch = async (promise, message) => {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error, "Expected an error but did not get one");
        assert(error.message.startsWith(PREFIX + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
    }
};

advanceTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err) }
            return resolve(result)
        })
    })
}

advanceBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err) }
            const newBlockHash = web3.eth.getBlock('latest').hash

            return resolve(newBlockHash)
        })
    })
}

takeSnapshot = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_snapshot',
            id: new Date().getTime()
        }, (err, snapshotId) => {
            if (err) { return reject(err) }
            return resolve(snapshotId)
        })
    })
}

revertToSnapShot = (id) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_revert',
            params: [id],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err) }
            return resolve(result)
        })
    })
}

advanceTimeAndBlock = async (time) => {
    await advanceTime(time)
    await advanceBlock()
    return Promise.resolve(web3.eth.getBlock('latest'))
}

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    takeSnapshot,
    revertToSnapShot,

    catchRevert: async (promise) => await tryCatch(promise, "revert"),
    catchOutOfGas: async (promise) => await tryCatch(promise, "out of gas"),
    catchInvalidJump: async (promise) => await tryCatch(promise, "invalid JUMP"),
    catchInvalidOpcode: async (promise) => await tryCatch(promise, "invalid opcode"),
    catchStackOverflow: async (promise) => await tryCatch(promise, "stack overflow"),
    catchStackUnderflow: async (promise) => await tryCatch(promise, "stack underflow"),
    catchStaticStateChange: async (promise) => await tryCatch(promise, "static state change")
}