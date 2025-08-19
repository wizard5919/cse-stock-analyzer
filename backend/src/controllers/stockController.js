const stockService = require('../services/stockService');

async function getStockIndicators(req, res) {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const data = await stockService.getStockDataWithIndicators(symbol.toUpperCase());
    return res.json(data);
  } catch (err) {
    console.error('Error fetching stock indicators:', err);
    res.status(500).json({ error: 'Failed to fetch stock indicators' });
  }
}

module.exports = { getStockIndicators };
