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
const AppConfig = require('./AppConfig.js')
app.use(express.json());


/*TODO move configuration to module/config file*/

//Adresses and modes
//var VERBOSE = true
var MINER = false
var BUSY_MINING = false
var ORIGIN_MODE = false //ORIGIN = First node in network
var MY_ADDRESS
var CONNECT_TO_ADDR
var ATTEMPTING_TO_LEAVE = false //Node is currently trying to leave

//Stored data
var Neighbors = [];
//TODO: hashes stored in one array, but details in appropriate 
var Message_hashes = [];

var Blocks = [];
var Transactions = [];
var MinedTransactions = [];


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/messages', (req, res) => {
    res.send(Message_hashes)
})

app.get('/transactions', (req, res) => {
    res.send(Transactions)
})

app.get('/blocks', (req, res) => {
    res.send(Blocks)
})

app.get('/minedtransactions', (req, res) => {
    res.send(MinedTransactions)
})


app.get(AppConfig.NEIGHBORS_ENDPOINT, (req, res) => {
    res.send(Neighbors)
})

app.delete(AppConfig.NEIGHBORS_ENDPOINT, (req, res) => {
    //Receive request made by neighbor to leave network 
    //if (VERBOSE) { console.log(`${NEIGHBORS_ENDPOINT} One of the neighbors is attempting to leave network`) }
    Logger.log("NEIGH_LEAVE_REQ")
    if (ATTEMPTING_TO_LEAVE) {
        //if (VERBOSE) { console.log(`${NEIGHBORS_ENDPOINT} Leave network request dismissed. Currently leaving myself.`) }
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
        //if (VERBOSE) { console.log(`${NEIGHBORS_ENDPOINT} Leave network request accepted. Neighbors list updated.`) }
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
        if (VERBOSE) { console.log(`Removed leaving node ${leaving_node}`)}
    } else {
        console.warn("Leaving neighbor address not found. Possible error with request.")
    }
    */

    if (new_master != MY_ADDRESS) {
        CONNECT_TO_ADDR = new_master
        //if (VERBOSE) { console.log(`Updated master to ${new_master}`) }
        Logger.log("NEIGH_MASTER_UPDATE", {"new_master" : new_master})
        if (!Neighbors.includes(new_master)) {
            // Probably should also add the new master to neighbors
            Neighbors.push(new_master);
        }
        //if (VERBOSE) { console.log(`Set the new master as a neighbor.`) }
    } else {
        Logger.log("NEIGH_MASTER_SKIP")
        //if (VERBOSE) { console.log(`Master not updated. It's me.`) }
    }
    res.status = 200
    res.send()
})

app.post(AppConfig.BROADCAST_ENDPOINT, (req, res) => {
    // NOTE: It also resends the message back from where it came from
    payload = req.body

    if (Message_hashes.includes(payload['hash'])) {
        //if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${payload['hash']}: Skipping message, already received`) }
        Logger.log("BCAST_SKIP", {"payload_hash": payload["hash"]})
        var message = "Message already received"
        var status = 422

    } else {
        /*if (verify_message_hash(payload) != true) {
            if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${payload['hash']}: Skipping message, hash verification failed `) }
            
            var message = "Message hash verification failed, possible connection issue"
            var status = 400
        } else {*/
            //if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${payload['hash']}: Processing message `) }
            Logger.log("BCAST_RECEIVE", {"payload_hash": payload["hash"]})
            let type = payload['type']
            Message_hashes.push(payload['hash'])

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
                    //if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${payload['hash']}: Unknown message type ${type}`) }
                    Logger.log("BCAST_UNKNOWN", {"payload_hash": payload["hash"], "type" : type})
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
        //if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${payload['hash']}: Forwarding broadcast message to ${neigh}`) }
        Logger.log("BCAST_FORWARD", {"payload_hash": payload["hash"], "target": neigh})
        let url = neigh + AppConfig.BROADCAST_ENDPOINT
        tasks.push(send_message(url, payload, (status, data) => { /*console.log(url, status, data)*/ }))
    }
    return tasks
}

async function process_transaction(payload) {
    Logger.log("TRAN_REC", {"transaction_data": JSON.stringify(payload['data'])})
    //console.log(`Received transaction ${JSON.stringify(payload['data'])}`)
    Transactions.push(payload)
    tasks = broadcast_message(payload)
    if (MINER) {
        await Promise.all(tasks)
        try_to_mine()
    }
}

async function try_to_mine() {
    /* Async function check if miner node is busy and decides whether to start mining */
    //TODO future: terminate worker when new block arrives (same block or any?)

    if (!BUSY_MINING && Transactions.length > 0) {
        //if (VERBOSE) { console.log("Starting mining ", Transactions) }
        Logger.log("MINE_START", {"transaction" : JSON.stringify(Transactions.at(-1)['data'])})
        BUSY_MINING = true
        block = create_block()
        /*Start mining thread*/
        const worker = new Worker("./source/miner.js", { workerData: { block: block} });
        worker.once("message", async (result) => {
            block = result
            payload = prepare_payload("Block", block)
            Blocks.push(payload)
            MinedTransactions.push(Transactions.pop())
            Message_hashes.push(payload['hash'])
            //Broadcast new block - wait for broadcast to finish before moving on
            tasks = broadcast_message(payload)
            await Promise.all(tasks)
            BUSY_MINING = false
            //Try mining next one
            try_to_mine()
        });
        worker.on("error", error => {
            console.warn(error);
            BUSY_MINING = false
        });
        worker.on("exit", exitCode => {
            //console.warn(`It exited with code ${exitCode}`);
            BUSY_MINING = false
        })

    }
}

function create_block() {
    /* Create new block based on saved data */
    block = {
        //"prev_hash": Crypto.createHash(HASH_ALGO).update(JSON.stringify(Blocks.at(-1)['data'])).digest('hex'),
        "prev_hash": Blocks.at(-1)['hash'],
        "transaction": Transactions.at(0)['data'],
        "nonce": 0,
        "timestamp": Date.now()
    }
    return block
}

function process_block(payload) {
    /*TODO move transacctions to mined transactions*/
    //TODO verify prev_hash corresponds to current data
    Logger.log("BLOCK_REC", {"block_data": JSON.stringify(payload['data']), "block_hash": payload['hash']})
    Blocks.push(payload)
    broadcast_message(payload)
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
        Logger.log("BCAST_START", {payload_hash: payload['hash']})
        process_transaction(payload)
        //console.log("Broadcast initiated")
        res.send({ message: "Broadcast initiated" })
    }

})

app.post(AppConfig.REGISTER_ENDPOINT, (req, res) => {
    /*Register new node in the network*/
    body = req.body
    addr = body['data']['source']

    //removed hash verification - useless?
    if (Neighbors.includes(addr)) {
        //If node already known skip
        //if (VERBOSE) { console.log(REGISTER_ENDPOINT + ": Skipping " + addr + ". Already known.") }
        Logger.log("REGISTER_DUPLICATE")
        var message = "Already registered"
        var status = 422
    } else {
        //If node unknown save
        Neighbors.push(addr)
        Logger.log("REGISTER_OK", {"address": addr})
        //if (VERBOSE) { console.log(REGISTER_ENDPOINT + ": Adding " + addr + " to neighbors...") }
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
        //console.log(url, status, data)
        if (status==201){
            Logger.log("NET_JOINED", { "address": CONNECT_TO_ADDR })
        } else if (status==422) {
            Logger.log("NET_DUPLICATE")
        }
        
        res.send(data)
    })
});

app.get(AppConfig.LEAVE_NET_ENDPOINT, (req, res) => {
    //if (VERBOSE) { console.log("Attempting to leave network gracefully") }
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
            //if (VERBOSE) { console.log("Received ", resp_status) }
            if (resp_status == 200) {
                //Update neighbors with connection to your master
                //if (VERBOSE) { console.log(`Received ${resp_status}. Informing neighbors`) }
                Logger.log("LEAVE_ACCEPT")
                for (const neigh of Neighbors) {
                    url = neigh + AppConfig.NEIGHBORS_ENDPOINT
                    //if (VERBOSE) { console.log(`Updating master for ${neigh}`) }
                    Logger.log("LEAVE_MSG_NEIGH", {"target": neigh})
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

/*function verify_message_hash(body) {
    received_hash = body['hash']
    message_hash = Crypto.createHash(HASH_ALGO).update(JSON.stringify(body['data'])).digest('hex');
    return message_hash == received_hash
}*/

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
var port = 5000;
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

GENESIS = {
    "type": "Block",
    "data": {
        "prev_hash": "GENESIS",
        "transaction": "GENESIS",
        "nonce": 0,
        "timestamp": Date.now()
    },
    "hash": "GENESIS"

}
Blocks.push(GENESIS)

//Artificial miner param - todo cli param
CREATE_MINER = true
if (CREATE_MINER) {
    if (port == 5001) {
        MINER = true
    }
}


app.listen(port, () => {
    console.log(`Node server running: port ${port}`)
})