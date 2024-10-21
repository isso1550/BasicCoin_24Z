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