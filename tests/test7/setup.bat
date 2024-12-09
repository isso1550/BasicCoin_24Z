::start nodes
start call node NodeTest.js 5000 INIT &
start call node NodeTest.js 5001 http://localhost:5000 &
pause

::create net
curl 127.0.0.1:5001/join_network