CONFIG = {
    REGISTER_ENDPOINT : "/register_neighbor",
    BROADCAST_ENDPOINT : "/broadcast",
    NEIGHBORS_ENDPOINT : "/neighbors",
    JOIN_NET_ENDPOINT : "/join_network",
    LEAVE_NET_ENDPOINT: "/leave_network",
    
    DIFFICULTY : 4,

    HASH_ALGO : "sha256",
    KEY_ALGO : "rsa",
    KEY_MODULUS_LEN : 4096,
    KEY_FORMAT : "pem",
    PK_TYPE : "spki",
    SK_TYPE : "pkcs8",
    SK_CIPHER : 'aes-256-cbc',

    
    GENESIS : {
        "type": "Block",
        "data": {
            "prev_hash": "GENESIS",
            "transaction": {
                "data": {
                    type: "Coinbase",
                    sender: "COINBASE",
                    receiver: "a00b7fb076ab2a2d7cf13b14852c0473b0888a81f7dbce6259af5aecf5881351",
                    amount: 100
                }
                
            },
            "nonce": 0,
            "timestamp": Date.now()
        },
        "hash": "GENESIS",
        "order": 1
    }
}

module.exports = CONFIG