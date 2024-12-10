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

::Run in powershell
Invoke-WebRequest -Uri http://localhost:5001/neighbors -Method Delete -Body "[`"http://localhost:5008`"]" -ContentType "application/json"
