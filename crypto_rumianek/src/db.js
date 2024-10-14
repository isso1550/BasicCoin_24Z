"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect_db = connect_db;
exports.create_wallet = create_wallet;
exports.load_wallet = load_wallet;
exports.remove_wallet = remove_wallet;
exports.register = register;
exports.login = login;
var Sqlite3 = require('sqlite3').verbose();
var CryptoLib = require('crypto');
var fs = require('fs');
var KEY_ALGO = "rsa";
var KEY_MODULUS_LEN = 4096;
var KEY_FORMAT = "pem";
var PK_TYPE = "spki";
var SK_TYPE = "pkcs8";
var SK_CIPHER = 'aes-256-cbc';
var HASH_ALGO = 'sha256';
var VERBOSE = true;
function connect_db(/*int*/ port, _callback) {
    console.log(__dirname);
    //Standarize data location for development
    var dir = __dirname + "/data/" + port + "/";
    var db_path = dir + port + ".db";
    //https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
    if (!fs.existsSync(dir)) {
        if (VERBOSE) {
            console.log("Directory for port not found. Creating...");
        }
        fs.mkdirSync(dir, { recursive: true });
    }
    var db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
    if (_callback) {
        _callback(db);
    }
    else {
        return db;
    }
}
function create_wallet(db, _callback) {
    db.run("CREATE TABLE if not exists Identities (name TEXT, id TEXT, pk TEXT, sk TEXT)", function (err) {
        if (err) {
            console.log(err);
            throw new Error("Something went wrong during wallet creation");
        }
        else {
            if (VERBOSE) {
                console.log("Making sure wallet exists...");
            }
            if (_callback) {
                _callback();
            }
        }
    });
}
function load_wallet(port, _callback, recreate) {
    if (recreate === void 0) { recreate = false; }
    //Load and create if needed, possible to recreate
    connect_db(port, function (db) {
        if (recreate) {
            remove_wallet(db);
        }
        create_wallet(db, function () {
            if (_callback) {
                _callback(db);
            }
            else {
                return db;
            }
        });
    });
}
function remove_wallet(db) {
    db.run('DROP TABLE if exists Identities', function (err) {
        if (err) {
            console.log(err);
            throw new Error("Something went wrong during wallet removal");
        }
        else {
            if (VERBOSE) {
                console.log("Removing wallet...");
            }
        }
    });
}
function save_identity(db, name, publicKey, privateKey, _callback) {
    try {
        db.get("SELECT * From Identities WHERE name='".concat(name, "'"), function (err, row) {
            if (row == undefined) {
                if (err != null) {
                    console.log(err);
                    throw new Error("Error encountered during saving identity");
                }
                //No name verification - assumes user doesn't want to destroy his own wallet
                var id = CryptoLib.createHash(HASH_ALGO).update(publicKey).digest('hex');
                //TODO Handle errors?
                db.run("INSERT INTO Identities VALUES ('".concat(name, "', '").concat(id, "', '").concat(publicKey, "', '").concat(privateKey, "')"));
                if (VERBOSE) {
                    console.log("Identity ".concat(name, " succesfully created."));
                }
                if (_callback) {
                    _callback();
                }
            }
            else {
                throw new Error("Identity with specified name already registered");
            }
        });
    }
    catch (e) {
        console.log(e);
    }
}
function load_identity(db, /*string*/ name, _callback) {
    //Loads identity from db by name
    db.get("SELECT * From Identities WHERE name='".concat(name, "'"), function (err, row) {
        if (row == undefined) {
            return new Error("Identity not found");
            // return [undefined, undefined, undefined]
        }
        else {
            if (VERBOSE) {
                console.log("Loading identity ".concat(row['name'], " ..."));
            }
            if (_callback) {
                _callback(row['id'], row['pk'], row['sk']);
            }
            else {
                return [row['id'], row['pk'], row['sk']];
            }
        }
    });
}
function register(db, /*string*/ name, /*string*/ password, _callback) {
    //Creates keypair and saves to wallet
    CryptoLib.generateKeyPair(KEY_ALGO, {
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
    }, function (err, publicKey, privateKey) {
        save_identity(db, name, publicKey, privateKey, _callback);
    });
}
function login(db, /*string*/ name, /*string*/ password, _callback) {
    //Loads keys from wallet and creates key objects
    //TODO sprawdzanie bledow z haslem itp.
    return load_identity(db, name, function (id, /*str*/ pk, /*str*/ sk) {
        var publicKey = CryptoLib.createPublicKey({
            'key': pk,
            'format': KEY_FORMAT,
            'type': PK_TYPE
        });
        var privateKey;
        try {
            privateKey = CryptoLib.createPrivateKey({
                'key': sk,
                'format': KEY_FORMAT,
                'type': SK_TYPE,
                'cipher': SK_CIPHER,
                'passphrase': password
            });
        }
        catch (error) {
            console.log("Invalid credentials");
            throw new Error("Invalid credentials");
            return;
        }
        if (VERBOSE) {
            console.log("Login succesful.");
        }
        return [id, publicKey, privateKey];
    });
}
