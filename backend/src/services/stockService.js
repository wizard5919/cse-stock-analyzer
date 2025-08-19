const { calculateEMA, calculateMACD, calculateRSI, calculateVWAP, calculateLiquidity } = require('../utils/indicators');
const scraperService = require('./scraperService');

async function getStockDataWithIndicators(symbol) {
  // Example: Fetch OHLCV data from scraper
  // scraperService.fetchStockData must return { open, high, low, close, volume }
  const { open, high, low, close, volume } = await scraperService.fetchStockData(symbol);

  // Compute indicators
  const ema20 = calculateEMA(close, 20);
  const ema50 = calculateEMA(close, 50);
  const macd = calculateMACD(close);
  const rsi14 = calculateRSI(close, 14);
  const vwap = calculateVWAP(high, low, close, volume);
  const liquidity = calculateLiquidity(close, volume);

  return {
    symbol,
    close,
    volume,
    ema20,
    ema50,
    macd,
    rsi14,
    vwap,
    liquidity
  };
}

module.exports = { getStockDataWithIndicators };
