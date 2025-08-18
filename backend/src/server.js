#!/bin/bash

// Remove the broken server.js file
//rm -f server.js

// Create the correct server.js file
//cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});



// Configuration - Fixed port handling to avoid conflicts
const CONFIG = {
  PORT: process.env.PORT || 5001, // Changed from 5000 to avoid common conflicts
  NODE_ENV: process.env.NODE_ENV || 'development',
  CACHE_DURATION: parseInt(process.env.CACHE_DURATION_MINUTES || '5') * 60 * 1000,
  UPDATE_INTERVAL: process.env.UPDATE_INTERVAL_MINUTES || '*/5',
  MARKET_HOURS: {
    OPEN: { hour: parseInt(process.env.MARKET_OPEN_HOUR) || 9, minute: parseInt(process.env.MARKET_OPEN_MINUTE) || 30 },
    CLOSE: { hour: parseInt(process.env.MARKET_CLOSE_HOUR) || 15, minute: parseInt(process.env.MARKET_CLOSE_MINUTE) || 20 }
  }
};

// Enhanced port conflict detection and resolution
function findAvailablePort(startPort = CONFIG.PORT) {
  return new Promise((resolve) => {
    const net = require('net');
    const testServer = net.createServer();
    
    testServer.listen(startPort, () => {
      const actualPort = testServer.address().port;
      testServer.close(() => {
        resolve(actualPort);
      });
    });
    
    testServer.on('error', () => {
      // Port is busy, try next one
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${timestamp} - ${method} ${path} - ${ip}`);
  next();
});

// In-memory data store
const dataStore = new Map();
let lastUpdate = null;
let connectedClients = 0;

// CSE Stocks Configuration - All 23 stocks with enhanced data
const CSE_STOCKS = {
  'ATW': { 
    name: 'Attijariwafa Bank', 
    sector: 'Banking', 
    isin: 'MA0000011884',
    basePrice: 525.30,
    marketCapShares: 200000000
  },
  'IAM': { 
    name: 'Itissalat Al-Maghrib', 
    sector: 'Telecommunications', 
    isin: 'MA0000011298',
    basePrice: 142.80,
    marketCapShares: 900000000
  },
  'COS': { 
    name: 'Cosumar', 
    sector: 'Food & Beverages', 
    isin: 'MA0000012445',
    basePrice: 195.50,
    marketCapShares: 30000000
  },
  'BCP': { 
    name: 'Banque Centrale Populaire', 
    sector: 'Banking', 
    isin: 'MA0000011885',
    basePrice: 298.70,
    marketCapShares: 180000000
  },
  'SNA': { 
    name: 'Société Nationale d\'Autoroutes du Maroc', 
    sector: 'Infrastructure', 
    isin: 'MA0000012454',
    basePrice: 89.60,
    marketCapShares: 100000000
  },
  'LES': {
    name: 'Lesieur Cristal',
    sector: 'Food & Beverages',
    isin: 'MA0000012446',
    basePrice: 156.80,
    marketCapShares: 25000000
  },
  'MNG': {
    name: 'Managem',
    sector: 'Mining',
    isin: 'MA0000011900',
    basePrice: 2890.00,
    marketCapShares: 40000000
  },
  'TQM': {
    name: 'Taqa Morocco',
    sector: 'Utilities',
    isin: 'MA0000012447',
    basePrice: 1045.00,
    marketCapShares: 70000000
  },
  'CDM': {
    name: 'Credit du Maroc',
    sector: 'Banking',
    isin: 'MA0000012455',
    basePrice: 210.50,
    marketCapShares: 50000000
  },
  'EQD': {
    name: 'EQDOM',
    sector: 'Financial Services',
    isin: 'MA0000012456',
    basePrice: 185.30,
    marketCapShares: 35000000
  },
  'FBR': {
    name: 'Fenêtre Bati Résistant',
    sector: 'Manufacturing',
    isin: 'MA0000012457',
    basePrice: 45.20,
    marketCapShares: 20000000
  },
  'GAZ': {
    name: 'Afriquia Gaz',
    sector: 'Energy',
    isin: 'MA0000012458',
    basePrice: 1980.00,
    marketCapShares: 25000000
  },
  'HPS': {
    name: 'HPS',
    sector: 'Technology',
    isin: 'MA0000012459',
    basePrice: 320.00,
    marketCapShares: 60000000
  },
  'IAM.PA': {
    name: 'IAM Preferred Shares',
    sector: 'Telecommunications',
    isin: 'MA0000012460',
    basePrice: 135.00,
    marketCapShares: 40000000
  },
  'INM': {
    name: 'Intermarché Maroc',
    sector: 'Retail',
    isin: 'MA0000012461',
    basePrice: 76.80,
    marketCapShares: 28000000
  },
  'LAM': {
    name: 'LafargeHolcim Maroc',
    sector: 'Construction',
    isin: 'MA0000012462',
    basePrice: 210.00,
    marketCapShares: 32000000
  },
  'MIC': {
    name: 'Microdata',
    sector: 'Technology',
    isin: 'MA0000012463',
    basePrice: 45.00,
    marketCapShares: 75000000
  },
  'MUT': {
    name: 'La Mutuelle Agricole',
    sector: 'Insurance',
    isin: 'MA0000012464',
    basePrice: 1200.00,
    marketCapShares: 22000000
  },
  'NEJ': {
    name: 'Auto Nejma',
    sector: 'Automotive',
    isin: 'MA0000012465',
    basePrice: 98.50,
    marketCapShares: 18000000
  },
  'S2M': {
    name: 'S2M',
    sector: 'Technology',
    isin: 'MA0000012466',
    basePrice: 85.00,
    marketCapShares: 55000000
  },
  'SMI': {
    name: 'SMI',
    sector: 'Industrial',
    isin: 'MA0000012467',
    basePrice: 150.00,
    marketCapShares: 38000000
  },
  'TAI': {
    name: 'TAI',
    sector: 'Aerospace',
    isin: 'MA0000012468',
    basePrice: 320.00,
    marketCapShares: 42000000
  },
  'WAA': {
    name: 'Wafa Assurance',
    sector: 'Insurance',
    isin: 'MA0000012469',
    basePrice: 420.00,
    marketCapShares: 46000000
  }
};

// Enhanced market hours check with Casablanca timezone
function isMarketOpen() {
  try {
    const now = new Date();
    const morocco = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Casablanca"}));
    const currentHour = morocco.getHours();
    const currentMinute = morocco.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const openTime = CONFIG.MARKET_HOURS.OPEN.hour * 60 + CONFIG.MARKET_HOURS.OPEN.minute;
    const closeTime = CONFIG.MARKET_HOURS.CLOSE.hour * 60 + CONFIG.MARKET_HOURS.CLOSE.minute;
    const dayOfWeek = morocco.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    return isWeekday && currentTime >= openTime && currentTime <= closeTime;
  } catch (error) {
    console.error('Error checking market hours:', error);
    return false;
  }
}

// Enhanced realistic stock data generation
function generateRealisticStockData() {
  const stocks = Object.entries(CSE_STOCKS).map(([symbol, config]) => {
    const basePrice = config.basePrice;
    
    // Generate realistic price movement with market conditions
    const volatility = getVolatilityForSector(config.sector);
    const marketSentiment = getMarketSentiment();
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const changePercent = (Math.random() * volatility * trendDirection * marketSentiment);
    const change = (basePrice * changePercent) / 100;
    const newPrice = Math.max(0.01, basePrice + change); // Ensure positive price
    
    // Generate realistic volume based on price movement
    const volume = generateVolumeForStock(symbol, newPrice, Math.abs(changePercent));
    
    // Calculate market cap using actual shares
    const marketCap = calculateMarketCap(symbol, newPrice, config.marketCapShares);
    
    // Generate technical indicators
    const technicals = generateTechnicalIndicators(newPrice, basePrice);
    
    return {
      symbol,
      name: config.name,
      price: parseFloat(newPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: volume,
      marketCap: marketCap,
      sector: config.sector,
      isin: config.isin,
      lastUpdate: new Date().toISOString(),
      dayHigh: parseFloat((newPrice * (1 + Math.random() * 0.02)).toFixed(2)),
      dayLow: parseFloat((newPrice * (1 - Math.random() * 0.02)).toFixed(2)),
      openPrice: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
      previousClose: basePrice,
      ...technicals,
      signal: generateTradingSignal(technicals.rsi, changePercent),
      beta: parseFloat((0.8 + Math.random() * 0.4).toFixed(2)),
      pe: parseFloat((15 + Math.random() * 10).toFixed(1)),
      eps: parseFloat((newPrice / (15 + Math.random() * 10)).toFixed(2))
    };
  });
  
  return stocks;
}

function getMarketSentiment() {
  // Simulate overall market sentiment (0.8 to 1.2)
  return 0.8 + Math.random() * 0.4;
}

function getVolatilityForSector(sector) {
  const sectorVolatility = {
    'Banking': 3.0,
    'Telecommunications': 2.5,
    'Food & Beverages': 2.0,
    'Infrastructure': 2.8,
    'Mining': 4.5,
    'Utilities': 2.2,
    'Technology': 5.0,
    'Insurance': 3.2,
    'Retail': 3.5,
    'Automotive': 4.0,
    'Energy': 4.2,
    'Financial Services': 3.3,
    'Manufacturing': 3.0,
    'Construction': 3.2,
    'Industrial': 3.1,
    'Aerospace': 4.1
  };
  return sectorVolatility[sector] || 3.0;
}

function generateVolumeForStock(symbol, price, changePercent) {
  const baseVolumes = {
    'ATW': 150000, 'IAM': 120000, 'COS': 80000, 'BCP': 200000, 'SNA': 60000,
    'LES': 45000, 'MNG': 25000, 'TQM': 35000, 'CDM': 55000, 'EQD': 40000,
    'FBR': 30000, 'GAZ': 28000, 'HPS': 65000, 'IAM.PA': 48000, 'INM': 52000,
    'LAM': 38000, 'MIC': 72000, 'MUT': 33000, 'NEJ': 27000, 'S2M': 58000,
    'SMI': 42000, 'TAI': 36000, 'WAA': 49000
  };
  
  const baseVolume = baseVolumes[symbol] || 50000;
  const volatilityMultiplier = 1 + (Math.abs(changePercent) * 0.1);
  const randomFactor = 0.8 + (Math.random() * 0.4);
  const marketHoursFactor = isMarketOpen() ? 1.2 : 0.8;
  
  return Math.floor(baseVolume * volatilityMultiplier * randomFactor * marketHoursFactor);
}

function calculateMarketCap(symbol, price, shares) {
  return Math.floor(price * shares);
}

function generateTechnicalIndicators(currentPrice, basePrice) {
  const rsi = 30 + (Math.random() * 40); // RSI between 30-70
  const ma20 = parseFloat((currentPrice * (0.98 + Math.random() * 0.04)).toFixed(2));
  const ma50 = parseFloat((currentPrice * (0.96 + Math.random() * 0.08)).toFixed(2));
  const ma200 = parseFloat((basePrice * (0.95 + Math.random() * 0.1)).toFixed(2));
  
  return {
    rsi: parseFloat(rsi.toFixed(1)),
    ma20,
    ma50,
    ma200,
    macd: parseFloat((Math.random() - 0.5).toFixed(3)),
    bollinger: {
      upper: parseFloat((currentPrice * 1.02).toFixed(2)),
      middle: ma20,
      lower: parseFloat((currentPrice * 0.98).toFixed(2))
    }
  };
}

function generateTradingSignal(rsi, changePercent) {
  if (rsi < 30 && changePercent > 2) return 'STRONG_BUY';
  if (rsi < 40 && changePercent > 0) return 'BUY';
  if (rsi > 70 && changePercent < -2) return 'STRONG_SELL';
  if (rsi > 60 && changePercent < 0) return 'SELL';
  return 'HOLD';
}

// Enhanced market data update function
async function updateMarketData() {
  try {
    console.log('🔄 Updating market data...');
    const startTime = Date.now();
    
    const stocks = generateRealisticStockData();
    
    // Store data with timestamp
    dataStore.set('stocks', stocks);
    dataStore.set('stocks_timestamp', Date.now());
    lastUpdate = new Date().toISOString();
    
    // Calculate market summary
    const marketSummary = calculateMarketSummary(stocks);
    dataStore.set('market-summary', marketSummary);
    
    // Calculate sectors
    const sectors = calculateSectorData(stocks);
    dataStore.set('sectors', sectors);
    
    // Generate MASI
    const masi = generateMASIData(stocks);
    dataStore.set('masi', masi);
    
    // Generate market news (mock)
    const news = generateMarketNews(stocks);
    dataStore.set('news', news);
    
    // Emit to WebSocket clients if any connected
    if (connectedClients > 0) {
      const updateData = {
        stocks,
        marketSummary,
        sectors,
        masi,
        news,
        timestamp: lastUpdate,
        marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
      };
      
      io.emit('market-update', updateData);
      console.log(`📡 Data broadcasted to ${connectedClients} clients`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Market data updated successfully - ${stocks.length} stocks in ${duration}ms`);
    
    return { success: true, stockCount: stocks.length, duration };
  } catch (error) {
    console.error('❌ Market data update failed:', error);
    return { success: false, error: error.message };
  }
}

function calculateMarketSummary(stocks) {
  const totalStocks = stocks.length;
  const totalMarketCap = stocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0);
  const avgPrice = stocks.reduce((sum, stock) => sum + stock.price, 0) / totalStocks;
  const totalVolume = stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);
  const gainers = stocks.filter(s => s.change > 0).length;
  const losers = stocks.filter(s => s.change < 0).length;
  const unchanged = stocks.filter(s => s.change === 0).length;
  
  const topGainers = stocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);
    
  const topLosers = stocks
    .filter(s => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);
    
  const mostActive = stocks
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);
  
  return {
    totalStocks,
    totalMarketCap,
    avgPrice: parseFloat(avgPrice.toFixed(2)),
    totalVolume,
    gainers,
    losers,
    unchanged,
    topGainers,
    topLosers,
    mostActive,
    marketCap: totalMarketCap,
    lastUpdate: new Date().toISOString()
  };
}

function calculateSectorData(stocks) {
  const sectorMap = new Map();
  
  stocks.forEach(stock => {
    const sector = stock.sector;
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { 
        name: sector, 
        stocks: [], 
        totalMarketCap: 0, 
        totalChange: 0,
        totalVolume: 0,
        avgChangePercent: 0
      });
    }
    
    const sectorData = sectorMap.get(sector);
    sectorData.stocks.push(stock);
    sectorData.totalMarketCap += stock.marketCap || 0;
    sectorData.totalChange += stock.change || 0;
    sectorData.totalVolume += stock.volume || 0;
  });
  
  return Array.from(sectorMap.values()).map(sector => ({
    name: sector.name,
    stockCount: sector.stocks.length,
    totalMarketCap: sector.totalMarketCap,
    totalVolume: sector.totalVolume,
    avgChange: parseFloat((sector.totalChange / sector.stocks.length).toFixed(2)),
    avgChangePercent: parseFloat((sector.stocks.reduce((sum, s) => sum + s.changePercent, 0) / sector.stocks.length).toFixed(2)),
    performance: sector.totalChange > 0 ? 'positive' : sector.totalChange < 0 ? 'negative' : 'neutral',
    topStock: sector.stocks.reduce((prev, current) => (prev.changePercent > current.changePercent) ? prev : current)
  }));
}

function generateMASIData(stocks) {
  // Calculate market cap weighted index
  const totalMarketCap = stocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0);
  const weightedSum = stocks.reduce((sum, stock) => {
    const weight = (stock.marketCap || 0) / totalMarketCap;
    return sum + (stock.changePercent * weight);
  }, 0);
  
  const baseIndexValue = 12500; // Historical MASI base
  const indexChange = weightedSum;
  const indexValue = baseIndexValue * (1 + indexChange / 100);
  
  return {
    index: 'MASI',
    value: parseFloat(indexValue.toFixed(2)),
    change: parseFloat((indexValue - baseIndexValue).toFixed(2)),
    changePercent: parseFloat(indexChange.toFixed(2)),
    volume: stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0),
    high: parseFloat((indexValue * 1.002).toFixed(2)),
    low: parseFloat((indexValue * 0.998).toFixed(2)),
    lastUpdate: new Date().toISOString()
  };
}

function generateMarketNews(stocks) {
  const newsTemplates = [
    'MASI shows {trend} movement in {session} trading session',
    '{sector} sector leads market with {performance}% gain',
    '{stock} reaches new {period} high on strong fundamentals',
    'Market volume increases {volume}% amid active trading'
  ];
  
  const topGainer = stocks.reduce((prev, current) => (prev.changePercent > current.changePercent) ? prev : current);
  const sectors = [...new Set(stocks.map(s => s.sector))];
  const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
  
  return newsTemplates.slice(0, 3).map((template, index) => ({
    id: Date.now() + index,
    title: template
      .replace('{trend}', Math.random() > 0.5 ? 'positive' : 'mixed')
      .replace('{session}', isMarketOpen() ? 'current' : 'previous')
      .replace('{sector}', randomSector)
      .replace('{performance}', Math.abs(Math.random() * 5).toFixed(1))
      .replace('{stock}', topGainer.name)
      .replace('{period}', Math.random() > 0.5 ? '52-week' : 'monthly')
      .replace('{volume}', (Math.random() * 20).toFixed(0)),
    time: new Date().toISOString(),
    type: 'market'
  }));
}

// Validation schemas
const stockQuerySchema = Joi.object({
  symbol: Joi.string().min(1).max(10).optional(),
  sector: Joi.string().min(1).max(50).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('symbol', 'price', 'change', 'changePercent', 'volume', 'marketCap').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

// Enhanced API Routes
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const healthData = {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    lastDataUpdate: lastUpdate,
    marketOpen: isMarketOpen(),
    connectedClients,
    dataStoreSize: dataStore.size,
    memoryUsage: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    },
    environment: CONFIG.NODE_ENV,
    port: CONFIG.PORT,
    cors: process.env.FRONTEND_URL || "http://localhost:3000"
  };
  
  res.json(healthData);
});

app.get('/api/stocks', async (req, res) => {
  try {
    const { error, value } = stockQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    let stocks = dataStore.get('stocks');
    const stocksTimestamp = dataStore.get('stocks_timestamp');
    
    // Check if data is stale (older than cache duration)
    if (!stocks || !stocksTimestamp || (Date.now() - stocksTimestamp > CONFIG.CACHE_DURATION)) {
      console.log('Cache miss or stale data, updating...');
      const updateResult = await updateMarketData();
      if (updateResult.success) {
        stocks = dataStore.get('stocks');
      } else {
        return res.status(503).json({ 
          error: 'Market data unavailable', 
          details: updateResult.error 
        });
      }
    }
    
    // Apply filters
    if (value.sector) {
      stocks = stocks.filter(stock => 
        stock.sector.toLowerCase().includes(value.sector.toLowerCase())
      );
    }
    
    if (value.symbol) {
      stocks = stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(value.symbol.toLowerCase())
      );
    }
    
    // Apply sorting
    if (value.sortBy) {
      const sortOrder = value.sortOrder === 'desc' ? -1 : 1;
      stocks.sort((a, b) => {
        const aVal = a[value.sortBy];
        const bVal = b[value.sortBy];
        if (typeof aVal === 'string') {
          return sortOrder * aVal.localeCompare(bVal);
        }
        return sortOrder * (aVal - bVal);
      });
    }
    
    if (value.limit) {
      stocks = stocks.slice(0, value.limit);
    }
    
    res.json({
      stocks,
      lastUpdate,
      totalStocks: stocks.length,
      marketOpen: isMarketOpen(),
      filters: value,
      cached: Date.now() - stocksTimestamp < CONFIG.CACHE_DURATION
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

app.get('/api/stocks/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stocks = dataStore.get('stocks') || [];
    const stock = stocks.find(s => s.symbol === symbol);
    
    if (!stock) {
      return res.status(404).json({ 
        error: 'Stock not found',
        symbol: symbol,
        availableSymbols: stocks.map(s => s.symbol).sort()
      });
    }
    
    // Add additional calculated fields
    const enhancedStock = {
      ...stock,
      percentFromHigh: parseFloat((((stock.dayHigh - stock.price) / stock.dayHigh) * 100).toFixed(2)),
      percentFromLow: parseFloat((((stock.price - stock.dayLow) / stock.dayLow) * 100).toFixed(2)),
      volatility: Math.abs(stock.changePercent)
    };
    
    res.json(enhancedStock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

app.get('/api/market-summary', (req, res) => {
  try {
    const marketSummary = dataStore.get('market-summary');
    const masi = dataStore.get('masi');
    
    if (!marketSummary) {
      return res.status(404).json({ error: 'Market summary not available' });
    }
    
    const enhancedSummary = {
      ...marketSummary,
      masi,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED',
      marketHours: CONFIG.MARKET_HOURS,
      timezone: 'Africa/Casablanca'
    };
    
    res.json(enhancedSummary);
  } catch (error) {
    console.error('Error fetching market summary:', error);
    res.status(500).json({ error: 'Failed to fetch market summary' });
  }
});

app.get('/api/sectors', (req, res) => {
  try {
    const sectors = dataStore.get('sectors') || [];
    const sortedSectors = sectors.sort((a, b) => b.totalMarketCap - a.totalMarketCap);
    
    res.json({
      sectors: sortedSectors,
      totalSectors: sectors.length,
      lastUpdate,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
    });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ error: 'Failed to fetch sector data' });
  }
});

app.get('/api/masi', (req, res) => {
  try {
    const masi = dataStore.get('masi');
    if (!masi) {
      return res.status(404).json({ error: 'MASI data not available' });
    }
    
    const enhancedMasi = {
      ...masi,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED',
      trend: masi.changePercent > 0 ? 'bullish' : masi.changePercent < 0 ? 'bearish' : 'neutral'
    };
    
    res.json(enhancedMasi);
  } catch (error) {
    console.error('Error fetching MASI:', error);
    res.status(500).json({ error: 'Failed to fetch MASI data' });
  }
});

app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Search query required (minimum 1 character)' });
    }
    
    const stocks = dataStore.get('stocks') || [];
    const searchTerm = query.toLowerCase();
    
    const results = stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm) ||
      stock.sector.toLowerCase().includes(searchTerm) ||
      stock.isin.toLowerCase().includes(searchTerm)
    );
    
    // Sort results by relevance
    const sortedResults = results.sort((a, b) => {
      const aSymbolMatch = a.symbol.toLowerCase().startsWith(searchTerm) ? 2 : 0;
      const bSymbolMatch = b.symbol.toLowerCase().startsWith(searchTerm) ? 2 : 0;
      const aNameMatch = a.name.toLowerCase().includes(searchTerm) ? 1 : 0;
      const bNameMatch = b.name.toLowerCase().includes(searchTerm) ? 1 : 0;
      
      return (bSymbolMatch + bNameMatch) - (aSymbolMatch + aNameMatch);
    });
    
    res.json({
      query,
      results: sortedResults,
      totalResults: results.length,
      searchTime: Date.now()
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/signals', (req, res) => {
  try {
    const stocks = dataStore.get('stocks') || [];
    
    const signalCategories = {
      strongBuys: stocks.filter(stock => stock.signal === 'STRONG_BUY'),
      strongSells: stocks.filter(stock => stock.signal === 'STRONG_SELL'),
      buys: stocks.filter(stock => stock.signal === 'BUY'),
      sells: stocks.filter(stock => stock.signal === 'SELL'),
      holds: stocks.filter(stock => stock.signal === 'HOLD')
    };
    
    // Add signal distribution
    const signalDistribution = {
      STRONG_BUY: signalCategories.strongBuys.length,
      BUY: signalCategories.buys.length,
      HOLD: signalCategories.holds.length,
      SELL: signalCategories.sells.length,
      STRONG_SELL: signalCategories.strongSells.length
    };
    
    res.json({
      ...signalCategories,
      signalDistribution,
      lastUpdate,
      totalStocks: stocks.length,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch trading signals' });
  }
});

app.get('/api/news', (req, res) => {
  try {
    const news = dataStore.get('news') || [];
    res.json({
      news,
      totalNews: news.length,
      lastUpdate
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

app.get('/api/watchlist', (req, res) => {
  try {
    const symbols = req.query.symbols;
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter required (comma-separated)' });
    }
    
    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    const stocks = dataStore.get('stocks') || [];
    
    const watchlistStocks = stocks.filter(stock => symbolList.includes(stock.symbol));
    const notFound = symbolList.filter(symbol => !watchlistStocks.find(s => s.symbol === symbol));
    
    res.json({
      watchlist: watchlistStocks,
      requested: symbolList,
      found: watchlistStocks.length,
      notFound: notFound,
      lastUpdate
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stocks = dataStore.get('stocks') || [];
    const marketSummary = dataStore.get('market-summary');
    const sectors = dataStore.get('sectors') || [];
    
    const stats = {
      totalStocks: stocks.length,
      totalSectors: sectors.length,
      totalMarketCap: marketSummary?.totalMarketCap || 0,
      totalVolume: marketSummary?.totalVolume || 0,
      avgPrice: marketSummary?.avgPrice || 0,
      priceRanges: {
        under50: stocks.filter(s => s.price < 50).length,
        between50_200: stocks.filter(s => s.price >= 50 && s.price < 200).length,
        between200_500: stocks.filter(s => s.price >= 200 && s.price < 500).length,
        above500: stocks.filter(s => s.price >= 500).length
      },
      volatilityDistribution: {
        low: stocks.filter(s => Math.abs(s.changePercent) < 1).length,
        medium: stocks.filter(s => Math.abs(s.changePercent) >= 1 && Math.abs(s.changePercent) < 3).length,
        high: stocks.filter(s => Math.abs(s.changePercent) >= 3).length
      },
      lastUpdate,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch market statistics' });
  }
});

// WebSocket connection handler
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`📱 Client connected: ${socket.id} (Total: ${connectedClients})`);
  
  // Send initial data to newly connected client
  const initialData = {
    stocks: dataStore.get('stocks'),
    marketSummary: dataStore.get('market-summary'),
    sectors: dataStore.get('sectors'),
    masi: dataStore.get('masi'),
    news: dataStore.get('news'),
    timestamp: lastUpdate,
    marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
  };
  
  if (initialData.stocks) {
    socket.emit('initial-data', initialData);
  }
  
  // Handle client disconnection
  socket.on('disconnect', (reason) => {
    connectedClients--;
    console.log(`📱 Client disconnected: ${socket.id} - ${reason} (Total: ${connectedClients})`);
  });
  
  // Handle ping/pong for connection health
  socket.on('ping', (callback) => {
    if (callback) callback('pong');
  });
  
  // Handle subscription to specific symbols
  socket.on('subscribe', (symbols) => {
    try {
      socket.join(`symbols:${symbols.join(',')}`);
      console.log(`📡 Client ${socket.id} subscribed to: ${symbols.join(', ')}`);
    } catch (error) {
      console.error('Subscription error:', error);
    }
  });
  
  socket.on('unsubscribe', (symbols) => {
    try {
      socket.leave(`symbols:${symbols.join(',')}`);
      console.log(`📡 Client ${socket.id} unsubscribed from: ${symbols.join(', ')}`);
    } catch (error) {
      console.error('Unsubscription error:', error);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/stocks',
      'GET /api/stocks/:symbol',
      'GET /api/market-summary',
      'GET /api/sectors',
      'GET /api/masi',
      'GET /api/search?q=term',
      'GET /api/signals',
      'GET /api/news',
      'GET /api/watchlist?symbols=ATW,IAM',
      'GET /api/stats'
    ]
  });
});

// Enhanced scheduled updates with error recovery
const updateSchedule = CONFIG.NODE_ENV === 'development' ? '*/2 * * * *' : `${CONFIG.UPDATE_INTERVAL} * * * *`;

cron.schedule(updateSchedule, async () => {
  try {
    if (CONFIG.NODE_ENV === 'development' || isMarketOpen()) {
      console.log('📅 Scheduled market data update...');
      const result = await updateMarketData();
      if (!result.success) {
        console.error('📅 Scheduled update failed:', result.error);
      }
    } else {
      console.log('📅 Market closed - skipping update');
    }
  } catch (error) {
    console.error('📅 Scheduled update error:', error);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  
  // Stop accepting new requests
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close WebSocket connections
    io.close(() => {
      console.log('✅ WebSocket server closed');
      
      // Clear data store
      dataStore.clear();
      console.log('✅ Data store cleared');
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Initial data load and server startup
async function startServer() {
  try {
    console.log('🚀 Initializing CSE Stock Analyzer Backend...');
    
    // Find available port if default is busy
    const availablePort = await findAvailablePort(CONFIG.PORT);
    CONFIG.PORT = availablePort;
    
    // Load initial market data
    console.log('📊 Loading initial market data...');
    const initialLoad = await updateMarketData();
    
    if (initialLoad.success) {
      console.log('✅ Initial data loaded successfully');
    } else {
      console.warn('⚠️ Initial data load failed, will retry during runtime');
    }
    
    // Start the server
    server.listen(CONFIG.PORT, (err) => {
      if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }
      
      console.log('\n🎉 CSE Stock Analyzer Backend Started Successfully!');
      console.log('='.repeat(60));
      console.log(`🚀 Server running on port: ${CONFIG.PORT}`);
      console.log(`📊 Market Status: ${isMarketOpen() ? '🟢 OPEN' : '🔴 CLOSED'}`);
      console.log(`🌐 Environment: ${CONFIG.NODE_ENV}`);
      console.log(`⏰ Update Schedule: ${updateSchedule}`);
      console.log(`🔗 CORS Origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
      console.log(`📡 WebSocket: Enabled`);
      console.log(`🛡️ Rate Limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min`);
      console.log(`💾 Cache Duration: ${CONFIG.CACHE_DURATION / 1000 / 60} minutes`);
      console.log('='.repeat(60));
      console.log(`📈 API Endpoints available at: http://localhost:${CONFIG.PORT}/api/`);
      console.log(`💡 Health Check: http://localhost:${CONFIG.PORT}/api/health`);
      console.log(`📊 All Stocks: http://localhost:${CONFIG.PORT}/api/stocks`);
      console.log(`🎯 Market Summary: http://localhost:${CONFIG.PORT}/api/market-summary`);
      console.log('='.repeat(60));
      console.log('Ready to serve requests! 🚀\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});