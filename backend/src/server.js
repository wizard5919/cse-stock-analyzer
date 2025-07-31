# Create the complete server.js file in the src directory
cat > src/server.js << 'EOF'
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

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CACHE_DURATION: parseInt(process.env.CACHE_DURATION_MINUTES || '5') * 60 * 1000,
  UPDATE_INTERVAL: process.env.UPDATE_INTERVAL_MINUTES || '*/5',
  MARKET_HOURS: {
    OPEN: { hour: parseInt(process.env.MARKET_OPEN_HOUR) || 9, minute: parseInt(process.env.MARKET_OPEN_MINUTE) || 30 },
    CLOSE: { hour: parseInt(process.env.MARKET_CLOSE_HOUR) || 15, minute: parseInt(process.env.MARKET_CLOSE_MINUTE) || 20 }
  }
};

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
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// In-memory data store
const dataStore = new Map();
let lastUpdate = null;
let connectedClients = 0;

// CSE Stocks Configuration - All 23 stocks
const CSE_STOCKS = {
  'ATW': { 
    name: 'Attijariwafa Bank', 
    sector: 'Banking', 
    isin: 'MA0000011884',
    basePrice: 525.30
  },
  'IAM': { 
    name: 'Itissalat Al-Maghrib', 
    sector: 'Telecommunications', 
    isin: 'MA0000011298',
    basePrice: 142.80
  },
  'COS': { 
    name: 'Cosumar', 
    sector: 'Food & Beverages', 
    isin: 'MA0000012445',
    basePrice: 195.50
  },
  'BCP': { 
    name: 'Banque Centrale Populaire', 
    sector: 'Banking', 
    isin: 'MA0000011885',
    basePrice: 298.70
  },
  'SNA': { 
    name: 'Société Nationale d\'Autoroutes du Maroc', 
    sector: 'Infrastructure', 
    isin: 'MA0000012454',
    basePrice: 89.60
  },
  'LES': {
    name: 'Lesieur Cristal',
    sector: 'Food & Beverages',
    isin: 'MA0000012446',
    basePrice: 156.80
  },
  'MNG': {
    name: 'Managem',
    sector: 'Mining',
    isin: 'MA0000011900',
    basePrice: 2890.00
  },
  'TQM': {
    name: 'Taqa Morocco',
    sector: 'Utilities',
    isin: 'MA0000012447',
    basePrice: 1045.00
  },
  'CDM': {
    name: 'Credit du Maroc',
    sector: 'Banking',
    isin: 'MA0000012455',
    basePrice: 210.50
  },
  'EQD': {
    name: 'EQDOM',
    sector: 'Financial Services',
    isin: 'MA0000012456',
    basePrice: 185.30
  },
  'FBR': {
    name: 'Fenêtre Bati Résistant',
    sector: 'Manufacturing',
    isin: 'MA0000012457',
    basePrice: 45.20
  },
  'GAZ': {
    name: 'Afriquia Gaz',
    sector: 'Energy',
    isin: 'MA0000012458',
    basePrice: 1980.00
  },
  'HPS': {
    name: 'HPS',
    sector: 'Technology',
    isin: 'MA0000012459',
    basePrice: 320.00
  },
  'IAM.PA': {
    name: 'IAM Preferred Shares',
    sector: 'Telecommunications',
    isin: 'MA0000012460',
    basePrice: 135.00
  },
  'INM': {
    name: 'Intermarché Maroc',
    sector: 'Retail',
    isin: 'MA0000012461',
    basePrice: 76.80
  },
  'LAM': {
    name: 'LafargeHolcim Maroc',
    sector: 'Construction',
    isin: 'MA0000012462',
    basePrice: 210.00
  },
  'MIC': {
    name: 'Microdata',
    sector: 'Technology',
    isin: 'MA0000012463',
    basePrice: 45.00
  },
  'MUT': {
    name: 'La Mutuelle Agricole',
    sector: 'Insurance',
    isin: 'MA0000012464',
    basePrice: 1200.00
  },
  'NEJ': {
    name: 'Auto Nejma',
    sector: 'Automotive',
    isin: 'MA0000012465',
    basePrice: 98.50
  },
  'S2M': {
    name: 'S2M',
    sector: 'Technology',
    isin: 'MA0000012466',
    basePrice: 85.00
  },
  'SMI': {
    name: 'SMI',
    sector: 'Industrial',
    isin: 'MA0000012467',
    basePrice: 150.00
  },
  'TAI': {
    name: 'TAI',
    sector: 'Aerospace',
    isin: 'MA0000012468',
    basePrice: 320.00
  },
  'WAA': {
    name: 'Wafa Assurance',
    sector: 'Insurance',
    isin: 'MA0000012469',
    basePrice: 420.00
  }
};

// Market hours check
function isMarketOpen() {
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
}

// Generate realistic mock data
function generateRealisticStockData() {
  const stocks = Object.entries(CSE_STOCKS).map(([symbol, config]) => {
    const basePrice = config.basePrice;
    
    // Generate realistic price movement
    const volatility = getVolatilityForSector(config.sector);
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const changePercent = (Math.random() * volatility * trendDirection);
    const change = (basePrice * changePercent) / 100;
    const newPrice = basePrice + change;
    
    // Generate realistic volume
    const volume = generateVolumeForStock(symbol, newPrice, Math.abs(changePercent));
    
    // Calculate market cap
    const marketCap = calculateMarketCap(symbol, newPrice);
    
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
      rsi: 50 + (Math.random() - 0.5) * 40,
      ma20: parseFloat((newPrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
      ma50: parseFloat((newPrice * (0.96 + Math.random() * 0.08)).toFixed(2)),
      signal: ['BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL'][Math.floor(Math.random() * 5)]
    };
  });
  
  return stocks;
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
  const volatilityMultiplier = 1 + (changePercent * 0.1);
  const randomFactor = 0.8 + (Math.random() * 0.4);
  
  return Math.floor(baseVolume * volatilityMultiplier * randomFactor);
}

function calculateMarketCap(symbol, price) {
  const outstandingShares = {
    'ATW': 200000000, 'IAM': 900000000, 'COS': 30000000, 'BCP': 180000000, 'SNA': 100000000,
    'LES': 25000000, 'MNG': 40000000, 'TQM': 70000000, 'CDM': 50000000, 'EQD': 35000000,
    'FBR': 20000000, 'GAZ': 25000000, 'HPS': 60000000, 'IAM.PA': 40000000, 'INM': 28000000,
    'LAM': 32000000, 'MIC': 75000000, 'MUT': 22000000, 'NEJ': 18000000, 'S2M': 55000000,
    'SMI': 38000000, 'TAI': 42000000, 'WAA': 46000000
  };
  
  const shares = outstandingShares[symbol] || 50000000;
  return Math.floor(price * shares);
}

// Update market data
async function updateMarketData() {
  try {
    console.log('🔄 Updating market data...');
    
    const stocks = generateRealisticStockData();
    
    // Store data
    dataStore.set('stocks', stocks);
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
    
    // Emit to WebSocket clients
    if (connectedClients > 0) {
      io.emit('market-update', {
        stocks,
        marketSummary,
        sectors,
        masi,
        timestamp: lastUpdate
      });
    }
    
    console.log(`✅ Market data updated successfully - ${stocks.length} stocks, ${connectedClients} clients notified`);
    return { success: true, stockCount: stocks.length };
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
        totalVolume: 0 
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
    performance: sector.totalChange > 0 ? 'positive' : sector.totalChange < 0 ? 'negative' : 'neutral'
  }));
}

function generateMASIData(stocks) {
  const weightedSum = stocks.reduce((sum, stock) => {
    const weight = (stock.marketCap || 0) / 1000000000;
    return sum + (stock.price * weight);
  }, 0);
  
  const totalWeight = stocks.reduce((sum, stock) => sum + ((stock.marketCap || 0) / 1000000000), 0);
  const baseIndexValue = 12500;
  const indexValue = totalWeight > 0 ? (weightedSum / totalWeight) * 20 + baseIndexValue : baseIndexValue;
  
  const avgChangePercent = stocks.reduce((sum, stock) => sum + (stock.changePercent || 0), 0) / stocks.length;
  const indexChange = (indexValue * avgChangePercent) / 100;
  
  return {
    index: 'MASI',
    value: parseFloat(indexValue.toFixed(2)),
    change: parseFloat(indexChange.toFixed(2)),
    changePercent: parseFloat(avgChangePercent.toFixed(2)),
    volume: stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0),
    lastUpdate: new Date().toISOString()
  };
}

// Validation schemas
const stockQuerySchema = Joi.object({
  symbol: Joi.string().min(1).max(10).optional(),
  sector: Joi.string().min(1).max(50).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// API Routes
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    lastDataUpdate: lastUpdate,
    marketOpen: isMarketOpen(),
    connectedClients,
    dataStoreSize: dataStore.size,
    memoryUsage: process.memoryUsage(),
    environment: CONFIG.NODE_ENV
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
    
    if (!stocks) {
      console.log('No stocks in cache, updating...');
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
    
    if (value.limit) {
      stocks = stocks.slice(0, value.limit);
    }
    
    res.json({
      stocks,
      lastUpdate,
      totalStocks: stocks.length,
      marketOpen: isMarketOpen(),
      filters: value
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
        availableSymbols: stocks.map(s => s.symbol)
      });
    }
    
    res.json(stock);
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
    
    res.json({ 
      ...marketSummary, 
      masi,
      marketStatus: isMarketOpen() ? 'OPEN' : 'CLOSED'
    });
  } catch (error) {
    console.error('Error fetching market summary:', error);
    res.status(500).json({ error: 'Failed to fetch market summary' });
  }
});

app.get('/api/sectors', (req, res) => {
  try {
    const sectors = dataStore.get('sectors') || [];
    res.json({
      sectors,
      totalSectors: sectors.length,
      lastUpdate
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
    res.json(masi);
  } catch (error) {
    console.error('Error fetching MASI:', error);
    res.status(500).json({ error: 'Failed to fetch MASI data' });
  }
});

app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const stocks = dataStore.get('stocks') || [];
    const results = stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.sector.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({
      query,
      results,
      totalResults: results.length
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/signals', (req, res) => {
  try {
    const stocks = dataStore.get('stocks') || [];
    
    const strongBuys = stocks.filter(stock => stock.signal === 'STRONG_BUY');
    const strongSells = stocks.filter(stock => stock.signal === 'STRONG_SELL');
    const buys = stocks.filter(stock => stock.signal === 'BUY');
    const sells = stocks.filter(stock => stock.signal === 'SELL');
    
    res.json({
      strongBuys,
      strongSells,
      buys,
      sells,
      lastUpdate,
      totalStocks: stocks.length
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch trading signals' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// WebSocket connection handler
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`Client connected: ${socket.id} (Total: ${connectedClients})`);
  
  const stocks = dataStore.get('stocks');
  if (stocks) {
    socket.emit('initial-data', {
      stocks,
      marketSummary: dataStore.get('market-summary'),
      sectors: dataStore.get('sectors'),
      masi: dataStore.get('masi'),
      timestamp: lastUpdate
    });
  }
  
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`Client disconnected: ${socket.id} (Total: ${connectedClients})`);
  });
  
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Scheduled updates
const updateSchedule = CONFIG.NODE_ENV === 'development' ? '*/2 * * * *' : `${CONFIG.UPDATE_INTERVAL} * * * *`;

cron.schedule(updateSchedule, () => {
  if (CONFIG.NODE_ENV === 'development' || isMarketOpen()) {
    console.log('📅 Scheduled market data update...');
    updateMarketData();
  } else {
    console.log('📅 Market closed - skipping update');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Initial data load
console.log('🚀 Loading initial market data...');
updateMarketData().then(() => {
  console.log('📊 Initial data loaded successfully');
});

// Start server
server.listen(CONFIG.PORT, () => {
  console.log(`🚀 CSE Stock Analyzer API running on port ${CONFIG.PORT}`);
  console.log(`📊 Market Status: ${isMarketOpen() ? 'OPEN' : 'CLOSED'}`);
  console.log(`🌐 Environment: ${CONFIG.NODE_ENV}`);
  console.log(`⏰ Update Interval: ${updateSchedule}`);
  console.log(`🔗 CORS Origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});
EOF
