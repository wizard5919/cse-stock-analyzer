/**
 * Author: Moulay Youssef Aziz Sbai
 * Utility functions for stock technical indicators
 */

const ti = require('technicalindicators');

// Exponential Moving Average (EMA)
function calculateEMA(values, period = 14) {
  return ti.EMA.calculate({ values, period });
}

// Moving Average Convergence Divergence (MACD)
function calculateMACD(values) {
  return ti.MACD.calculate({
    values,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
}

// Relative Strength Index (RSI)
function calculateRSI(values, period = 14) {
  return ti.RSI.calculate({ values, period });
}

// Volume Weighted Average Price (VWAP)
function calculateVWAP(high, low, close, volume) {
  return ti.VWAP.calculate({ high, low, close, volume });
}

// Liquidity = price × volume
function calculateLiquidity(close, volume) {
  return close.map((c, i) => c * volume[i]);
}

module.exports = {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateVWAP,
  calculateLiquidity
};
