/*
Simple test and short guide on how to use Wallet module externally
Port necessary as parameter since each node should be represented by one unique adress - when working on one PC the port is perfect
*/

const port = 5000
const Wallet = require('../source/Wallet')

Wallet.load_wallet(port, (db) => {
        Wallet.register(db, "carfund", "ilovecars", () => {
            Wallet.register(db, "main", "ilovemoney", () => {
                Wallet.login(db, "carfund", "ilovecars", (id, pk, sk) => {
                    console.log(id, pk)
                    //Wallet.print_identities(db)
                    Wallet.login(db, "main", "ilovemoney", () => {
                        console.log(pk, sk)                          
                    })
                })
            })
        })
}, recreate=true)