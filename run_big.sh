#!/bin/bash

node source/Node.js 5000 INIT &
node source/Node.js 5001 http://localhost:5000 &
node source/Node.js 5002 http://localhost:5001 &
node source/Node.js 5003 http://localhost:5002 &
node source/Node.js 5004 http://localhost:5002 &
node source/Node.js 5005 http://localhost:5001 &
node source/Node.js 5006 http://localhost:5000 &

sleep 1

curl 127.0.0.1:5001/join_network
curl 127.0.0.1:5002/join_network
curl 127.0.0.1:5003/join_network
curl 127.0.0.1:5004/join_network
curl 127.0.0.1:5005/join_network
curl 127.0.0.1:5006/join_network