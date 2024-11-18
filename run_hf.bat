::Start nodes
start call node source/Node.js 5000 INIT &
start call node source/Node.js 5001 http://localhost:5000 &
start call node source/Node.js 5002 http://localhost:5001 &
start call node source/Node.js 5003 http://localhost:5001 &

pause

::Estabilish only 3 nodes network - 5003 is LATE
curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network

node .\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10 ::305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30
node .\source\ATM.js -t 5001 coinbase coinbase d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 5 ::d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43
for /l %%x in (1, 1, 6) do (
   node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
)
pause

::Join network using node 5003
curl 127.0.0.1:5003/join_network
time /t 1 

::Cause synchronization for node 5003
node .\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1