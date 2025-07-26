const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock stock data (replace with real CSE data later)
// cspell:ignore Attijariwafa, Itissalat, Maghrib, Cosumar
const stocks = [
    { symbol: 'ATW', name: 'Attijariwafa Bank', price: 520.50, volume: 150000, marketCap: 105000000000, sector: 'Banking' },
    { symbol: 'IAM', name: 'Itissalat Al-Maghrib', price: 140.25, volume: 200000, marketCap: 120000000000, sector: 'Telecom' },
    { symbol: 'COS', name: 'Cosumar', price: 195.75, volume: 80000, marketCap: 18000000000, sector: 'Consumer Goods' },
  ];

// API Routes
app.get('/api/stocks', (req, res) => {
  res.json(stocks);
});

app.get('/api/screener', (req, res) => {
  const { minVolume, sector } = req.query;
  let filteredStocks = stocks;

  if (minVolume) {
    filteredStocks = filteredStocks.filter(stock => stock.volume >= parseInt(minVolume));
  }
  if (sector) {
    filteredStocks = filteredStocks.filter(stock => stock.sector.toLowerCase() === sector.toLowerCase());
  }

  res.json(filteredStocks);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});