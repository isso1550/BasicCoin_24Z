#!/bin/bash

# Start the Node.js processes in the background
node source/Node.js 5000 INIT &
node source/Node.js 5001 http://localhost:5000 &
node source/Node.js 5002 http://localhost:5001 &

# Wait for 1 second
sleep 1

# Make curl requests to join the network
curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network

sleep 1

curl 127.0.0.1:5001/leave_network

sleep 1

# test if broadcasts work correctly afterwards
curl 127.0.0.1:5000/test_broadcast
sleep 1
curl 127.0.0.1:5002/test_broadcast

# then you can check each remaining nodes' neighbors to be sure
# if everything is ok afterwards