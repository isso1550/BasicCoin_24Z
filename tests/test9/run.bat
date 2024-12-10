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

::create connection from 5004 to 5002
curl -H "Content-Type: application/json" -X PUT http://localhost:5004/neighbors -d "{\"new_master\":\"http://localhost:5002\"}   
curl -H "Content-Type: application/json" -X PUT http://localhost:5002/neighbors -d "{\"new_master\":\"http://localhost:5004\"}   

::real for 5001 - should arrived to 5004, but 5003 and 5002 wont allow it
node ..\..\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10 

