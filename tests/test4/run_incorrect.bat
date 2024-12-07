::start nodes
::copy to any NodeTest - removed to minimaze space usage
start call node NodeTest.js 5000 INIT &
start call node NodeTest.js 5001 http://localhost:5000 &
start call node NodeTest.js 5002 http://localhost:5001 &
start call node NodeTest.js 5003 http://localhost:5002 &
start call node NodeTest.js 5004 http://localhost:5003 &
pause

curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network
curl 127.0.0.1:5003/join_network
curl 127.0.0.1:5004/join_network

::invalid transaction x3
for /l %%x in (1, 1, 3) do (
   node ..\..\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
)

::real 
node ..\..\source\ATM.js -t 5001 coinbase coinbase bbb77d2459554dace6b08be7c8c63fff5609734e01df0c84aa511a471337caa8 10 