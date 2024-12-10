::start nodes
start call node source/Node.js 5000 INIT &
start call node source/Node.js 5001 http://localhost:5000 &
start call node source/Node.js 5002 http://localhost:5001 &
start call node source/Node.js 5003 http://localhost:5002 &
start call node source/Node.js 5004 http://localhost:5003 &

pause
curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network
curl 127.0.0.1:5003/join_network
curl 127.0.0.1:5004/join_network

::5001 main 256ba1ec81a35d11f556422b8f429d59385f614391fdc71ebde88cbd1bdb8d40
::5003 main 43845a367fd0b00447df41b9b1191cf9e681ddd93c8e10657534610b250ed6f6
::5000 cars 9c345e475db00742da0a3eb644cd69d4265699c6b72df1f06809690476bae461

::transfer for 5001
node .\source\ATM.js -t 5001 coinbase coinbase 256ba1ec81a35d11f556422b8f429d59385f614391fdc71ebde88cbd1bdb8d40 10 
::transfer for 5003
node .\source\ATM.js -t 5001 coinbase coinbase 43845a367fd0b00447df41b9b1191cf9e681ddd93c8e10657534610b250ed6f6 10 

::transfer for 5000
for /l %%x in (1, 1, 7) do (
   node .\source\ATM.js -t 5001 main main 9c345e475db00742da0a3eb644cd69d4265699c6b72df1f06809690476bae461 1
)
for /l %%x in (1, 1, 5) do (
   node .\source\ATM.js -t 5003 main main 9c345e475db00742da0a3eb644cd69d4265699c6b72df1f06809690476bae461 1
)