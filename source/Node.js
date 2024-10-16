/* Launch script for 3 nodes scenario in ~/run.bat
                     7 nodes scenario in ~/run_big.bat
    Use ip:port/test_broadcast and observe consoles to test network
*/

/* 
TODO: connection verification, leaving network, wallet integration (how? now?), better input arg parsing, reaction to empty neighbors
        connectivity exceptions handling - retry, wait, abandon
*/

const Crypto = require('crypto');
const express = require('express')
const http = require('http');
const { url } = require('inspector');
const app = express()
app.use(express.json());

//Adresses and modes
var VERBOSE = true
var ORIGIN_MODE = false //ORIGIN = First node in network
var MY_ADDRESS
var CONNECT_TO_ADDR

//Crypto params
HASH_ALGO = 'sha256'

//Endpoints
var REGISTER_ENDPOINT = "/register_neighbor"
var BROADCAST_ENDPOINT = "/broadcast"

//Stored data
var Neighbors = [];
//TODO: Store all messages or remove them after certain time?
var Messages = [];
var Message_hashes = [];

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/messages', (req, res) => {
    res.send(Messages)
})

app.get('/neighbors', (req, res) => {
    res.send(Neighbors)
})

app.post(BROADCAST_ENDPOINT, (req, res) => {
    body = req.body
    if (Message_hashes.includes(body['hash'])) {
        if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${body['hash']} from ${body['source']}: Skipping message, already received`)}
        var message = "Message already received"
        var status = 422
        
    } else {
        if (verify_message_hash(body) != true) {
            if (VERBOSE) {console.log(`${BROADCAST_ENDPOINT} ${body['hash']} from ${body['source']}: Skipping message, hash verification failed `)}
            var message = "Message hash verification failed"
            var status = 400
        } else {
            if (VERBOSE) { console.log(`${BROADCAST_ENDPOINT} ${body['hash']} from ${body['source']}: Saving message `) }
            Message_hashes.push(body['hash'])
            Messages.push(body)
            for (const neigh of Neighbors) {
                if (VERBOSE) {console.log(`${BROADCAST_ENDPOINT} ${body['hash']} from ${body['source']}: Resending message to ${neigh}`)}
                let url = neigh + BROADCAST_ENDPOINT
                send_message(url, body, (status, data) => {console.log(url, status,data)}, broadcast = true)
            }
            var message = "Message broadcasted further"
            var status = 200
        }
    }
    resp = {
        message: message
    }
    res.status(status)
    res.send(resp)
})

app.get('/test_broadcast', (req, res) => {
    //Sends random broadcast message for testing
    let data = {
        message: "Broadcast test",
        random: Math.random()
    };
    let save = true
    for (const neigh of Neighbors) {
        let url = neigh + '/broadcast'
        send_message(url, data, (status, data) => {
            console.log(url, status, data)
        }, false, save)
        save = false
    }
    console.log("Broadcast initiated")
    res.send({message: "Broadcast initiated"})
})

app.post(REGISTER_ENDPOINT, (req, res) => {
    /*Register new node in the network*/
    body = req.body
    if (verify_message_hash(body) != true) {
        if (VERBOSE) { console.log(REGISTER_ENDPOINT + ": Skipping " + addr + ". Message hash verification failed.") }
        var message = "Message hash verification failed"
        var status = 400
    } else {
        addr = body['source']
        if (Neighbors.includes(addr)) {
            //If node already known skip
            if (VERBOSE) { console.log(REGISTER_ENDPOINT + ": Skipping " + addr + ". Already known.") }
            var message = "Already registered"
            var status = 422
        } else {
            //If node unknown save
            Neighbors.push(addr)
            if (VERBOSE) { console.log(REGISTER_ENDPOINT + ": Adding " + addr + " to neighbors...") }
            var message = "Registered"
            var status = 201
        }
    }
    resp = {
        message: message
    }
    res.status(status)
    res.send(resp)
})

app.get('/join_network', (req, res) => {
    //Send hello message to adress specified as CLI arg -> join network
    //https://stackoverflow.com/questions/51973958/how-to-get-data-and-response-status-from-api-using-node-fetch
    let url = CONNECT_TO_ADDR + REGISTER_ENDPOINT
    let data = {
        message: "Hello",
    };
    if (VERBOSE) { console.log(`Joining network: messaging ${CONNECT_TO_ADDR}`)}
    send_message(url, data, (status, data) => {
        console.log(url, status, data)
        res.send(data)
    })
});

function verify_message_hash(body) {
    received_hash = body['hash']
    message_hash = Crypto.createHash(HASH_ALGO).update(JSON.stringify(body['data'])).digest('hex');
    return message_hash == received_hash
}

function send_message(url, data, _callback, broadcast=false, save_message=false) {
    /*Send json message using fetch API

    url - target url
    data - content of the request
    broadcast - specifies whether passed data should be packed with source address and time_sent or sent literally
    save_message - specifies whether prepared message should be saved to messages 
        WARNING! might be easier to replace it with another callback for future (save transaction different than save message etc...)
    */
    if (broadcast) {
        var payload = data
    } else {
        var payload = {
            source: MY_ADDRESS,
            data: data,
            time_sent: Date.now()
        }
        data_hash = Crypto.createHash(HASH_ALGO).update(JSON.stringify(data)).digest('hex');
        payload.hash = data_hash

        if (save_message){
            Message_hashes.push(payload['hash'])
            Messages.push(payload)
        }
    }
    fetch(url,
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
        .catch( (err) => {
            console.log(err)
            console.warn(`Can't connect to ${url}`)
            
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

function test_connection(url, _callback){
    /*
    Test connection by simple fetch url
    Use callback to react
    */
    fetch(url)
    .then ((resp) => {
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

app.listen(port, () => {
    console.log(`Node server running: port ${port}`)
})