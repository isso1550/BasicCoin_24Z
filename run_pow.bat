::Classic 4 node

start call node source/Node.js 5000 INIT &
start call node source/Node.js 5001 http://localhost:5000 &
start call node source/Node.js 5002 http://localhost:5001 &
start call node source/Node.js 5003 http://localhost:5001 &

timeout /t 1
curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network
curl 127.0.0.1:5003/join_network
pause