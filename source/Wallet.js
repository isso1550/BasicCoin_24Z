/* 
09.10 17:39 
Mam problemy z asynchronnicznością JS - callbacki itd. Na razie wygląda na dzialające, ale nie wiem czy za bardzo nei 
dopasowałem się do małego narazie problemu. Jeśli masz sugestie poprawek to napisz lub popraw!

*/

const Sqlite3 = require('sqlite3').verbose();
const Crypto = require('crypto');


const fs = require('fs');

var KEY_ALGO = "rsa"
var KEY_MODULUS_LEN = 4096
var KEY_FORMAT = "pem"
var PK_TYPE = "spki"
var SK_TYPE = "pkcs8"
var SK_CIPHER = 'aes-256-cbc'

var HASH_ALGO = 'sha256'

var VERBOSE = true

/* DB SECTION */
function connect_db (/*int*/port, _callback){
    dir = "./data/" + port + "/"
    db_path = dir + port + ".db"

    //https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
    if (!fs.existsSync(dir)){
        if (VERBOSE) { console.log("Directory for port not found. Creating...") }
        fs.mkdirSync(dir, {recursive: true});
    }
    const db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
    if (_callback){
        _callback(db)
    } else {
        return db
    }
}

function create_wallet (db, _callback) {
    db.run(`CREATE TABLE if not exists Identities (name TEXT, id TEXT, pk TEXT, sk TEXT)`, (err) => {
        if (err){
            console.log(err)
            throw new Error("Something went wrong during wallet creation")
        } else {
            if (VERBOSE) { console.log("Making sure wallet exists...")}
            if (_callback){
                _callback()
            }
        }
        
    });
}
exports.load_wallet = function (port, _callback, recreate=false) {
    //Load and create if needed, possible to recreate
    connect_db(port, (db) => {
        if (recreate) {
            remove_wallet(db)
        }
        create_wallet(db, () => {
            if (_callback) {
                _callback(db)
            } else {
                return db
            }  
        })
    })
}


var remove_wallet = exports.remove_wallet = function (db, _callback) {
    db.run('DROP TABLE if exists Identities', (err) => {
        if (err){
            console.log(err)
            throw new Error("Something went wrong during wallet removal")
        } else {
            if (VERBOSE) { console.log("Removing wallet...")}
            if (_callback){
                _callback()
            }
        }
    });
}

function save_identity(db, name, publicKey, privateKey, _callback) {
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row==undefined) {
            if (err != null){
                console.log(err)
                throw new Error("Error encountered during saving identity")
            }
            //No name verification - assumes user doesn't want to destroy his own wallet
            let id = Crypto.createHash(HASH_ALGO).update(publicKey).digest('hex');
            //TODO Handle errors?
            db.run(`INSERT INTO Identities VALUES ('${name}', '${id}', '${publicKey}', '${privateKey}')`)
            if (VERBOSE) { console.log(`Identity ${name} succesfully created.`) }
            if (_callback){
                _callback();
            }
        } else {
            throw new Error("Identity with specified name already registered")
        }
    })
    
    
}

function load_identity(db, /*string*/name, _callback){
    //Loads identity from db by name
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row==undefined) {
            throw new Error("Identity not found")
        } else {
            if (VERBOSE) { console.log(`Loading identity ${row['name']} ...`) }
            if (_callback){
                _callback(row['id'],row['pk'],row['sk'])
            } else {
                return [row['id'],row['pk'],row['sk']]
            }
        }
    })
}

var print_identities = exports.print_identities = function (db, _callback){
    /*Debug tool*/
    db.all("SELECT * FROM Identities", (err,rows) => {
        console.log(rows)
        if (_callback){
            _callback()
        }
    })
}

/* ASYM KEYS SECTION */
exports.register =  function (db, /*string*/name, /*string*/password, _callback) {
    //Creates keypair and saves to wallet
    Crypto.generateKeyPair(KEY_ALGO, {
        modulusLength: KEY_MODULUS_LEN,
        publicKeyEncoding: {
          type: PK_TYPE,
          format: KEY_FORMAT
        },
        privateKeyEncoding: {
          type: SK_TYPE,
          format: KEY_FORMAT,
          cipher: SK_CIPHER,
          passphrase: password
        }
      }, (err, publicKey, privateKey) => {
        save_identity(db, name, publicKey, privateKey, _callback)
      });   
}
exports.login = function (db, /*string*/name, /*string*/password, _callback){
    //Loads keys from wallet and creates key objects
    //TODO sprawdzanie bledow z haslem itp.
    load_identity(db, name, (id, /*str*/pk, /*str*/sk) => {
        var publicKey = Crypto.createPublicKey({
            'key': pk,
            'format': KEY_FORMAT,
            'type': PK_TYPE
        });
        try{
            var privateKey = Crypto.createPrivateKey({
                'key': sk,
                'format': KEY_FORMAT,
                'type': SK_TYPE,
                'cipher': SK_CIPHER,
                'passphrase': password
            });
        } catch (error){
            console.log("Invalid credentials")
            return
        }  
        if (VERBOSE) { console.log("Login succesful.") }
        if (_callback){
            _callback(id, publicKey, privateKey)
        } else {
            return [id, publicKey, privateKey]
        }
    })
    
}
