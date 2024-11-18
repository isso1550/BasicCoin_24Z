::Random transactions for test

node .\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10
node .\source\ATM.js -t 5001 coinbase coinbase bbb77d2459554dace6b08be7c8c63fff5609734e01df0c84aa511a471337caa8 10 
node .\source\ATM.js -t 5001 coinbase coinbase d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 5
node .\source\ATM.js -t 5001 main main abc 2
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 4
::insufficient
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 10

node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1 

timeout /t 1
curl 127.0.0.1:5002/pause
curl 127.0.0.1:5004/pause
pause

node .\source\ATM.js -t 5003 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
node .\source\ATM.js -t 5003 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
timeout /t 1
curl 127.0.0.1:5002/pause
curl 127.0.0.1:5004/pause

timeout /t 1
pause
node .\source\ATM.js -t 5003 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
