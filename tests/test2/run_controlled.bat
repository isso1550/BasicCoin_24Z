::start nodes
start call node NodeTest.js 5000 INIT &
start call node NodeTest.js 5001 http://localhost:5000 &
start call node NodeTest.js 5002 http://localhost:5001 &
start call node NodeTest.js 5003 http://localhost:5002 &
start call node NodeTest.js 5004 http://localhost:5003 &

pause
::create subnet 1
::5000 also here
curl 127.0.0.1:5001/join_network

::bridge ON
curl 127.0.0.1:5002/join_network

::subnet 2
curl 127.0.0.1:5003/join_network
curl 127.0.0.1:5004/join_network

::transfer for 5001
node ..\..\source\ATM.js -t 5001 coinbase coinbase 305679b5cc4e3bf39f40bf114826900d01af44e444240931b33b0e6a26334d30 10 
::transfer for 5003
node ..\..\source\ATM.js -t 5001 coinbase coinbase bbb77d2459554dace6b08be7c8c63fff5609734e01df0c84aa511a471337caa8 10 

::bridge OUT
curl 127.0.0.1:5002/leave_network

::Run transactions in subnet 1
for /l %%x in (1, 1, 7) do (
   node ..\..\source\ATM.js -t 5001 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
)
::Run transactions in subnet 2
for /l %%x in (1, 1, 5) do (
   node ..\..\source\ATM.js -t 5003 main main d7efc89cec74445da79519622386c215bb09142ed4cd01ea8b194a026294df43 1
)

::Wait for miners - might be too long so experiment
time /t 8
pause