const port = 5000
const Sqlite3 = require('../../source/node_modules/sqlite3').verbose();
const Crypto = require('crypto')


function test6(/*string*/name) {
    dir = "../../source/data/" + port + "/"
    console.log(dir)
    db_path = dir + port + ".db"
    const db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
    db.get(`SELECT * From Identities WHERE name='${name}'`, (err, row) => {
        if (row == undefined) {
            console.warn("Identity not found")
        } else {
            console.warn("Database string")
            console.log(row['sk'])
            sk = row['sk']
            password = 'carfund'
            var privateKey = Crypto.createPrivateKey({
                    'key': sk,
                    'format': 'pem',
                    'type': 'pkcs8',
                    'cipher': 'aes-256-cbc',
                    'passphrase': password
                });
            console.warn("Unencrypted key")
            uk = privateKey.export(
                {
                    'type':'pkcs8',
                    'format':'pem'
                }
            )
            console.log(uk)
            console.warn("Encrypted key")
            console.log(privateKey.export(
                {
                    'type':'pkcs8',
                    'format':'pem',
                    'cipher':'aes-256-cbc',
                    'passphrase':password
                }
            ))
        }
    })
}
test6('carfund')