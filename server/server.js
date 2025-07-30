const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const cors = require('cors');

const app = express();

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CACHE_DURATION_MINUTES = parseInt(process.env.CACHE_DURATION_MINUTES) || 5;
const UPDATE_INTERVAL_MINUTES = parseInt(process.env.UPDATE_INTERVAL_MINUTES) || 5;
const MARKET_OPEN_HOUR = parseInt(process.env.MARKET_OPEN_HOUR) || 9;
const MARKET_OPEN_MINUTE = parseInt(process.env.MARKET_OPEN_MINUTE) || 30;
const MARKET_CLOSE_HOUR = parseInt(process.env.MARKET_CLOSE_HOUR) || 15;
const MARKET_CLOSE_MINUTE = parseInt(process.env.MARKET_CLOSE_MINUTE) || 20;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Data storage
// cSpell:disable-next-line
let stocksData = [];
// cSpell:disable-next-line
let marketIndexData = {};
let lastUpdate = null;
let serverStartTime = Date.now();

// CSE stocks configuration
/* cSpell:disable */
const CSE_STOCKS = {
  'ATW': { name: 'Attijariwafa Bank', sector: 'Banking', isin: 'MA0000011884' },
  'IAM': { name: 'Itissalat Al-Maghrib', sector: 'Telecommunications', isin: 'MA0000011835' },
  'COS': { name: 'Cosumar', sector: 'Food & Beverages', isin: 'MA0000012445' },
  'BCP': { name: 'Banque Centrale Populaire', sector: 'Banking', isin: 'MA0000011900' },
  'SNA': { name: 'Société Nationale d\'Autoroutes du Maroc', sector: 'Infrastructure', isin: 'MA0000012429' }
};
/* cSpell:enable */

// Validation schemas
const stockSymbolSchema = Joi.string().valid(...Object.keys(CSE_STOCKS)).required();

const screenerSchema = Joi.object({
  minVolume: Joi.number().min(0).optional(),
  maxVolume: Joi.number().min(0).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  sector: Joi.string().valid(...new Set(Object.values(CSE_STOCKS).map(s => s.sector))).optional(),
  minMarketCap: Joi.number().min(0).optional(),
  maxMarketCap: Joi.number().min(0).optional(),
  sortBy: Joi.string().valid('price', 'volume', 'marketCap', 'change', 'changePercent').default('symbol'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
}).custom((value, helpers) => {
  if (value.minVolume && value.maxVolume && value.minVolume > value.maxVolume) {
    return helpers.error('custom.volumeRange');
  }
  if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
    return helpers.error('custom.priceRange');
  }
  if (value.minMarketCap && value.maxMarketCap && value.minMarketCap > value.maxMarketCap) {
    return helpers.error('custom.marketCapRange');
  }
  return value;
}, 'Range validation').messages({
  'custom.volumeRange': 'minVolume cannot be greater than maxVolume',
  'custom.priceRange': 'minPrice cannot be greater than maxPrice',
  'custom.marketCapRange': 'minMarketCap cannot be greater than maxMarketCap'
});

// Utility functions
const isMarketOpen = () => {
  const now = new Date();
  const moroccoTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Casablanca"}));
  const currentHour = moroccoTime.getHours();
  const currentMinute = moroccoTime.getMinutes();
  const currentDay = moroccoTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Check if it's a weekday (Monday to Friday)
  if (currentDay === 0 || currentDay === 6) return false;
  
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  const marketOpenMinutes = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  const marketCloseMinutes = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;
  
  return currentTimeMinutes >= marketOpenMinutes && currentTimeMinutes <= marketCloseMinutes;
};

const generateMockData = (symbol) => {
  const basePrice = Math.random() * 500 + 100;
  const change = (Math.random() - 0.5) * 20;
  // cSpell:disable-next-line
  return {
    symbol,
    name: CSE_STOCKS[symbol].name,
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
    volume: Math.floor(Math.random() * 500000) + 10000,
    marketCap: Math.floor(Math.random() * 100000000000) + 10000000000,
    sector: CSE_STOCKS[symbol].sector,
    // cSpell:disable-next-line
    isin: CSE_STOCKS[symbol].isin,
    lastUpdate: new Date().toISOString()
  };
};

const generateHistoricalData = (symbol, days = 30) => {
  const history = [];
  const basePrice = Math.random() * 500 + 100;
  let currentPrice = basePrice;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dailyChange = (Math.random() - 0.5) * 10;
    currentPrice += dailyChange;
    const high = currentPrice + Math.random() * 5;
    const low = currentPrice - Math.random() * 5;
    const volume = Math.floor(Math.random() * 200000) + 50000;
    
    history.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat((currentPrice - dailyChange).toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(currentPrice.toFixed(2)),
      volume
    });
  }
  
  return history;
};

// Data fetching functions
const fetchCSEData = async () => {
  try {
    console.log('Fetching CSE data...');
    
    // Simulate API call - replace with actual CSE API endpoint
    // const response = await axios.get('https://www.casablanca-bourse.com/api/stocks', {
    //   timeout: 10000,
    //   headers: {
    //     'User-Agent': 'CSE-Stock-Analyzer/1.0'
    //   }
    // });
    
    // For now, generate mock data
    const stocks = Object.keys(CSE_STOCKS).map(symbol => generateMockData(symbol));
    
    stocksData = stocks;
    lastUpdate = new Date().toISOString();
    
    // Generate market index data
    const totalMarketCap = stocks.reduce((sum, stock) => sum + stock.marketCap, 0);
    const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
    
    // cSpell:disable-next-line
    marketIndexData = {
      // cSpell:disable-next-line
      index: 'MASI',
      value: parseFloat((12000 + Math.random() * 1000).toFixed(2)),
      change: parseFloat(avgChange.toFixed(2)),
      changePercent: parseFloat((avgChange * 0.8).toFixed(2)),
      lastUpdate: lastUpdate
    };
    
    console.log(`Successfully updated ${stocks.length} stocks`);
    return { success: true, count: stocks.length };
    
  } catch (error) {
    console.error('Error fetching CSE data:', error.message);
    return { success: false, error: error.message };
  }
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  req.query = value;
  next();
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: 'healthy',
    uptime,
    timestamp: new Date().toISOString(),
    lastDataUpdate: lastUpdate,
    marketOpen: isMarketOpen(),
    environment: NODE_ENV
  });
});

// Get all stocks
app.get('/api/stocks', asyncHandler(async (req, res) => {
  if (!stocksData.length) {
    await fetchCSEData();
  }
  
  res.json({
    stocks: stocksData,
    lastUpdate,
    totalStocks: stocksData.length,
    marketOpen: isMarketOpen()
  });
}));

// Get individual stock
app.get('/api/stocks/:symbol', asyncHandler(async (req, res) => {
  const { error } = stockSymbolSchema.validate(req.params.symbol);
  if (error) {
    return res.status(400).json({
      error: 'Invalid stock symbol',
      validSymbols: Object.keys(CSE_STOCKS)
    });
  }
  
  const stock = stocksData.find(s => s.symbol === req.params.symbol.toUpperCase());
  if (!stock) {
    return res.status(404).json({
      error: 'Stock not found',
      symbol: req.params.symbol
    });
  }
  
  res.json(stock);
}));

// Get stock history
app.get('/api/stocks/:symbol/history', asyncHandler(async (req, res) => {
  const { error } = stockSymbolSchema.validate(req.params.symbol);
  if (error) {
    return res.status(400).json({
      error: 'Invalid stock symbol',
      validSymbols: Object.keys(CSE_STOCKS)
    });
  }
  
  const history = generateHistoricalData(req.params.symbol.toUpperCase());
  
  res.json({
    symbol: req.params.symbol.toUpperCase(),
    history,
    period: '30 days'
  });
}));

// Stock screener
app.get('/api/screener', validateRequest(screenerSchema), asyncHandler(async (req, res) => {
  if (!stocksData.length) {
    await fetchCSEData();
  }
  
  let filteredStocks = stocksData.filter(stock => {
    const filters = req.query;
    
    if (filters.minVolume && stock.volume < filters.minVolume) return false;
    if (filters.maxVolume && stock.volume > filters.maxVolume) return false;
    if (filters.minPrice && stock.price < filters.minPrice) return false;
    if (filters.maxPrice && stock.price > filters.maxPrice) return false;
    if (filters.sector && stock.sector !== filters.sector) return false;
    if (filters.minMarketCap && stock.marketCap < filters.minMarketCap) return false;
    if (filters.maxMarketCap && stock.marketCap > filters.maxMarketCap) return false;
    
    return true;
  });
  
  // Sort results
  const { sortBy = 'symbol', sortOrder = 'asc' } = req.query;
  filteredStocks.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder === 'desc') {
      return bVal > aVal ? 1 : -1;
    }
    return aVal > bVal ? 1 : -1;
  });
  
  res.json({
    stocks: filteredStocks,
    totalResults: filteredStocks.length,
    filters: req.query,
    lastUpdate
  });
}));

// Get market index
app.get('/api/market-index', asyncHandler(async (req, res) => {
  if (!Object.keys(marketIndexData).length) {
    await fetchCSEData();
  }
  
  // cSpell:disable-next-line
  res.json(marketIndexData);
}));

// Get sectors
app.get('/api/sectors', asyncHandler(async (req, res) => {
  if (!stocksData.length) {
    await fetchCSEData();
  }
  
  const sectors = stocksData.reduce((acc, stock) => {
    if (!acc[stock.sector]) {
      acc[stock.sector] = {
        name: stock.sector,
        stockCount: 0,
        totalMarketCap: 0,
        totalChange: 0
      };
    }
    
    acc[stock.sector].stockCount++;
    acc[stock.sector].totalMarketCap += stock.marketCap;
    acc[stock.sector].totalChange += stock.changePercent;
    
    return acc;
  }, {});
  
  const sectorArray = Object.values(sectors).map(sector => ({
    ...sector,
    avgChange: parseFloat((sector.totalChange / sector.stockCount).toFixed(2))
  }));
  
  res.json(sectorArray);
}));

// Market summary
app.get('/api/market-summary', asyncHandler(async (req, res) => {
  if (!stocksData.length) {
    await fetchCSEData();
  }
  
  const gainers = stocksData.filter(s => s.change > 0).length;
  const losers = stocksData.filter(s => s.change < 0).length;
  const unchanged = stocksData.filter(s => s.change === 0).length;
  
  res.json({
    totalStocks: stocksData.length,
    totalMarketCap: stocksData.reduce((sum, s) => sum + s.marketCap, 0),
    avgPrice: parseFloat((stocksData.reduce((sum, s) => sum + s.price, 0) / stocksData.length).toFixed(2)),
    totalVolume: stocksData.reduce((sum, s) => sum + s.volume, 0),
    gainers,
    losers,
    unchanged,
    // cSpell:disable-next-line
    marketIndex: marketIndexData,
    lastUpdate,
    marketOpen: isMarketOpen()
  });
}));

// Global error handler
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body'
    });
  }
  
  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize data and start server
const startServer = async () => {
  try {
    console.log('Starting CSE Stock Analyzer API...');
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Market hours: ${MARKET_OPEN_HOUR}:${MARKET_OPEN_MINUTE.toString().padStart(2, '0')} - ${MARKET_CLOSE_HOUR}:${MARKET_CLOSE_MINUTE.toString().padStart(2, '0')}`);
    
    // Initial data fetch
    await fetchCSEData();
    
    // Schedule updates during market hours
    cron.schedule(`*/${UPDATE_INTERVAL_MINUTES} * * * *`, async () => {
      if (isMarketOpen()) {
        console.log('Scheduled update triggered');
        await fetchCSEData();
      }
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`📈 Market status: ${isMarketOpen() ? 'OPEN' : 'CLOSED'}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer();