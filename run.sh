#!/bin/bash

# Start backend
echo "Starting backend..."
cd server
node server.js &

# Start frontend
echo "Starting frontend..."
cd ../client/CSEStockAnalyzer
npm start
