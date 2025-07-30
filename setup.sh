#!/bin/bash

# Navigate to server directory
cd server
echo "Installing server dependencies..."
npm install

# Navigate to client directory
cd ../client/CSEStockAnalyzer
echo "Installing client dependencies..."
npm install

echo "Setup complete!"
echo "To start backend: cd server && node server.js"
echo "To start frontend: cd client/CSEStockAnalyzer && npm 
start"
