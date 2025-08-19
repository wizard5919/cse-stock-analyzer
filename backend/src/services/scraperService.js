// For now, return mock OHLCV data so you can test indicators
async function fetchStockData(symbol) {
  // Example arrays of OHLCV data
  const open = [100, 102, 101, 105, 107];
  const high = [103, 104, 106, 108, 110];
  const low = [99, 100, 100, 103, 105];
  const close = [102, 101, 105, 107, 109];
  const volume = [1000, 1200, 900, 1500, 2000];

  return { open, high, low, close, volume };
}

module.exports = { fetchStockData };
