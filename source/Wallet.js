const Sqlite3 = require('sqlite3').verbose();
const Crypto = require('crypto');
const AppConfig = require('./AppConfig.js')


const fs = require('fs');

var VERBOSE = true
exports.set_verbose = (val) => { VERBOSE = val}

function connect_db(port){
    return new Promise((resolve, reject) => {
        //Standarize data location for development
        dir = __dirname + "/data/" + port + "/"
        db_path = dir + port + ".db"

        //https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
        if (!fs.existsSync(dir)) {
            if (VERBOSE) { console.log("Directory for port not found. Creating...") }
            fs.mkdirSync(dir, { recursive: true });
        }
        const db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
        resolve(db)
    })
}
exports.connect_db = connect_db

function create_wallet(db){
    return new Promise((resolve, reject) => {
        db.run(`CREATE TABLE if not exists Identities (name TEXT, id TEXT, pk TEXT, sk TEXT)`, (err) => {
            if (err) {
                console.log(err)
                throw new Error("Something went wrong during wallet creation")
                reject(err)
            } else {
                if (VERBOSE) { console.log("Loaded wallet") }
                resolve()
            }
        });
    })
}
exports.create_wallet = create_wallet

exports.load_wallet = async function (db, recreate = false) {
    //Load and create if needed, possible to recreate
    if (recreate) {
        try {
            await remove_wallet(db)
        } catch (err) {console.warn("err",err)}
        
    }
    try {
        await create_wallet(db)
    } catch(err) {console.warn(err)}
    

        
}

var remove_wallet = exports.remove_wallet = function (db) {
    return new Promise( (resolve, reject) => {
        db.run('DROP TABLE if exists Identities', (err) => {
            if (err) {
                console.log(err)
                reject(err)
                throw new Error("Something went wrong during wallet removal")
                
            } else {
                if (VERBOSE) { console.log("Removing wallet...") }
                resolve()
            }
        });
    })
    
}

function save_identity(db, name, publicKey, privateKey) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
            if (row == undefined) {
                if (err != null) {
                    console.log(err)
                    throw new Error("Error encountered during saving identity")
                }
                //No name verification - assumes user doesn't want to destroy his own wallet
                let id = Crypto.createHash(AppConfig.HASH_ALGO).update(publicKey).digest('hex');
                //TODO Handle errors?
                db.run(`INSERT INTO Identities VALUES ('${name}', '${id}', '${publicKey}', '${privateKey}')`)
                if (VERBOSE) { console.log(`Identity ${name} succesfully created.`) }
                resolve(true)
            } else {
                //throw new Error("Identity with specified name already registered")
                reject("Identity with specified name already registered")
            }
        })
    })
}

function load_identity(db, /*string*/name, _callback) {
    //Loads identity from db by name
    return new Promise( (resolve, reject) => {
        db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
            if (row == undefined) {
                //throw new Error("Identity not found")
                reject("Identity not found")
            } else {
                if (VERBOSE) { console.log(`Loading identity ${row['name']} ...`) }
                resolve([row['id'], row['pk'], row['sk']])
            }
        })
    })
    
}

var print_identities = exports.print_identities = function (db) {
    /*Debug tool*/
    return new Promise( (resolve, reject) => {
        db.all("SELECT name FROM Identities", (err, rows) => {
            if (err) {
                reject(err)
            }
            console.log(rows)
            resolve()
        })
    })
    
}

/* ASYM KEYS SECTION */
exports.register = async function (db, /*string*/name, /*string*/password, _callback) {
    //Creates keypair and saves to wallet
    return new Promise((resolve, reject) => {
        Crypto.generateKeyPair(AppConfig.KEY_ALGO, {
            modulusLength: AppConfig.KEY_MODULUS_LEN,
            publicKeyEncoding: {
                type: AppConfig.PK_TYPE,
                format: AppConfig.KEY_FORMAT
            },
            privateKeyEncoding: {
                type: AppConfig.SK_TYPE,
                format: AppConfig.KEY_FORMAT,
                cipher: AppConfig.SK_CIPHER,
                passphrase: password
            }
        }, async (err, publicKey, privateKey) => {
            if (err) {
                reject(err)
            }
            await save_identity(db, name, publicKey, privateKey, _callback).catch((err)=>{reject(err)})
            resolve(true)
        })
    })
    ;   // TODO: sprawdzić IV, CBC -- padding oracle attack
}

exports.login = async function (db, /*string*/name, /*string*/password, _callback) {
    //Loads keys from wallet and creates key objects
    //TODO sprawdzanie bledow z haslem itp.
    return new Promise(async (resolve, reject) => {
        await load_identity(db, name).then(([id, /*str*/pk, /*str*/sk]) => {
            var publicKey = Crypto.createPublicKey({
                'key': pk,
                'format': AppConfig.KEY_FORMAT,
                'type': AppConfig.PK_TYPE
            });
            try {
                var privateKey = Crypto.createPrivateKey({
                    'key': sk,
                    'format': AppConfig.KEY_FORMAT,
                    'type': AppConfig.SK_TYPE,
                    'cipher': AppConfig.SK_CIPHER,
                    'passphrase': password
                });
            } catch (error) {
                reject("Invalid credentials")
                
            }
            if (VERBOSE) { console.log("Login succesful.") }

            resolve([id, publicKey, privateKey])
        })
        .catch((err) => reject(err))
    })
    
}
