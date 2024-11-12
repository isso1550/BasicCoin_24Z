/* Launch script for 3 nodes scenario in ~/run.bat
                     7 nodes scenario in ~/run_big.bat
    Use ip:port/test_broadcast and observe consoles to test network
*/

/* 
TODO: connection verification, leaving network, wallet integration (how? now?), better input arg parsing, reaction to empty neighbors
        connectivity exceptions handling - retry, wait, abandon
*/

const Crypto = require('crypto');
const express = require('express');
const app = express()
const { Worker } = require('worker_threads')
const Logger = require("./ConsoleLogger.js")
const AppConfig = require('./AppConfig.js');
const { exit } = require('process');
app.use(express.json());


/*TODO move configuration to module/config file*/

//Adresses and modes
//var VERBOSE = true
var MINER = false
var BUSY_MINING = false
var MINED_TRAN_HASH = null
var worker
var SEND_OUTDATED_PREVHASH = false
var SEND_FORKS = false


var ORIGIN_MODE = false //ORIGIN = First node in network
var MY_ADDRESS
var CONNECT_TO_ADDR
var ATTEMPTING_TO_LEAVE = false //Node is currently trying to leave
var longest_chain = 0
var longest_chain_endpoint = 0
var CHAIN_ENDPOINTS = []

var coinbase_verified //verify coinbase block only once

//Stored data
var Neighbors = [];
//TODO: hashes stored in one array, but details in appropriate 
var Message_hashes = [];

var Blocks = [];

var BlocksMap = new Map();
//hash -> idx in blocks array
BlocksMap.set("GENESIS", 0)

var PendingTransactions = new Map();

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/messages', (req, res) => {
    res.send(Message_hashes)
})

app.get('/mine', (req, res) => {
    try_to_mine()
    res.send("ok")
})

app.get('/pendingtransactions', (req, res) => {
    ar = Array.from(PendingTransactions, ([name, value]) => ({ value }));
    res.send(ar)
})

app.get('/blocksmap', (req, res) => {
    ar = Array.from(BlocksMap, ([name, value]) => ({ name, value }));
    res.send(ar)
})

app.get('/blocks', (req, res) => {
    res.send(Blocks)
})

app.get('/endpoints', (req, res) => {
    console.log("LCE ", longest_chain_endpoint)
    res.send(CHAIN_ENDPOINTS)
})

app.get('/reorder', (req, res) => {
    find_orphans(0)
    try_to_mine()
    res.send("ok")
})

app.get('/balance', (req, res) => {
    ar = Array.from(calculate_balance(), ([name, value]) => ({ name, value }));
    res.send(ar)
})

app.get(AppConfig.NEIGHBORS_ENDPOINT, (req, res) => {
    res.send(Neighbors)
})

app.get("/vis", (req, res) => {
    bstring = ""
    bcount = 0
    cstring = ""
    Blocks.forEach((block)=>{
        tran = block['data']['transaction']['data']
        title = `${tran['sender'].slice(0,6)} to ${tran['receiver'].slice(0,6)} with ${tran['amount'] } by ${block['miner']}`

        bstring = bstring +  `{ id: ${bcount}, label: "${bcount}: ${block['hash'].slice(0,8)}", title: "${title}"  }, \n`

        if (BlocksMap.has(block['data']['prev_hash'])){
            cstring = cstring + `{ from: ${bcount}, to: ${BlocksMap.get(block['data']['prev_hash'])}} , \n`
            
        } else {
            console.log("/vis missing prev hash")
        }
        bcount += 1
    })
    code = AppConfig.VISHTML[0] + bstring + AppConfig.VISHTML[1] + cstring + AppConfig.VISHTML[2]
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(code));
})

app.delete(AppConfig.NEIGHBORS_ENDPOINT, (req, res) => {
    //Receive request made by neighbor to leave network 
    Logger.log("NEIGH_LEAVE_REQ")
    if (ATTEMPTING_TO_LEAVE) {
        Logger.log("NEIGH_LEAVE_DENY")
        var status = 503
    } else {
        neigh_list = req.body
        for (const new_neigh of neigh_list) {
            //Add new neighbors to own list
            if (!Neighbors.includes(new_neigh) && new_neigh != MY_ADDRESS) {
                Neighbors.push(new_neigh)
            }
        }
        Logger.log("NEIGH_LEAVE_ACCEPT")
        var status = 200
    }
    res.status(status)
    res.send()
})

app.put(AppConfig.NEIGHBORS_ENDPOINT, (req, res) => {
    //Receive potential new master from leaving node.
    new_master = req.body['new_master']
    leaving_node = req.body['leaving_node']
    /*Remove leaving node 
    Currently disabled to prevent false requests from removing other nodes from net

    https://stackoverflow.com/questions/5767325/how-can-i-remove-a-specific-item-from-an-array-in-javascript
    */
    /*
    const idx = Neighbors.indexOf(leaving_node)
    if (idx > -1) {
        Neighbors.splice(idx, 1)
    } else {
        console.warn("Leaving neighbor address not found. Possible error with request.")
    }
    */

    if (new_master != MY_ADDRESS) {
        CONNECT_TO_ADDR = new_master
        Logger.log("NEIGH_MASTER_UPDATE", { "new_master": new_master })
        if (!Neighbors.includes(new_master)) {
            // Probably should also add the new master to neighbors
            Neighbors.push(new_master);
        }
    } else {
        Logger.log("NEIGH_MASTER_SKIP")
    }
    res.status = 200
    res.send()
})

app.post(AppConfig.BROADCAST_ENDPOINT, (req, res) => {
    // NOTE: It also resends the message back from where it came from
    payload = req.body

    if (Message_hashes.includes(payload['hash'])) {
        Logger.log("BCAST_SKIP", { "payload_hash": payload["hash"] })
        var message = "Message already received"
        var status = 422

    } else {
        /*if (verify_message_hash(payload) != true) {
            var message = "Message hash verification failed, possible connection issue"
            var status = 400
        } else {*/
        Logger.log("BCAST_RECEIVE", { "payload_hash": payload["hash"] })
        let type = payload['type']
        //Message_hashes.push(payload['hash']) //przeniesione do funkcji typu process_x

        var message = "Message processed"
        var status = 200
        switch (type) {
            case "Transaction":
                process_transaction(payload)
                break;
            case "Block":
                process_block(payload)
                break;
            default:
                Logger.log("BCAST_UNKNOWN", { "payload_hash": payload["hash"], "type": type })
                var message = "Unknown message type"
                var status = 400
        }
        //}
    }
    resp = {
        message: message
    }
    res.status(status)
    res.send(resp)
})

function broadcast_message(payload) {
    tasks = []
    for (const neigh of Neighbors) {
        Logger.log("BCAST_FORWARD", { "payload_hash": payload["hash"], "target": neigh })
        let url = neigh + AppConfig.BROADCAST_ENDPOINT
        tasks.push(send_message(url, payload, (status, data) => { /*console.log(url, status, data)*/ }))
    }
    return tasks
}

async function process_transaction(payload) {
    Logger.log("TRAN_REC", { "transaction_data": JSON.stringify(payload['data']) })
    //Deny coinbase transactions
    if (payload['data']['type'] == "Coinbase") {
        return
    }
    //Verify hash
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data'])).digest('hex');
    if (payload['hash'] != data_hash) {
        Logger.log("TRAN_DENY_HASH", { tran_hash: payload['hash'], expected_hash: data_hash })
        return
    }

    Message_hashes.push(payload['hash'])
    PendingTransactions.set(payload['hash'], payload)
    tasks = broadcast_message(payload)
    if (MINER) {
        await Promise.all(tasks)
        try_to_mine()
    }
}

function find_orphans(threshold=1){
    console.warn("Starting reorganization")
    orphans = []
    /*
    Check if endpoint fell back further than steps (based on threshold)
    default to 1, so orphan if fell back for 2+ steps
    */
    CHAIN_ENDPOINTS.forEach((ep_idx) => {
        if (Blocks[ep_idx]['order'] < longest_chain-threshold){
            orphans.push(Blocks[ep_idx])
        }
    })

    main_chain = get_blockchain(Blocks[longest_chain_endpoint], as_index=true)
    console.log(main_chain)

    orphans.forEach((ob) => {
        /*
        For each orphan re-add transactions to pending list and repeat for parent
        until no more parents (found genesis) or dropped chain joins current main_chain
        */
        console.log(`Dropping orphan ${ob['hash']}`)
        PendingTransactions.set(ob['data']['transaction']['hash'], ob['data']['transaction'])
        ob_idx = CHAIN_ENDPOINTS.indexOf(BlocksMap.get(ob['hash']))
        console.log("pre_delete ", CHAIN_ENDPOINTS)
        CHAIN_ENDPOINTS.splice(ob_idx, 1)
        console.log("post delete ", CHAIN_ENDPOINTS)

        idx = BlocksMap.get(ob['data']['prev_hash'])
        prev_block = Blocks[idx]
        //Repeat for parents
        while(prev_block['hash'] != "GENESIS" && main_chain.indexOf(idx)==-1){
            console.log(idx, main_chain.indexOf(idx))
            console.log(`Dropping orphan parent ${prev_block['hash']}`)

            /*
            Re-add transactions at the front with assumption that they are older and should be processed
            earlier to maintain dependencies
            */
            m = new Map()
            m.set(prev_block['data']['transaction']['hash'], prev_block['data']['transaction'])
            let it = PendingTransactions.entries()
            while(true) {
                data = it.next().value
                if (data == undefined){
                    break;
                }
                m.set(data[0], data[1])
            }

            //Prepare next iteration
            PendingTransactions = m
            idx = BlocksMap.get(prev_block['data']['prev_hash'])
            if (idx == undefined || idx==null){
                console.warn("Error in searching for trans. One of the blocks has missing parents. Possible hard fork")
            } else {
                prev_block = Blocks[idx]
            }
        }
    })
}

async function try_to_mine() {
    /* Async function check if miner node is busy and decides whether to start mining */
    if (!BUSY_MINING && PendingTransactions.size > 0) {
        BUSY_MINING = true
        block = create_block()
        if (block == null) {
            BUSY_MINING = false
            //console.log("No trans to mine")
            return
        }
        Logger.log("MINE_START", { "transaction": JSON.stringify(block['transaction']['data']), "tran_hash": block['transaction']['hash'] })
       
        /*Start mining thread*/
        MINED_TRAN_HASH = block['transaction']['hash']
        worker = new Worker("./source/miner.js", { workerData: { block: block } });
        worker.once("message", async (result) => {
            block = result
            payload = prepare_payload("Block", block)
            payload['miner'] = port

            //Check whether transaction was mined by someone else during own mining
            if (!PendingTransactions.has(block['transaction']['hash'])){
                console.warn("Mined too late, transaction already mined ", block['transaction']['hash'], payload['hash'])
                BUSY_MINING = false
                try_to_mine()
                return
                
            }
            saved = save_block(payload)
            if (saved){
                tasks = broadcast_message(payload)
                await Promise.all(tasks)
                
            }
            MINED_TRAN_HASH = null
            BUSY_MINING = false
            try_to_mine()
            
        });
        worker.on("error", error => {
            console.warn(error);
            MINED_TRAN_HASH = null
            BUSY_MINING = false
        });
        worker.on("exit", exitCode => {
            //console.warn(`It exited with code ${exitCode}`);  
            MINED_TRAN_HASH = null
            BUSY_MINING = false
        })

    }
}

function verify_transaction(tran, payload=undefined) {
    /* Special case - always allow coinbase */
    if (tran['data']['type'] == "Coinbase") {
        //Dont accept coinbase transactions - first one is built-in so will work anyway - 12.11
        return false
    }
    try {
        //Verify signature
        verified = Crypto.verify(null, tran['hash'], tran['pk'], Buffer.from(tran['signature']))
        if (!verified) {
            throw new Error("Incorrect signature. Removing incorrect transaction.")
        }

        //Verify sender id and pk
        if (tran['data']['sender'] != Crypto.createHash(AppConfig.HASH_ALGO).update(tran['pk']).digest('hex')) {
            console.warn("Sender is not the one signing!")
            throw new Error("PK hash is not sender id. Removing incorrect transaction.")
        }

        /*
        Verify sender bank account
        Specifying payload allows to check balance for any moment/any branch starting with it
        When checking current_balance payload should be last SAVED block from the path, path without currently analyzed transaction
        */
        if (payload != undefined){
            let parent = Blocks[BlocksMap.get(payload['data']['prev_hash'])]
            if (parent==undefined){
                console.warn("Missing parent")
            }
            acc = calculate_balance(parent)
        } else {
            acc = calculate_balance()
        }
        if(acc == null){
            throw new Error("Missing parent, hard fork possible.")
        }
        balance = acc.get(tran['data']['sender'])
        if (balance == undefined | (parseInt(balance) - parseInt(tran['data']['amount']) < 0)) {
            throw new Error("Insufficient funds or unknown balance. Removing incorrect transaction.")
        } else {
            verified = true
        }

    } catch (err) {
        if (err instanceof Error) {
            Logger.log("VERIFICATION_FAIL", { "reason": err.message, "tran_hash": tran['hash'] })
            PendingTransactions.delete(tran['hash'])
            return false
        }
        console.warn(err)
    }

    return true
}

function create_block() {
    /* Create new block based on saved data */
    let iter1 = PendingTransactions.values()
    let tran
    let verified = false
    while (!verified && PendingTransactions.size > 0) {
        tran = iter1.next().value
        verified = verify_transaction(tran)
        //verified = true //!!!!scammer node
    }

    if (verified && PendingTransactions.has(tran['hash'])) {
        Logger.log("VERIFICATION_OK", { "tran_hash": tran['hash'] })

        /*Additional options to cause more forks/outdated blocks for testing*/
        if (SEND_OUTDATED_PREVHASH){
            if (longest_chain>2){
                prev_hash = Blocks[longest_chain_endpoint-2]['hash']
            } else {
                prev_hash = Blocks[0]['hash']
            }
            
        } else if (SEND_FORKS){
            if (longest_chain > 2){
                prev_block_idx = BlocksMap.get(Blocks[longest_chain_endpoint]['data']['prev_hash'])
                prev_block = Blocks[prev_block_idx]
                prev_hash = prev_block['hash']
            } else {
                prev_hash = Blocks[longest_chain_endpoint]['hash']
            }
        
        /*
        Additional options end
        Main logic in else {}
        */
        } else {
            prev_hash = Blocks[longest_chain_endpoint]['hash']
        }
        block = {
            "prev_hash": prev_hash,
            "transaction": tran,
            "nonce": 0,
            "timestamp": Date.now()
        }
        return block
    } else {

        return null
    }

}

function process_block(payload) {
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data'])).digest('hex');
    if (payload['hash'] != data_hash) {
        Logger.log("BLOCK_DENY_HASH", { block_hash: payload['hash'], expected_hash: data_hash })
        return
    }
    if (!(data_hash.slice(0, AppConfig.DIFFICULTY) == "0".repeat(AppConfig.DIFFICULTY))) {
        Logger.log("BLOCK_DENY_DIFF", { difficulty: AppConfig.DIFFICULTY, block_hash: data_hash })
        return
    }

    //Tran hash verify - 12.11
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data']['transaction']['data'])).digest('hex');
    if (payload['data']['transaction']['hash'] != data_hash) {
        Logger.log("TRAN_DENY_HASH", { tran_hash: payload['hash'], expected_hash: data_hash })
        return
    }

    if(!BlocksMap.has(payload['data']['prev_hash'])){
        console.warn("Parent not found. Possible hard fork.")
    }

    if (!verify_transaction(payload['data']['transaction'], payload)){
        //TODO verify transaction based on corresponding fork/path?
        console.warn("Block deny. Transaction verification failed.")
        return
    }

    

    saved = save_block(payload)
    if (saved){
        if (BUSY_MINING && MINED_TRAN_HASH == payload['data']['transaction']['hash']){
            /*
            Abandon mining if newly saved block includes same transaction
            */
            console.warn("DISABLE THREAD")
            worker.terminate()
        }
        broadcast_message(payload)
    }
}

function save_block(payload){
    if (!BlocksMap.has(payload['data']['prev_hash'])){
        console.warn("Possible HARD FORK")
    } else {
        /*
        Verify if new transaction is unknown in current chain 
        */
        console.warn("VERIFY for tran ", payload['data']['transaction']['hash'])
        tran_found = false
        idx = BlocksMap.get(payload['data']['prev_hash'])
        prev_block = Blocks[idx]
        while(tran_found == false && prev_block['hash'] != "GENESIS"){
            if (prev_block['data']['transaction']['hash'] == payload['data']['transaction']['hash']){
                tran_found = true
            }
            idx = BlocksMap.get(prev_block['data']['prev_hash'])
            if (idx == undefined || idx==null){
                console.warn("Error in searching for trans. One of the blocks has missing parents.")
            } else {
                prev_block = Blocks[idx]
            }
        }
        if (tran_found){
            console.warn("Transaction already in this chain")
            PendingTransactions.delete(payload['data']['transaction']['hash'])
            return false
        }
    }

    let passed = update_block_order(payload)
    if (passed){
        if (payload['order'] < longest_chain-1){
            console.warn("Denying block - path is too old")
            //dont remove pending transaction - will be remined in more suiting block
            return
        }
        let new_longest = false
        if (payload['order'] == longest_chain){
            /* If new block order is the same as max it means temporary fork has been created*/
            console.warn("SOFT_FORK")
        } else if (payload['order'] > longest_chain){
            /* New block is one&only longest path*/
            new_longest = true
        }
        longest_chain = payload['order']

        tran_hash = payload['data']['transaction']['hash']
        PendingTransactions.delete(tran_hash)

        console.warn("Attaching block with order ", payload['order']) 
        Logger.log("BLOCK_REC", { "prev_hash": JSON.stringify(payload['data']['prev_hash']), "block_hash": payload['hash'] })
        
        Message_hashes.push(payload['hash'])
        Blocks.push(payload)
        if (new_longest){
            /* Update only for new longest - favors older blocks (mined quicker) */
            longest_chain_endpoint = Blocks.indexOf(payload)
        }

        /*
        Update endpoints
        */
        parent_idx = BlocksMap.get(payload['data']['prev_hash'])
        endpoint_idx = CHAIN_ENDPOINTS.indexOf(parent_idx)
        if (endpoint_idx != -1){
            //Parent is an endpoint - remove parent before adding
            CHAIN_ENDPOINTS.splice(endpoint_idx, 1)
            CHAIN_ENDPOINTS.push(Blocks.indexOf(payload))
            console.log(`Replacing endpoint ${Blocks[parent_idx]['hash'].slice(0,6)} with ${payload['hash'].slice(0,6)}`)
        } else {
            //Parent is part of other chain, add current block as new endpoint
            CHAIN_ENDPOINTS.push(Blocks.indexOf(payload))
            console.log(`Adding endpoint ${payload['hash'].slice(0,6)}`)
        }
        update_blocksmap(payload)
        find_orphans()
        return true
    } else {
        console.warn("Block not processed. Missing parent.")
        return false
    }
}

function update_blocksmap(payload) {
    let data = payload['hash']
    BlocksMap.set(data, Blocks.indexOf(payload))
}

function update_block_order(payload){
    if (!BlocksMap.has(payload['data']['prev_hash'])){
        //Missing prev hash
        payload['order'] = -1
        return false
    } else {
        //Get previous block and set order as 1 more
        idx = BlocksMap.get(payload['data']['prev_hash'])
        prev_order = parseInt(Blocks[idx]['order'])
        if ((prev_order == undefined) | (prev_order == null)){
            console.warn("Unknown order error")
            exit(1)
        } else {
            payload['order'] = prev_order +1
        }
    }
    return true
}

app.get('/test_broadcast', (req, res) => {
    let data = {
        "type": "Standard",
        "sender": "id1",
        "receiver": "id2",
        "amount": Math.floor(Math.random() * 100)
    }
    let type = "Transaction"
    let payload = prepare_payload(type, data)

    if (!Message_hashes.includes(payload['hash'])) {
        Message_hashes.push(payload['hash'])
        Logger.log("BCAST_START", { payload_hash: payload['hash'] })
        process_transaction(payload)
        res.send({ message: "Broadcast initiated" })
    }

})

app.post("/atm", (req, res) => {
    //Receives transaction data
    let data = req.body
    let type = "Transaction"
    let payload = req.body

    if (!Message_hashes.includes(payload['hash'])) {
        Message_hashes.push(payload['hash'])
        Logger.log("BCAST_START", { payload_hash: payload['hash'] })
        process_transaction(payload)
        res.send({ message: "Broadcast initiated" })
    } else {
        res.status(400)
        res.send({ message: "Transaction already known" })
    }
})

app.post(AppConfig.REGISTER_ENDPOINT, (req, res) => {
    /*Register new node in the network*/
    body = req.body
    addr = body['data']['source']

    //removed hash verification - useless?
    if (Neighbors.includes(addr)) {
        //If node already known skip
        Logger.log("REGISTER_DUPLICATE")
        var message = "Already registered"
        var status = 422
    } else {
        //If node unknown save
        Neighbors.push(addr)
        Logger.log("REGISTER_OK", { "address": addr })
        var message = "Registered"
        var status = 201

    }
    resp = {
        message: message
    }
    res.status(status)
    res.send(resp)
})

app.get(AppConfig.JOIN_NET_ENDPOINT, (req, res) => {
    //Send hello message to adress specified as CLI arg -> join network
    //https://stackoverflow.com/questions/51973958/how-to-get-data-and-response-status-from-api-using-node-fetch
    let url = CONNECT_TO_ADDR + AppConfig.REGISTER_ENDPOINT
    let data = {
        source: MY_ADDRESS,
    };
    payload = prepare_payload("Handshake", data)
    Logger.log("SENT_HANDSHAKE", { "address": CONNECT_TO_ADDR })
    send_message(url, payload, (status, data) => {
        if (status == 201) {
            Logger.log("NET_JOINED", { "address": CONNECT_TO_ADDR })
        } else if (status == 422) {
            Logger.log("NET_DUPLICATE")
        }

        res.send(data)
    })
});

app.get(AppConfig.LEAVE_NET_ENDPOINT, (req, res) => {
    ATTEMPTING_TO_LEAVE = true
    Logger.log("LEAVE_START")
    let payload = Neighbors
    let url = CONNECT_TO_ADDR + AppConfig.NEIGHBORS_ENDPOINT
    fetch(url,
        {
            method: "DELETE",
            body: JSON.stringify(payload),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
        })
        .then(function (resp) {
            resp_status = resp.status
            if (resp_status == 200) {
                //Update neighbors with connection to your master
                Logger.log("LEAVE_ACCEPT")
                for (const neigh of Neighbors) {
                    url = neigh + AppConfig.NEIGHBORS_ENDPOINT
                    Logger.log("LEAVE_MSG_NEIGH", { "target": neigh })
                    fetch(url,
                        {
                            method: "PUT",
                            body: JSON.stringify({
                                "new_master": CONNECT_TO_ADDR,
                                "leaving_node": MY_ADDRESS
                            }),
                            headers: { 'Content-type': 'application/json; charset=UTF-8' },
                        })
                        .catch((err2) => {
                            Logger.warn(err2)
                            Logger.warn(`Couldn't update master node for ${url}`)
                        })
                }
                res.send("Requests sent succesfully, network left.")
                Logger.log("LEAVE_END")
                //console.warn("Network left. Close program now...")

            } else if (resp_status == 503) {
                console.warn("Master node is currently leaving network. Try again later")
                res.status(500)
                res.send("")
            }
        })
        .catch((err) => {
            //Logger.warn(err)
            Logger.warn(`Can't connect to ${url}`)
            res.status(500)
            res.send()
        })
})

function prepare_payload(type, data, _callback) {
    /*Prepare message content to match universal app standard
    Now only hash, but may include timestamps etc.
    */
    payload = {
        "type": type,
        "data": data
    }
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(data)).digest('hex');
    payload.hash = data_hash
    if (_callback) {
        _callback(payload)
    } else {
        return payload
    }
}
async function send_message(url, payload, _callback, retries = 3) {
    /*Send payload to url using POST*/
    return fetch(url,
        {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
        })
        .then(function (resp) {
            resp_status = resp.status
            return resp.json()
        })
        .then(function (data) {
            _callback(resp_status, data)
        })
        .catch((err) => {
            //Logger.warn(err)
            Logger.warn(`Can't connect to ${url}, retrying ${retries} more times`)
            if (retries > 0) {
                return send_message(url, payload, _callback, retries = retries - 1)
            } else {
                return
            }


        })
}

app.get('/test_connection', (req, res) => {
    /*
    Test connection to every neighbor
    */
    console.log("Checking neighbors connection")
    for (const neigh of Neighbors) {
        let url = neigh + '/'
        test_connection(url, (connected) => {
            console.log(url, connected)
        })
    }
    res.send("Test performed")
});

function get_blockchain(start/*Block full message*/, as_index=false){
    /*
    Return blockchain starting from start block
    if as_index returns blockchain as list of indices of blocks in Blocks obj
    */
    let blockchain = []
    stack.push(start)
    
    while (stack.length > 0){
        
        block = stack.pop()
        if(as_index){
            blockchain.push(BlocksMap.get(block['hash']))
        } else {
            blockchain.push(block)
        }
        //Put prev block into queue
        if (BlocksMap.has(block['data']['prev_hash'])){
            if (block['hash'] != "GENESIS"){
                idx = BlocksMap.get(block['data']['prev_hash'])
                stack.push(Blocks[idx])
            }
        } else if (block['hash'] != "GENESIS") {
            console.warn("Missing one of the parents for block ", start)
            return null   
        }  
    }
    //Reverse to get Genesis -> leaf order
    if (blockchain.length >1 ) {
        blockchain = blockchain.reverse()
    }
    return blockchain
}

function calculate_balance(start=undefined) {
    acc = new Map()
    stack = []

    if (start == undefined){
        start=Blocks[longest_chain_endpoint]
    }
    blockchain = get_blockchain(start)
    if (blockchain == null){
        return null
    }
    
    /* Process blockchain */
    blockchain.forEach((block) => {
        let tran = block['data']['transaction']
        let receiver = tran['data']['receiver']
        let amount = parseInt(tran['data']['amount'])
        let tran_type = tran["data"]['type']

        if (tran_type == "Standard") {
            let sender = tran['data']['sender']
            if (!acc.has(sender)) {
                console.warn(`Sender ${sender} unknown and its not deposit. Can't verify transaction`)
            } else {
                acc.set(sender, parseInt(acc.get(sender)) - amount)
            }
            if (!acc.has(receiver)) {
                acc.set(receiver, amount)
            } else {
                acc.set(receiver, parseInt(acc.get(receiver)) + amount)
            }
        } else if (tran_type == "Coinbase") {
            if (acc.has(receiver)) {
                acc.set(receiver, parseInt(acc.get(receiver)) + amount)
            } else {
                //First coinbase
                acc.set(receiver, amount)
            }
        }
    });
    return acc

}

function test_connection(url, _callback) {
    /*
    Test connection by simple fetch url
    Use callback to react
    */
    fetch(url)
        .then((resp) => {
            _callback(true)
        })
        .catch((err) => {
            _callback(false)
        })

}

/*Input parameters*/
var port = 5001;
if (process.argv[2]) {
    port = parseInt(process.argv[2]);
}
if (process.argv[3]) {
    address = process.argv[3];
    if (address == "ORIGIN" || address == "INIT") {
        ORIGIN_MODE = true
    } else {
        CONNECT_TO_ADDR = address
        Neighbors.push(address)
    }

}

MY_ADDRESS = "http://localhost:" + port

/* Hard coded GENESIS block */
Blocks.push(AppConfig.GENESIS)

//Artificial miner param - todo cli param
CREATE_MINER = true
if (CREATE_MINER) {
    if (port == 5001 || port == 5002 || port == 5003) {
        MINER = true
    }
    //Annoying node - send forks on purpose
    if (port == 5001){
        SEND_OUTDATED_PREVHASH = false
        SEND_FORKS = false
    }
}

app.listen(port, () => {
    console.log(`Node server running: port ${port}`)
    if (MINER) { try_to_mine() }
})