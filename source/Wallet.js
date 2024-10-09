/* 
09.10 17:39 
Mam problemy z asynchronnicznością JS - callbacki itd. Na razie wygląda na dzialające, ale nie wiem czy za bardzo nei 
dopasowałem się do małego narazie problemu. Jeśli masz sugestie poprawek to napisz lub popraw!

*/

const Sqlite3 = require('sqlite3').verbose();
const Crypto = require('crypto');

var KEY_ALGO = "rsa"
var KEY_MODULUS_LEN = 4096
var KEY_FORMAT = "pem"
var PK_TYPE = "spki"
var SK_TYPE = "pkcs8"
var SK_CIPHER = 'aes-256-cbc'

/* DB SECTION */
function connect_db (/*int*/port, _callback){
    db_path = "./data/" + port + "/" + port + ".db"
    //TODO sprawdz czy jest odpowiedni podfolder w data i utworz jesli trzeba!
    const db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
    if (_callback){
        _callback(db)
    } else {
        return db
    }
}

function create_wallet (db, _callback) {
    db.run(`CREATE TABLE if not exists Identities (name TEXT, id TEXT, pk TEXT, sk TEXT)`, () => {
        if (_callback){
            _callback()
        }
    });
}
function remove_wallet (db, _callback) {
    db.run('DROP TABLE if exists Identities', () => {
        if (_callback){
            _callback()
        }
    });
}

function save_identity(db, name, publicKey, privateKey, _callback) {
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row==undefined) {
            /* W druga kolumne powinien byc wstawiany hash a nie publickey (tymczasowe rozwiazanie)*/
            //TODO insert hash
            db.run(`INSERT INTO Identities VALUES ('${name}', '${publicKey}', '${publicKey}', '${privateKey}')`)
            console.log(`Identity ${name} created`)
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
            console.log(`Loading identity ${row['name']} ...`)
            if (_callback){
                _callback(row['id'],row['pk'],row['sk'])
            } else {
                return [row['id'],row['pk'],row['sk']]
            }
        }
    })
}

function print_identities(db, _callback){
    /*Debug tool*/
    db.all("SELECT * FROM Identities", (err,rows) => {
        console.log(rows)
        if (_callback){
            _callback()
        }
    })
}

/* ASYM KEYS SECTION */
function register(db, /*string*/name, /*string*/password, _callback) {
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
function login(db, /*string*/name, /*string*/password, _callback){
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
        console.log("LOGIN: Login succesful")
        if (_callback){
            _callback(id, publicKey, privateKey)
        } else {
            return [id, publicKey, privateKey]
        }
    })
    
}


/* Testy troche na szybko */
port = 5000 //port potrzebny, bo kiedys ten portfel bedzie na serwerze - port reprezentuje uzytkownika :)
connect_db(port, (db) => {
    remove_wallet(db, () => {
        create_wallet(db, () => {
            register(db, "carfund", "ilovecars", () => {
                register(db, "main", "ilovemoney", () => {
                    login(db, "carfund", "ilovecars", (id, pk, sk) => {
                        console.log(pk, sk)
                        //print_identities(db)
                        login(db, "main", "ilovemoney", () => {
                            console.log(pk, sk)                          
                        })
                    })
                })
            })
        })
    })
})

