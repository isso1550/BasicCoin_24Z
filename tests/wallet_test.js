/*
Simple test and short guide on how to use Wallet module externally
Port necessary as parameter since each node should be represented by one unique adress - when working on one PC the port is perfect
*/

const port = 5000
const Wallet = require('../source/Wallet')

async function main(){
    console.log("Test start")
    db = await Wallet.connect_db(port)
    await Wallet.load_wallet(db, recreate=true)
    await Wallet.register(db, "carfund", "ilovecars")
    await Wallet.register(db, "main", "ilovemoney")
    await Wallet.print_identities(db)
    await Wallet.login(db, "carfund", "ilovecars").then( ([id,pk,sk]) => { console.log(id, pk) })
    await Wallet.login(db, "main", "ilovemoney").then( ([id,pk,sk]) => { console.log(pk, sk) })
}

main()