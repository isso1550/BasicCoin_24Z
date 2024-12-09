const p = '../../source/'
const Crypto = require('crypto');
const express = require(p+'node_modules/express');
const app = express()
const { Worker } = require('worker_threads')
const Logger = require(p+"ConsoleLogger.js")
const AppConfig = require(p+'AppConfig.js');
const { exit } = require('process');
app.use(express.json());

/*
Global variables configuration
*/

//Mining
var MINER = false
var BUSY_MINING = false
var MINED_TRAN_HASH = null
var worker

//Disruptive
var SEND_OUTDATED_PREVHASH = false
var SEND_FORKS = false

//General network information
var ORIGIN_MODE = false //ORIGIN = First node in network
var MY_ADDRESS
var CONNECT_TO_ADDR
var ATTEMPTING_TO_LEAVE = false //Node is currently trying to leave

//Blockchain
var longest_chain = 0 //Length as number
var longest_chain_endpoint = 0 //Blocks list index ...
var CHAIN_ENDPOINTS = [] //Blocks list index for each leaf block
var PAUSE = false //pause broadcasting messages
var DELETE_ORPHANS = true

//Stored data
//TODO?: hashes stored in one array, but details in appropriate 
var Neighbors = [];
var Message_hashes = [];
var Blocks = [];
var BlocksMap = new Map(); //hash -> idx in blocks array
BlocksMap.set("GENESIS", 0)
var PendingTransactions = new Map();



/*
Endpoints for testing and validation
*/

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

app.get('/pause', (req, res) => {
    if (PAUSE){
        console.log("Resumed")
        PAUSE = false
        res.send("Resumed")
    } else {
        console.log("Paused")
        PAUSE = true
        res.send("Paused")
    }
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

/* 
More important endpoits
*/
app.get(AppConfig.VISUALIZATION_ENDPOINT, (req, res) => {
    bstring = ""
    bcount = 0
    cstring = ""
    Blocks.forEach((block)=>{
        tran = block['data']['transaction']['data']
        title = `${tran['sender'].slice(0,6)} to ${tran['receiver'].slice(0,6)} with ${tran['amount'] } by ${block['miner']}, prev ${block['data']['prev_hash'].slice(0,6)}`

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

app.get(AppConfig.GET_PARENT_ENDPOINT, (req, res) => {
    block_hash = req.query.hash
    let status, message
    if (BlocksMap.has(block_hash)){
        status = 200
        message = get_blockchain(Blocks[BlocksMap.get(block_hash)])
    } else {
        status =404
    }
    resp = {
        message: message
    }
    res.status(status)
    res.send(resp)
})

app.post(AppConfig.BROADCAST_ENDPOINT, (req, res) => {
    if (PAUSE){
        res.send() //remove to cause infinite response
        return
    }
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
            case "Sync_Chain":
                sync_chain(payload['data'])
                Message_hashes.push(payload['hash'])
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
    /*
    Validates structure and basic hashes -> broadcast forward
    */

    Logger.log("TRAN_REC", { "transaction_data": JSON.stringify(payload['data']) })
    if (payload['data']['type'] == "Coinbase") {
        //Deny coinbase transactions
        return
    }
    //Verify hash
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data'])).digest('hex');
    //TEST5 Param disable verify hash
    /*if (payload['hash'] != data_hash) {
        Logger.log("TRAN_DENY_HASH", { tran_hash: payload['hash'], expected_hash: data_hash })
        return
    }*/
    //Verify signature
    verified = Crypto.verify(null, payload['hash'], payload['pk'], Buffer.from(payload['signature']))
        if (!verified) {
            Logger.log("VERIFICATION_FAIL", { "reason": "Transaction signature invalid", "tran_hash": payload['hash'] })
            return
        }

    if (port == 5001){
        payload['data']['amount'] = 2*payload['data']['amount'] //TEST5 Param - double and rehash
        //payload['hash'] = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data'])).digest('hex') 
    }

    Message_hashes.push(payload['hash'])
    PendingTransactions.set(payload['hash'], payload)
    tasks = broadcast_message(payload)
    if (MINER) {
        console.warn("waiting")
        await Promise.all(tasks) //possible danger - empty response blocking mining
        console.warn("mining")
        try_to_mine()
    }
}

function find_orphans(threshold=1){
    /*
    Find orphan blocks and return them to penging transactions pool
    */
    console.warn("Starting reorganization")
    orphans = []
    
    /*
    Check if endpoint fell back further than x steps (based on threshold)
    default to 1, so orphan if fell back for 2 or more steps
    */
    CHAIN_ENDPOINTS.forEach((ep_idx) => {
        if (Blocks[ep_idx]['order'] < longest_chain-threshold){
            console.log("Orphan detected ", Blocks[ep_idx]['order'], longest_chain)
            orphans.push(Blocks[ep_idx])
        }
    })
    main_chain = get_blockchain(Blocks[longest_chain_endpoint], as_index=true)
    //console.log(main_chain)

    orphans.forEach((ob) => {
        /*
        For each orphan re-add transactions to pending list and repeat for parent
        until no more parents (found genesis) or dropped chain joins current main_chain
        */

        //Add Transaction in front
        m = new Map()
            m.set(ob['data']['transaction']['hash'], ob['data']['transaction'])
            let it = PendingTransactions.entries()
            while(true) {
                data = it.next().value
                if (data == undefined){
                    break;
                }
                m.set(data[0], data[1])
            }
        PendingTransactions = m


        //Delete from endpoints list
        ob_idx = CHAIN_ENDPOINTS.indexOf(BlocksMap.get(ob['hash']))
        CHAIN_ENDPOINTS.splice(ob_idx, 1)
        
        idx = BlocksMap.get(ob['data']['prev_hash'])
        prev_block = Blocks[idx]
        /*
        Repeat for parents
        Stop if parent joins the main chain or reaches genesis
        */
        while(prev_block['hash'] != "GENESIS" && main_chain.indexOf(idx)==-1){
            //console.log(idx, main_chain.indexOf(idx))
            //console.log(`Dropping orphan parent ${prev_block['hash']}`)

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
            PendingTransactions = m

            //Prepare next iteration
            idx = BlocksMap.get(prev_block['data']['prev_hash'])
            if (idx == undefined || idx==null){
                //Never happens
                throw Error("Error in searching for trans. One of the blocks has missing parents. Possible hard fork")
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
        worker = new Worker(p+"miner.js", { workerData: { block: block} });

        
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
                await Promise.all(tasks) //possible danger - blocking by infinite response
                
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
    if (port == 5001){
        return true //TEST5 Param - accept all
    }
    /* Verify details and assure sufficient balance */

    //Never accept coinbase
    if (tran['data']['type'] == "Coinbase") {
        //First one is built-in so will work anyway - 12.11
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
            //Should never launch - error for safety
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
    /* Create new block based on saved data
    Take oldest transaction, verify and create block with it
    else take next transaction
    else do nothing
    */

    let iter1 = PendingTransactions.values()
    let tran
    let verified = false
    while (!verified && PendingTransactions.size > 0) {
        tran = iter1.next().value
        verified = verify_transaction(tran)
    }

    //Assure transaction verified and still available
    if (verified && PendingTransactions.has(tran['hash'])) {
        Logger.log("VERIFICATION_OK", { "tran_hash": tran['hash'] })

        /*
        ========== Additional options to cause more forks/outdated blocks for testing ==========
        */

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
        ========== Additional options end ==========
        Main logic in else {}
        */

        } else {
            //Pick longest path's endpoint as prev_hash
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

function process_block(payload, syncing=false) {
    /*
    Verifies block data
    syncing informs the method whether current block is part of a chain being synced
    */


    //Block hashed correctly
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data'])).digest('hex');
    //TEST5 Param disable verify hash
    /*
    if (payload['hash'] != data_hash) {
        Logger.log("BLOCK_DENY_HASH", { block_hash: payload['hash'], expected_hash: data_hash })
        return false
    }*/
    //Correct difficulty

    //TEST5 Param - replace new hash with provided hash - simulates the fact that malicious actor can create collisions
    data_hash = payload['hash']
    if (!(data_hash.slice(0, AppConfig.DIFFICULTY) == "0".repeat(AppConfig.DIFFICULTY))) {
        Logger.log("BLOCK_DENY_DIFF", { difficulty: AppConfig.DIFFICULTY, block_hash: data_hash })
        return false
    }
    //Transaction hash correct
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(payload['data']['transaction']['data'])).digest('hex');
    //TEST5 Param disable verify hash
    /*
    if (payload['data']['transaction']['hash'] != data_hash) {
        Logger.log("TRAN_DENY_HASH", { tran_hash: payload['hash'], expected_hash: data_hash })
        return false
    }*/

    //Previous block exists
    if(!BlocksMap.has(payload['data']['prev_hash']) && !syncing){
    /*
    Missing parent - hard fork handling
    Ask neighbor for entire blockchain from genesis to current block -> pass to sync_chain
    */
        console.warn("Start syncing for block ", payload['hash'])
        for (const neigh of Neighbors) {
            //Not race to prevent disruptive node from answering null asap
            url = neigh + AppConfig.GET_PARENT_ENDPOINT + "?hash=" + payload['data']['prev_hash']
            myPromise = fetch(url,
                {
                    method: "GET"
                })
                .then(function (resp) {
                    resp_status = resp.status
                    return resp.json()
                })
                .then(function (data) {
                    if (resp_status == 200 && !syncing){
                        //console.log(data) 
                        let chain = data['message']    //get prev blocks
                        chain.push(payload) //add current block
                        sync_chain(chain)
                    }
                })
                .catch((err) => {      
                    Logger.warn(`Can't connect to ${url}`)
                    console.warn(err)
                })
        }   
        return false//handle current block later, alternative is to wait for sync_chain to end by modifying code 
    }

    //Transaction valid in terms of details and balances
    if (!verify_transaction(payload['data']['transaction'], payload)){
        console.warn("Block deny. Transaction verification failed.")
        return false
    }


    if (port == 5001){
        payload['data']['transaction']['data']['amount'] = payload['data']['transaction']['data']['amount'] * 2 //TEST5 Param
    }

    //Block OK, save and forward
    saved = save_block(payload, syncing)
    if (saved){
        if (BUSY_MINING && MINED_TRAN_HASH == payload['data']['transaction']['hash']){
            /*
            Abandon mining if newly saved block includes same transaction
            */
            console.warn("DISABLE THREAD")
            worker.terminate()
        }
        if (!syncing){
            broadcast_message(payload)
        }
        return true
    }
}

function sync_chain(chain){
    /*
    Check and sync chain returned by neighbor in response to request for missing parent 
    */
    console.warn("Trying to sync chain")

    if (BlocksMap.has(chain.at(-1))){
        return
    }
    

    //New chain is too short to be accepted - if it changes later, sync_chain will be caused again
    if (chain.length < longest_chain-1){
        console.warn("New chain is too short: ", chain.length, " ", longest_chain)
        return
    }

    //Get oldest known block (first common on route from leaf to genesis)
    let i = 0
    let found_meeting
    for (i; i < chain.length; i++){
        if (BlocksMap.has(chain[i]['hash'])){
            found_meeting = true
            //console.log('Found meeting in ', chain[i]['hash'])
            break;
        }
    }        

    /*
    Cut new chain from last block to oldest known block
    Process each in time order 
    */
    if (found_meeting){
        endpoint = Blocks[BlocksMap.get(chain[i]['hash'])]
        current_order = endpoint['order']
        new_order = current_order + chain.length - (i+1)
        new_chain = chain.slice(i+1)

        for (const b of new_chain){
            console.log("Processing block ", b['hash'])
            if (!BlocksMap.has(b['hash'])){
                //Syncing = true, guarantees method won't broadcast message
                r = process_block(b, syncing=true)
                if (!r){
                    console.log("Block incorrect. Syncing stopped")
                    break;
                }
            }
                    
        }   

        //Forward sync data to neighbors
        payload = prepare_payload("Sync_Chain", chain)
        broadcast_message(payload)
    }
}

function save_block(payload, syncing=false){
    /*
    Saves block in memory
    */

    if (!BlocksMap.has(payload['data']['prev_hash'])){
        //Never happens - error for safety
        throw Error("Save block: Possible HARD FORK")
    } else {
        /*
        Verify if new transaction is unknown in current chain 
        Go through chain starting from current block and check transaction hashes
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
                //Never happens 
                throw Error("Error in searching for trans. One of the blocks has missing parents.")
            } else {
                prev_block = Blocks[idx]
            }
        }

        /*
        If found, block is too late to join this chain
        */
        if (tran_found){
            console.warn("Transaction already in this chain")
            PendingTransactions.delete(payload['data']['transaction']['hash'])
            return false
        }
    }

    //Block accepted, update order
    let passed = update_block_order(payload)
    if (passed){
        if (payload['order'] < longest_chain-1){
            if (syncing){
                /*
                During syncing, blocks will be attached from oldest to newest
                That chain's length is verified in sync_block, allow here
                */
            } else {
                //Deny try to attack block to other old blocks - prevent forks
                console.warn("Denying block - path is too old")
                return
            }
        }

        /*
        Check if newly created chain is the longest
        */
        let new_longest = false
        if (payload['order'] == longest_chain){
            /* If new block order is the same as max it means temporary fork has been created*/
            console.warn("SOFT_FORK detected")
        } else if (payload['order'] > longest_chain){
            /* New block is one & only longest path*/
            new_longest = true
        }
        if (new_longest){
            longest_chain = payload['order']
        }
        
        /*
        Remove transaction from personal queue - pending transactions
        */
        tran_hash = payload['data']['transaction']['hash']
        PendingTransactions.delete(tran_hash)

        console.warn("Attaching block with order ", payload['order']) 
        Logger.log("BLOCK_REC", { "prev_hash": JSON.stringify(payload['data']['prev_hash']), "block_hash": payload['hash'] })

        /*
        Save in collections
        */
        Message_hashes.push(payload['hash'])
        Blocks.push(payload)
        if (new_longest){
            /* Update only for new longest - favors older blocks (mined quicker) */
            longest_chain_endpoint = Blocks.indexOf(payload)
        }

        /*
        Update chain endpoints
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
        if (!syncing) {
            find_orphans()
        }
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
    /*
    Update current block order number in its chain
    */

    if (!BlocksMap.has(payload['data']['prev_hash'])){
        //Missing prev hash
        payload['order'] = -1
        return false
    } else {
        //Get previous block and set order as 1 more
        idx = BlocksMap.get(payload['data']['prev_hash'])
        prev_order = parseInt(Blocks[idx]['order'])
        if ((prev_order == undefined) | (prev_order == null)){
            //Never happens
            console.warn("Unknown order error")
            exit(1)
        } else {
            payload['order'] = prev_order +1
        }
    }
    return true
}

app.post("/atm", (req, res) => {
    //Receives transaction data and sends to the network
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
    /* Gracefully leaving the network - maintains connection, possibly outdated */
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
            /*
            timeout to prevent empty response from blocking node
            https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
            */
            signal: AbortSignal.timeout(1500)   
        })
        .then(function (resp) {
            resp_status = resp.status
            return resp.json()
        })
        .then(function (data) {
            _callback(resp_status, data)
            return
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

function get_blockchain(start/*Block full message*/, as_index=false){
    /*
    Return blockchain starting from start block
    if as_index returns blockchain as list of indices of blocks in Blocks obj
    */
    let blockchain = []
    stack = []
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
    //Reverse to get Genesis -> Leaf order
    if (blockchain.length >1 ) {
        blockchain = blockchain.reverse()
    }
    return blockchain
}

function calculate_balance(start=undefined) {
    /*
    Sum transactions from genesis to start block
    Start defaults to longest endpoint if not specified
    */
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
var port = 5003;
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

} else {
    CONNECT_TO_ADDR = "http://localhost:5001"
    Neighbors.push("http://localhost:5001")
}

MY_ADDRESS = "http://localhost:" + port

/* Hard coded GENESIS block */
Blocks.push(AppConfig.GENESIS)

//Artificial miner param - todo cli param
CREATE_MINER = true
if (CREATE_MINER) {
    if (port == 5000 || port == 5004) {
        MINER = true
    }
    //Annoying node - send forks on purpose
    if (port == 5001){
        SEND_OUTDATED_PREVHASH = false
        SEND_FORKS = false //TEST1 Param
    }
}

app.listen(port, () => {
    console.log(`Node server running: port ${port}`)
    if (MINER) { try_to_mine() }
})