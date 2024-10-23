const prompt = require("prompt-sync")({ sigint: true });
const Wallet = require("./Wallet.js")
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
            await Wallet.login(db, name, password)
            .then((data) => {
                console.log(data)
                console.log(chalk.bgGreenBright("Successfully logged in as " + name))
                LOGGED_IN = true
                [id, publicKey, privateKey] = data;
            })
            .catch( (err) => console.log(chalk.bgRedBright(err)));
             
            break;
        case "T":
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

if (process.argv[2]) {
    port = parseInt(process.argv[2]);
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
