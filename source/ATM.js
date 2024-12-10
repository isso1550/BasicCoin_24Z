const prompt = require("prompt-sync")({ sigint: true });
const Crypto = require("crypto")
const Wallet = require("./Wallet_EC.js")
const AppConfig = require("./AppConfig.js")
const chalk = require('chalk');
var port
var LOGGED_IN = false
var name, id, publicKey, privateKey
var db

async function input_loop(){
    let msg = ""
    
    if (LOGGED_IN){
        msg += chalk.inverse("Logged in as " + name + "\n")
    }
    msg += chalk.bgBlueBright("Choose your option:")
    msg += "\n[R] Register"
    if (LOGGED_IN){
        msg += "\n[L] Logout"
    } else {
        msg += "\n[L] Login"
    }
    msg += "\n[P] Print available identities"
    msg += "\n[T] Transfer coins"
    msg += "\n[RW] Reset wallet"
    console.log(msg)
    const option = prompt("")
    switch(option){
        case "R":
            reg_name = prompt("Enter account name: ")
            password = prompt.hide("Enter password (input hidden): ")
            await Wallet.register(db, reg_name, password)
            .then( console.log(chalk.bgGreenBright("Registered")))
            .catch( (err) => console.log(chalk.bgRedBright(err)))
            break;
        case "L":
            if (LOGGED_IN){
                LOGGED_IN = false 
                console.log(chalk.bgGreenBright("Logged out"))
                break;
            }
            name = prompt("Enter account name: ")
            password = prompt.hide("Enter password (input hidden): ")
            await login(name,password)
             
            break;
        case "T":
            receiver = prompt("Enter receiver id: ")
            amount = prompt("Enter amount of coins to send: ")
            await send_transaction(receiver,amount)
            break;
        case "P":
            await Wallet.print_identities(db)
            break;
        case "RW":
            conf = prompt("Are you sure? Y/N ")
            if (conf == "Y"){
                await Wallet.load_wallet(db, recreate=true)
                console.log(chalk.bgGreenBright("Wallet reset"))
            }
            break;
        default:
            console.warn("Please choose correct option!")
        
    }
    prompt("Click to continue...")
    console.log("\n".repeat(5))
    input_loop()
}

async function process_auto_command(cmd, args){
    name = args[0]
    pwd = args[1]
    Wallet.set_verbose(false)
    db = await Wallet.connect_db(port)
    await Wallet.load_wallet(db)
    await login(name, pwd)
    if (cmd == "-t") {   
        receiver = args[2]
        amount = args[3]
        await send_transaction(receiver, amount)
    } else if (cmd =="-d") {
        amount = args[2]
        await send_deposit(id, amount)
    }
    
}

argv = process.argv
if (argv[2]) {
        //Auto mode
    if (argv[2] == "-t") {
        cmd = argv[2]
        port = argv[3]
        name = argv[4]
        pwd = argv[5]
        receiver = argv[6]
        amount = argv[7]
        try {
            [port, name, pwd, receiver, amount].forEach(element => {
                if (element==undefined){
                    throw new Error(`Some parameters undefined`)
                }
            });
            console.log("OK")
            process_auto_command(cmd, [name, pwd, receiver, amount])
        } catch (err){
            console.warn(err)
            console.log("ATM.js -t [port] [name] [pwd] [receiver] [amount]")
            //node .\source\ATM.js -t 5001 main main xd 12
        }
         
        return
    } else {
        //Manual mode
        port = parseInt(argv[2]);
    }


    
} else {
    console.warn("Please provide machine port as first parameter")
    return
}

async function load(){
    Wallet.set_verbose(false)
    db = await Wallet.connect_db(port)
    await Wallet.load_wallet(db)
    input_loop()
}

//module.exports.input_loop = input_loop

load()

//input_loop()

async function send_transaction(receiver, amount){
    let data = {
        "type": "Standard",
        "sender": id,
        "receiver": receiver,
        "amount": amount,
        "timestamp": Date.now()
    }
    payload = {
        "type": "Transaction",
        "data": data
    }
    data_hash = Crypto.createHash(AppConfig.HASH_ALGO).update(JSON.stringify(data)).digest('hex');
    payload.hash = data_hash
    payload.pk = publicKey.export({'type':AppConfig.PK_TYPE,'format':AppConfig.KEY_FORMAT})
    payload.signature = Crypto.sign(null, payload['hash'], privateKey)
    


    await fetch(`http://localhost:${port}/atm`,
        {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
        })
        .then(function (resp) {
            resp_status = resp.status
            if (resp_status == 200){
                console.log(payload)
                console.log(chalk.bgGreenBright("Transaction sent"))
            } else if (resp_status==400){
                console.log(chalk.bgRedBright("Error while sending transaction. Transaction already known."))
            } else {
                console.log(resp.json())
                console.log(chalk.bgRedBright("Uknown error while sending transaction. Try again"))
            }
        })
        .catch((err) => {
            console.warn(err)
            console.log(chalk.bgRedBright("Uknown error while sending transaction. Try again"))
        })
}

async function login(name, password){
    await Wallet.login(db, name, password)
            .then((data) => {
                console.log(data)
                console.log(chalk.bgGreenBright("Successfully logged in as " + name))
                LOGGED_IN = true
                id = data[0]
                publicKey = data[1]
                privateKey = data[2]
            })
            .catch( (err) => console.log(chalk.bgRedBright(err)));
}
