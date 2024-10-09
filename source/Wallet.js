/* 
09.10 17:39 
Mam problemy z asynchronnicznością JS - callbacki itd. Na razie wygląda na dzialające, ale nie wiem czy za bardzo nei 
dopasowałem się do małego narazie problemu. Jeśli masz sugestie poprawek to napisz lub popraw!


*/




const Sqlite3 = require('sqlite3').verbose();
const Crypto = require('crypto');

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

function load_identity(db, name, _callback){
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
    /*To debug*/
    db.all("SELECT * FROM Identities", (err,rows) => {
        console.log(rows)
        if (_callback){
            _callback()
        }
    })
}

/* ASYM KEYS SECTION */
function register(db, /*string*/name, /*string*/password, _callback) {
    Crypto.generateKeyPair('rsa', {
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
function login(db, name, password, _callback){
    load_identity(db, name, (id, pk, sk) => {
        var publicKey = Crypto.createPublicKey({
            'key': pk,
            'format': 'pem',
            'type': 'spki'
        });
        try{
            var privateKey = Crypto.createPrivateKey({
                'key': sk,
                'format': 'pem',
                'type': 'pkcs8',
                'cipher': 'aes-256-cbc',
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
port = 5000
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

