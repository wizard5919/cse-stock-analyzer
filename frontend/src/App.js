import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Filter, 
  Eye, EyeOff, AlertCircle, CheckCircle, Clock, Globe, BarChart3,
  Activity, DollarSign
} from 'lucide-react';
import io from 'socket.io-client';

// Import the CSS styles
import './styles/index.css';

// Simple configuration
const CONFIG = {
  API_BASE_URL: 'http://localhost:5001/api',
  WS_URL: 'http://localhost:5001',
  CHART_COLORS: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
};

const CSEStockAnalyzer = () => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [marketSummary, setMarketSummary] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [masi, setMasi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [error, setError] = useState(null);

  // WebSocket connection
  useEffect(() => {
    const socket = io(CONFIG.WS_URL);
    
    socket.on('connect', () => {
      setConnectionStatus('online');
      console.log('Connected to backend');
    });
    
    socket.on('disconnect', () => {
      setConnectionStatus('offline');
      console.log('Disconnected from backend');
    });
    
    socket.on('initial-data', (data) => {
      console.log('Received initial data:', data);
      if (data.stocks) {
        setStocks(data.stocks);
        setFilteredStocks(data.stocks);
      }
      if (data.marketSummary) setMarketSummary(data.marketSummary);
      if (data.sectors) setSectors(data.sectors);
      if (data.masi) setMasi(data.masi);
      setLastUpdate(data.timestamp);
      setIsLoading(false);
    });
    
    socket.on('market-update', (data) => {
      console.log('Market update received');
      if (data.stocks) {
        setStocks(data.stocks);
        const filtered = applyFilters(data.stocks, searchTerm, sectorFilter);
        setFilteredStocks(filtered);
      }
      if (data.marketSummary) setMarketSummary(data.marketSummary);
      if (data.sectors) setSectors(data.sectors);
      if (data.masi) setMasi(data.masi);
      setLastUpdate(data.timestamp);
    });
    
    return () => socket.close();
  }, [searchTerm, sectorFilter]);

  // Apply filters
  const applyFilters = useCallback((stockList, search, sector) => {
    let filtered = stockList;
    
    if (search) {
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
        stock.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (sector && sector !== 'all') {
      filtered = filtered.filter(stock => stock.sector === sector);
    }
    
    return filtered;
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/stocks`);
        const data = await response.json();
        setStocks(data.stocks || []);
        setFilteredStocks(data.stocks || []);
        setLastUpdate(data.lastUpdate);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (stocks.length === 0) {
      fetchData();
    }
  }, [stocks.length]);

  // Filter stocks when search changes
  useEffect(() => {
    const filtered = applyFilters(stocks, searchTerm, sectorFilter);
    setFilteredStocks(filtered);
  }, [stocks, searchTerm, sectorFilter, applyFilters]);

  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const availableSectors = useMemo(() => {
    return Array.from(new Set(stocks.map(stock => stock.sector)));
  }, [stocks]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setActiveTab('chart');
  };

  const handleRefresh = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/stocks`);
      const data = await response.json();
      setStocks(data.stocks || []);
      setFilteredStocks(data.stocks || []);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <RefreshCw className="loading-spinner" />
        <p>Loading CSE Stock Analyzer...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-title">
              <Activity size={32} color="#2563eb" />
              <h1>CSE Stock Analyzer</h1>
            </div>
            <div className={`status-indicator ${connectionStatus === 'online' ? 'status-online' : 'status-offline'}`}>
              {connectionStatus === 'online' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{connectionStatus === 'online' ? 'Live Data' : 'Offline Mode'}</span>
            </div>
          </div>
          
          <div className="header-right">
            {lastUpdate && (
              <div className="last-update">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </div>
            )}
            
            <button onClick={handleRefresh} className="btn">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <div className="nav-tabs-content">
          <button
            onClick={() => setActiveTab('overview')}
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Globe size={16} />
            <span>Market Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('sectors')}
            className={`nav-tab ${activeTab === 'sectors' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Sector Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`nav-tab ${activeTab === 'chart' ? 'active' : ''}`}
          >
            <Activity size={16} />
            <span>Stock Chart</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {error && (
          <div className="error-message">
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} />
              <span>Error: {error}</span>
            </div>
            <button onClick={handleRefresh} className="error-retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Market Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Market Summary */}
            {marketSummary && (
              <div className="grid md-grid-cols-2 lg-grid-cols-4">
                <div className="card">
                  <div className="metric-card">
                    <div className="metric-icon blue">
                      <DollarSign size={24} />
                    </div>
                  </div>
                  <h3 className="text-sm text-gray-500 mb-1">Total Market Cap</h3>
                  <div className="flex items-baseline space-x-2">
                    <span className="metric-value">{formatNumber(marketSummary.totalMarketCap)}</span>
                    <span className="metric-subtitle">MAD</span>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-sm text-gray-500 mb-1">Total Volume</h3>
                  <div className="metric-value">{formatNumber(marketSummary.totalVolume)}</div>
                </div>

                <div className="card">
                  <h3 className="text-sm text-gray-500 mb-1">Market Breadth</h3>
                  <div className="metric-value">{marketSummary.gainers}/{marketSummary.losers}</div>
                  <div className="metric-subtitle">Gainers/Losers</div>
                </div>

                <div className="card">
                  <h3 className="text-sm text-gray-500 mb-1">MASI Index</h3>
                  <div className="metric-value">{masi?.value?.toFixed(2) || '0'}</div>
                  <div className={`metric-change ${(masi?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(masi?.change || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{(masi?.change || 0) >= 0 ? '+' : ''}{masi?.change?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="search-filter-container">
              <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search stocks by symbol or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Sectors</option>
                {availableSectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Stock Cards */}
            <div className="grid md-grid-cols-2 lg-grid-cols-3">
              {filteredStocks.map(stock => (
                <div
                  key={stock.symbol}
                  className={`stock-card card ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}`}
                  onClick={() => handleStockSelect(stock)}
                >
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{stock.symbol}</h3>
                      <p className="card-subtitle truncate max-w-200px">{stock.name}</p>
                      <span className="sector-tag">{stock.sector}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="stock-price">{stock.price?.toFixed(2)} MAD</div>
                      <div className={`stock-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                        {stock.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{stock.changePercent >= 0 ? '+' : ''}{stock.change?.toFixed(2)}</span>
                        <span>({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stock-details">
                    <div>
                      <div className="detail-label">Volume</div>
                      <div className="detail-value">{formatNumber(stock.volume)}</div>
                    </div>
                    <div>
                      <div className="detail-label">Market Cap</div>
                      <div className="detail-value">{formatNumber(stock.marketCap)}</div>
                    </div>
                  </div>

                  {stock.signal && (
                    <div className={`trading-signal signal-${stock.signal.toLowerCase().replace('_', '-')}`}>
                      {stock.signal.replace('_', ' ')}
                    </div>
                  )}

                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${stock.changePercent >= 0 ? 'progress-positive' : 'progress-negative'}`}
                      style={{ width: `${Math.min(Math.abs(stock.changePercent || 0) * 10, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {filteredStocks.length === 0 && stocks.length > 0 && (
              <div className="empty-state">
                <Search className="empty-state-icon" />
                <h3 className="empty-state-title">No stocks found</h3>
                <p className="empty-state-description">Try adjusting your search terms or sector filter.</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Analysis Tab */}
        {activeTab === 'sectors' && (
          <div className="space-y-8">
            <div className="card">
              <h3 className="card-title mb-6">Sector Analysis</h3>
              
              {sectors.length > 0 ? (
                <div className="grid lg-grid-cols-2">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectors.map((s, i) => ({...s, color: CONFIG.CHART_COLORS[i % CONFIG.CHART_COLORS.length]}))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="totalMarketCap"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {sectors.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatNumber(value), 'Market Cap']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    {sectors.map((sector, index) => (
                      <div key={index} className="sector-item">
                        <div className="sector-info">
                          <div 
                            className="sector-color"
                            style={{ backgroundColor: CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length] }}
                          />
                          <div>
                            <div className="sector-name">{sector.name}</div>
                            <div className="sector-count">{sector.stockCount} stocks</div>
                          </div>
                        </div>
                        <div className="sector-stats">
                          <div className="sector-market-cap">{formatNumber(sector.totalMarketCap)}</div>
                          <div className={`sector-change ${(sector.avgChangePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {(sector.avgChangePercent || 0) >= 0 ? '+' : ''}{sector.avgChangePercent?.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No sector data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stock Chart Tab */}
        {activeTab === 'chart' && (
          <div className="space-y-8">
            {selectedStock ? (
              <>
                <div className="card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">{selectedStock.symbol} Price Chart</h3>
                      <p className="chart-subtitle">{selectedStock.name}</p>
                    </div>
                  </div>
                  <div className="chart-container">
                    <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#6b7280' }}>
                      <Activity size={48} style={{ margin: '0 auto 1rem' }} />
                      <p>Chart coming soon - WebSocket data integration in progress</p>
                    </div>
                  </div>
                </div>

                <div className="grid lg-grid-cols-3">
                  <div className="lg-col-span-1">
                    <div className="stock-card card selected">
                      <div className="card-header">
                        <div>
                          <h3 className="card-title">{selectedStock.symbol}</h3>
                          <p className="card-subtitle">{selectedStock.name}</p>
                          <span className="sector-tag">{selectedStock.sector}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="stock-price">{selectedStock.price?.toFixed(2)} MAD</div>
                          <div className={`stock-change ${selectedStock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                            <span>{selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.change?.toFixed(2)} ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg-col-span-2">
                    <div className="card">
                      <h4 className="card-title mb-6">Stock Details</h4>
                      
                      <div className="grid md-grid-cols-2">
                        <div>
                          <h5 className="font-semibold mb-3">Basic Info</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Symbol:</span>
                              <span>{selectedStock.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">ISIN:</span>
                              <span>{selectedStock.isin}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Sector:</span>
                              <span>{selectedStock.sector}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Previous Close:</span>
                              <span>{selectedStock.previousClose?.toFixed(2)} MAD</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-semibold mb-3">Technical</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">RSI (14):</span>
                              <span className={`${
                                (selectedStock.rsi || 0) > 70 ? 'text-red-600' :
                                (selectedStock.rsi || 0) < 30 ? 'text-green-600' : ''
                              }`}>
                                {selectedStock.rsi?.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">MA 20:</span>
                              <span>{selectedStock.ma20?.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">MA 50:</span>
                              <span>{selectedStock.ma50?.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Signal:</span>
                              <span className={`font-medium ${
                                selectedStock.signal === 'STRONG_BUY' || selectedStock.signal === 'BUY' ? 'text-green-600' :
                                selectedStock.signal === 'STRONG_SELL' || selectedStock.signal === 'SELL' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {selectedStock.signal?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Activity className="empty-state-icon" />
                <h3 className="empty-state-title">Select a stock to view its chart</h3>
                <p className="empty-state-description">Choose a stock from the overview to see detailed analysis.</p>
                <button
                  onClick={() => setActiveTab('overview')}
                  style={{ 
                    background: '#2563eb', 
                    color: 'white', 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.5rem', 
                    border: 'none', 
                    cursor: 'pointer', 
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Browse Stocks
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-grid">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Activity size={24} color="#2563eb" />
                <h3>CSE Stock Analyzer</h3>
              </div>
              <p className="footer-description">
                Real-time stock market analysis for the Casablanca Stock Exchange.
              </p>
            </div>
            
            <div>
              <h4>Market Status</h4>
              <div className="footer-stats">
                <div className="footer-stat-row">
                  <span className="footer-stat-label">Total Stocks:</span>
                  <span className="footer-stat-value">{stocks.length}</span>
                </div>
                <div className="footer-stat-row">
                  <span className="footer-stat-label">Connection:</span>
                  <span className={`footer-stat-value ${connectionStatus === 'online' ? 'online' : 'offline'}`}>
                    {connectionStatus === 'online' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4>System Info</h4>
              <div className="footer-stats">
                <div className="footer-stat-row">
                  <span className="footer-stat-label">Filtered:</span>
                  <span className="footer-stat-value">{filteredStocks.length} of {stocks.length}</span>
                </div>
                {lastUpdate && (
                  <div className="footer-stat-row">
                    <span className="footer-stat-label">Last Update:</span>
                    <span className="footer-stat-value">{new Date(lastUpdate).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>
              © 2025 CSE Stock Analyzer. Built for the Moroccan stock market community.
              <br />
              <span className="footer-api-info">Backend: http://localhost:5001 | Frontend: http://localhost:3000</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CSEStockAnalyzer;
