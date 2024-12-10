::start nodes
start call node NodeTest.js 5000 INIT &
start call node NodeTest.js 5001 http://localhost:5000 &
start call node NodeTest.js 5002 http://localhost:5001 &
start call node NodeTest.js 5003 http://localhost:5002 &
start call node NodeTest.js 5004 http://localhost:5003 &
pause

::create net
curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network
curl 127.0.0.1:5003/join_network
curl 127.0.0.1:5004/join_network

::transfer for 5001
node ..\..\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10 
::transfer for 5003
node ..\..\source\ATM.js -t 5001 coinbase coinbase bbb77d2459554dace6b08be7c8c63fff5609734e01df0c84aa511a471337caa8 10 

::transaction from 5001 to 5000 carfund
node ..\..\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1

::run random transactions in the net
for /l %%x in (1, 1, 5) do (
   node ..\..\source\ATM.js -t 5003 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
)
