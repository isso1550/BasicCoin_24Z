/* 
09.10 17:39 
Mam problemy z asynchronnicznością JS - callbacki itd. Na razie wygląda na dzialające, ale nie wiem czy za bardzo nei 
dopasowałem się do małego narazie problemu. Jeśli masz sugestie poprawek to napisz lub popraw!


*/




const sqlite3 = require('sqlite3').verbose();
const { generateKeyPair } = require('crypto');

/* DB SECTION */
function connect_db (/*int*/port){
    db_path = "./data/" + port + "/" + port + ".db"
    //TODO sprawdz czy jest odpowiedni podfolder w data i utworz jesli trzeba!
    return db = new sqlite3.Database(db_path, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
}

function create_wallet (db, _callback) {
    db.run(`CREATE TABLE if not exists Identities (name TEXT, id TEXT, pk TEXT, sk TEXT)`);
}
function remove_wallet (db, _callback) {
    db.run('DROP TABLE if exists Identities');
}

function save_identity(db, name, publicKey, privateKey, _callback) {
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row==undefined) {
            db.run(`INSERT INTO Identities VALUES ('${name}', '${publicKey}', '${publicKey}', '${privateKey}')`)
            console.log("Identity created")
            if (_callback){
                _callback();
            }
        } else {
            throw new Error("Identity with specified name already registered")
        }
    })
    
    
}

function load_identity(db, name, _callback){
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row==undefined) {
            throw new Error("Identity not found")
        } else {
            console.log(row['name'])
            if (_callback){
                _callback(row['id'],row['sk'],row['pk'])
            }
        }
    })
}

function print_identities(db, _callback){
    db.all("SELECT * FROM Identities", (err,rows) => {
        console.log(rows)
    })
}

/* ASYM KEYS SECTION */
function generate_identity(db, /*string*/name, /*string*/password, _callback) {
    generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: password
        }
      }, (err, publicKey, privateKey) => {
        // Handle errors and use the generated key pair.
        save_identity(db, name, publicKey, privateKey, _callback)
      });   
}
function login(db, name, password){
    throw new Error("Not implemented")
}



port = 5000
db = connect_db(port)
remove_wallet(db)
create_wallet(db)
generate_identity(db, "carfund","ilovecars", () => {
    //print_identities(db)
    load_identity(db, "carfund", (id, sk, pk) => {
        console.log(sk)
    })
    
})
