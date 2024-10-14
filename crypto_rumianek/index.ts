import { Router, Request, Response } from 'express';
const Sqlite3 = require('sqlite3').verbose();
const express = require('express')
const app = express()
const fs = require('fs');
// const port = 3000;


import {connect_db,create_wallet,load_wallet,login,register,remove_wallet} from "./src/db"

interface Account {
  id: number;
  name: string;
}

interface Transaction {
  sender: string;
  receiver: string;
  amount: number;
}

let MODE = "NODE";
const VERBOSE = true;


if (process.argv.includes('-init')) {
  console.log("Running in genesis mode")
  MODE = "GENESIS"
}

let port = 3000;
if (process.argv[2]) {
  port = parseInt(process.argv[2]);
}
console.log("Starting on port %d", port)
console.log(__dirname)
//Standarize data location for development
const dir = __dirname + "/data/" + port + "/"
const db_path = dir + port + ".db"

//https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
if (!fs.existsSync(dir)){
    if (VERBOSE) { console.log("Directory for port not found. Creating...") }
    fs.mkdirSync(dir, {recursive: true});
}

const db = new Sqlite3.Database(db_path, Sqlite3.OPEN_CREATE | Sqlite3.OPEN_READWRITE);
// remove_wallet(db)
// create_wallet(db,null);
load_wallet(port, () => {
  register(db, "carfund", "ilovecars", () => {});
  register(db, "main", "ilovemoney", () => {});
  
}, true)


// load_wallet(3001,()=> {});
// const db = connect_db(3001, () => {});


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/getget", (req,res) => {
  res.send (JSON.stringify(MODE))
})


let accounts: Account[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];

let transactions: Transaction[] = [];

// Get all users
app.get('/', (req: Request, res: Response) => {
  req.params;
  res.json(accounts);
});

app.get('/logintest', () => {
  login(db, "carfund", "ilovecars", (id, pk, sk) => {
    console.log(id, pk)
    // print_identities(db)
    login(db, "main", "ilovemones", () => {
        console.log(pk, sk)                          
    })
  })
})


app.get('/login',(req: Request, res: Response) => {
  const username = req.query.username;
  const password = req.query.password;

  console.log("Trying to log in with creds " + username + " and " + password) 

  try {

    console.log("what the hell dude")                   
    login(db, username, password, (id,pk,sk) => {
      if (id !== undefined) {
        console.log("yet")
      console.log(id,pk, sk)       
      } else {
        throw new Error("Login failed")
      }
    })
    res.sendStatus(200);
  } catch (e) {
    console.log("error caught")
    res.sendStatus(401);
  } 
})

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
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})