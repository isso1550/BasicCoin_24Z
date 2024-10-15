/* Run 2 nodes: 
    node .\Node.js 5000 INIT
    node .\Node.js 5001 http://localhost:5000

    to register visit local:5001/join_network
*/

/* 
TODO: Broadcast, connection verification, leaving network, wallet integration (how?), better input arg parsing, reaction to empty neighbors
*/


const express = require('express')
const http = require('http');
const { url } = require('inspector');
const app = express()
app.use(express.json());

var ORIGIN_MODE = false //ORIGIN = First node in network
var MY_ADDRESS
var Neighbors = [];


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/neighbors', (req, res) => {
    res.send(Neighbors)
})

app.post('/register_neighbor', (req, res) => {
    console.log(req.body)
    addr = req.body['address']
    if (Neighbors.includes(addr)) {
        res.send("Already registered")
    } else {
        Neighbors.push(addr)
        console.log("Adding " + addr + " to neighbors...")
        res.send("Registered")
    }
})

app.get('/join_network', (req, res) => {
    for (const neigh of Neighbors) {
        let url = neigh + "/register_neighbor"
        var payload = {
            address: MY_ADDRESS,
        };
        
        fetch(url,
        {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
        })
        .then(function(resp){ return resp.text() })
        .then(function(data){ console.log(data); res.send(data) })
    }
})

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
        Neighbors.push(address)
    }

}

MY_ADDRESS = "http://localhost:" + port

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})