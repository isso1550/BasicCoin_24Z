const chalk = require('chalk');
const AppConfig = require('./AppConfig.js')

var SHOW_TIME = true
var SHORTEN_MSG_HASH = true

var endpoints_styles = {
    "JOIN_NET_ENDPOINT": chalk.bgBlue,
    "REGISTER_ENDPOINT": chalk.bgGreen,
    "BROADCAST_ENDPOINT": chalk.bgMagenta,
    "LEAVE_NET_ENDPOINT": chalk.bgYellow,
    "NEIGHBORS_ENDPOINT": chalk.inverse,
}
var conf = {
    "SENT_HANDSHAKE": {
        "style": chalk.blueBright,
        "endpoint": "JOIN_NET_ENDPOINT",
        "message": "Sending handshake to specified node",
    },
    "NET_JOINED": {
        "style": chalk.greenBright,
        "endpoint": "JOIN_NET_ENDPOINT",
        "message": "Connected to network node",
    },
    "NET_DUPLICATE": {
        "style": chalk.greenBright,
        "endpoint": "JOIN_NET_ENDPOINT",
        "message": "Network already joined previously, reestabilished connection",
    },
    "REGISTER_DUPLICATE": {
        "style": chalk.yellow,
        "endpoint": "REGISTER_ENDPOINT",
        "message": "Already registered",
    },
    "REGISTER_OK": {
        "style": chalk.greenBright,
        "endpoint": "REGISTER_ENDPOINT",
        "message": "Registered new node",
    },
    "BCAST_SKIP": {
        "style": chalk.yellow,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Message already received. Skipping...",
    },
    "BCAST_RECEIVE": {
        "style": chalk.greenBright,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Received new message. Processing...",
    },
    "BCAST_FORWARD": {
        "style": chalk.blueBright,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Forwarding message",
    },
    "BCAST_START": {
        "style": chalk.greenBright,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Starting broadcast",
    },
    "TRAN_REC": {
        "style": chalk.magenta,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Received transaction",
    },
    "BLOCK_REC": {
        "style": chalk.magenta,
        "endpoint": "BROADCAST_ENDPOINT",
        "message": "Received block",
    },
    "MINED": {
        "style": chalk.greenBright,
        "ts": chalk.bgRedBright,
        "message": "Block mined",
    },
    "MINE_START": {
        "style": chalk.blueBright,
        "ts": chalk.bgRedBright,
        "message": "Starting to mine new block",
    },
    "LEAVE_START": {
        "style": chalk.blueBright,
        "endpoint": "LEAVE_NET_ENDPOINT",
        "message": "Attempting to leave gracefully",
    },
    "LEAVE_ACCEPT": {
        "style": chalk.greenBright,
        "endpoint": "LEAVE_NET_ENDPOINT",
        "message": "Request accepted by master, informing neighbors",
    },
    "LEAVE_MSG_NEIGH": {
        "style": chalk.blueBright,
        "endpoint": "LEAVE_NET_ENDPOINT",
        "message": "Messaging neighbor",
    },
    "LEAVE_END": {
        "style": chalk.redBright,
        "ts": chalk.bgRedBright,
        "message": "Network left successfully. Close program now...",
    },
    "NEIGH_LEAVE_REQ": {
        "style": chalk.blueBright,
        "endpoint": "NEIGHBORS_ENDPOINT",
        "message": "Neighbor requested to leave network",
    },
    "NEIGH_LEAVE_DENY": {
        "style": chalk.redBright,
        "endpoint": "NEIGHBORS_ENDPOINT",
        "message": "Request dismissed. Busy leaving network myself",
    },
    "NEIGH_LEAVE_ACCEPT": {
        "style": chalk.greenBright,
        "endpoint": "NEIGHBORS_ENDPOINT",
        "message": "Request accepted. Neighbors list updated",
    },
    "NEIGH_MASTER_UPDATE": {
        "style": chalk.greenBright,
        "endpoint": "NEIGHBORS_ENDPOINT",
        "message": "New master received. Updated var and neighbors list",
    },
    "NEIGH_MASTER_SKIP": {
        "style": chalk.yellow,
        "endpoint": "NEIGHBORS_ENDPOINT",
        "message": "New master received. It's my adress - skipping",
    },
    "VERIFICATION_OK": {
        "style": chalk.greenBright,
        "ts": chalk.bgRedBright,
        "message": "Transaction verification passed",
    },
    "VERIFICATION_FAIL": {
        "style": chalk.redBright,
        "ts": chalk.bgRedBright,
        "message": "Transaction verification failed",
    },
    
}

exports.log = function log(message_code, info){
    if (!Object.keys(conf).includes(message_code)){
        return console.warn(`Logger: Unknown message code ${message_code}`)
    }
    msg = ""

    if (SHOW_TIME) {
        //Search for specific timestyle
        ts = conf[message_code]['ts']
        if (ts == undefined) {
            //Search for endpoint timestyle
            ts = endpoints_styles[conf[message_code]['endpoint']]
        }

        if (ts != undefined){
            msg += (ts(getFullTimestamp()) + " ")
        } else {
            msg += getFullTimestamp() + " "
        }
        
    }
    
    endpoint = AppConfig[conf[message_code]['endpoint']]
    if (!(endpoint==null)){
        msg += (conf[message_code]["style"](endpoint) + " ")
    }
    msg += conf[message_code]["message"]
    
    try {
        for (let key of Object.keys(info)){
            msg += `\n-${key}:  `
            switch (key) {
                case "payload_hash":
                    if (SHORTEN_MSG_HASH) {
                        msg += info[key].slice(0, 9) + "..."
                        break;
                    }
                    
                default:
                    msg += info[key]
            }  
        }
    } catch (err){}
    
    printlog(msg)
}

exports.warn = function warn(msg){
    msg = getFullTimestamp() + " " + msg
    console.warn(msg)
}

function printlog(msg){
    console.log(msg)
}

function getFullTimestamp () {
    //https://stackoverflow.com/questions/5416920/timestamp-to-human-readable-format
    const pad = (n,s=2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(),3)}`;
  }

//log("NET_JOINED", {"address":"locahlost:5000"})
