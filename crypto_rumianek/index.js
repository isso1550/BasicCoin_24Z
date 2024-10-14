"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Sqlite3 = require('sqlite3').verbose();
var express = require('express');
var app = express();
var fs = require('fs');
// const port = 3000;
var db_1 = require("./src/db");
var MODE = "NODE";
var VERBOSE = true;
if (process.argv.includes('-init')) {
    console.log("Running in genesis mode");
    MODE = "GENESIS";
}
var port = 3000;
if (process.argv[2]) {
    port = parseInt(process.argv[2]);
}
console.log("Starting on port %d", port);
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
// remove_wallet(db)
// create_wallet(db,null);
(0, db_1.load_wallet)(port, function () {
    (0, db_1.register)(db, "carfund", "ilovecars", function () { });
    (0, db_1.register)(db, "main", "ilovemoney", function () { });
}, true);
// load_wallet(3001,()=> {});
// const db = connect_db(3001, () => {});
app.get('/', function (req, res) {
    res.send('Hello World!');
});
app.get("/getget", function (req, res) {
    res.send(JSON.stringify(MODE));
});
var accounts = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
];
var transactions = [];
// Get all users
app.get('/', function (req, res) {
    req.params;
    res.json(accounts);
});
app.get('/logintest', function () {
    (0, db_1.login)(db, "carfund", "ilovecars", function (id, pk, sk) {
        console.log(id, pk);
        // print_identities(db)
        (0, db_1.login)(db, "main", "ilovemones", function () {
            console.log(pk, sk);
        });
    });
});
app.get('/login', function (req, res) {
    var username = req.query.username;
    var password = req.query.password;
    console.log("Trying to log in with creds " + username + " and " + password);
    try {
        console.log("what the hell dude");
        (0, db_1.login)(db, username, password, function (id, pk, sk) {
            if (id !== undefined) {
                console.log("yet");
                console.log(id, pk, sk);
            }
            else {
                throw new Error("Login failed");
            }
        });
        res.sendStatus(200);
    }
    catch (e) {
        console.log("error caught");
        res.sendStatus(401);
    }
});
// Get a single user by ID
// app.get('/:id', (req: Request, res: Response) => {
//   // console.log(JSON.stringify(req));
//   const id = parseInt(req.params.id);
//   const user = accounts.find((u) => u.id === id);
//   if (user) {
//     res.json(user);
//   } else {
//     res.status(404).json({ message: 'User not found' });
//   }
// });
// app.get("/:id", (req: Request, res: Response) => {
//   const port = parseInt(req.params.id);
//   load_wallet(port,db => {
//     register(db, "carfund", "ilovecars",() => {
//       register(db, "main", "ilovemoney", () => {
//         login(db, "carfund", "ilovecars", (id, pk, sk) => {
//           console.log(id, pk)
//           //print_identities(db)
//           login(db, "main", "ilovemoney", () => {
//               console.log(pk, sk)                          
//           })
//       })
//       })
//     })
//   },true);
// })
// Create a new user
// app.post('/', (req: Request, res: Response) => {
//   const newUser: User = {
//     id: users.length + 1,
//     name: req.body.name,
//     email: req.body.email
//   };
//   users.push(newUser);
//   res.status(201).json(newUser);
// });
// // Update a user
// app.put('/:id', (req: Request, res: Response) => {
//   const id = parseInt(req.params.id);
//   const userIndex = users.findIndex((u) => u.id === id);
//   if (userIndex !== -1) {
//     users[userIndex] = {
//       id: id,
//       name: req.body.name,
//       email: req.body.email
//     };
//     res.json(users[userIndex]);
//   } else {
//     res.status(404).json({ message: 'User not found' });
//   }
// });
// // Delete a user
// app.delete('/:id', (req: Request, res: Response) => {
//   const id = parseInt(req.params.id);
//   const userIndex = users.findIndex((u) => u.id === id);
//   if (userIndex !== -1) {
//     users.splice(userIndex, 1);
//     res.json({ message: 'User deleted successfully' });
//   } else {
//     res.status(404).json({ message: 'User not found' });
//   }
// });
// export default router;
app.listen(port, function () {
    console.log("Example app listening on port ".concat(port));
});
