::Send random transactions as test

node .\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10 ::305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30
node .\source\ATM.js -t 5001 coinbase coinbase d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 5 ::d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43
node .\source\ATM.js -t 5001 main main abc 2
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 4
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 10
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
