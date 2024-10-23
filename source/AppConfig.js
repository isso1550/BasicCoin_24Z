CONFIG = {
    REGISTER_ENDPOINT : "/register_neighbor",
    BROADCAST_ENDPOINT : "/broadcast",
    NEIGHBORS_ENDPOINT : "/neighbors",
    JOIN_NET_ENDPOINT : "/join_network",
    LEAVE_NET_ENDPOINT: "/leave_network",
    
    DIFFICULTY : 5,

    HASH_ALGO : "sha256",
    KEY_ALGO : "rsa",
    KEY_MODULUS_LEN : 4096,
    KEY_FORMAT : "pem",
    PK_TYPE : "spki",
    SK_TYPE : "pkcs8",
    SK_CIPHER : 'aes-256-cbc'
}

module.exports = CONFIG