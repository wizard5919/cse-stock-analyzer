import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Filter, 
  Eye, EyeOff, Bell, Settings, Download, Share2,
  AlertCircle, CheckCircle, Clock, Globe, BarChart3,
  Activity, DollarSign, Wifi, WifiOff
} from 'lucide-react';
import io from 'socket.io-client';

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'http://localhost:5000',
  REFRESH_INTERVAL: 30000,
  CHART_COLORS: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  THEMES: {
    light: {
      background: 'bg-gray-50',
      card: 'bg-white',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      border: 'border-gray-200'
    },
    dark: {
      background: 'bg-gray-900',
      card: 'bg-gray-800',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      border: 'border-gray-700'
    }
  }
};

// Custom Hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};

// Components
const StatusIndicator = ({ status, text }) => {
  const statusConfig = {
    online: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
    offline: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
    loading: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' }
  };
  
  const config = statusConfig[status] || statusConfig.offline;
  const IconComponent = config.icon;
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bg}`}>
      <IconComponent className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{text}</span>
    </div>
  );
};

const StockCard = ({ stock, onClick, isSelected }) => {
  const isPositive = stock.change >= 0;
  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-200'
      }`}
      onClick={() => onClick(stock)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{stock.symbol}</h3>
            <p className="text-sm text-gray-600 truncate max-w-[200px]">{stock.name}</p>
            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full mt-2">
              {stock.sector}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {stock.price?.toFixed(2)} MAD
            </div>
            <div className={`flex items-center justify-end space-x-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">
                {isPositive ? '+' : ''}{stock.change?.toFixed(2)}
              </span>
              <span className="text-sm">
                ({isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Volume</span>
            <div className="font-semibold text-gray-900">{formatNumber(stock.volume)}</div>
          </div>
          <div>
            <span className="text-gray-500">Market Cap</span>
            <div className="font-semibold text-gray-900">{formatNumber(stock.marketCap)}</div>
          </div>
        </div>
        
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isPositive ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(Math.abs(stock.changePercent || 0) * 10, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const MarketOverview = ({ marketSummary, masi }) => {
  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    return num?.toLocaleString() || '0';
  };

  const metrics = [
    {
      title: 'MASI Index',
      value: masi?.value?.toFixed(2) || '0',
      change: masi?.change?.toFixed(2) || '0',
      changePercent: masi?.changePercent?.toFixed(2) || '0',
      icon: Activity,
      color: (masi?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Total Market Cap',
      value: formatNumber(marketSummary?.totalMarketCap),
      subtitle: 'MAD',
      icon: DollarSign,
      color: 'text-blue-600'
    },
    {
      title: 'Total Volume',
      value: formatNumber(marketSummary?.totalVolume),
      subtitle: 'Shares',
      icon: BarChart3,
      color: 'text-purple-600'
    },
    {
      title: 'Market Breadth',
      value: `${marketSummary?.gainers || 0}/${marketSummary?.losers || 0}`,
      subtitle: 'Gainers/Losers',
      icon: TrendingUp,
      color: 'text-indigo-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-opacity-10 ${metric.color.replace('text-', 'bg-')}`}>
                <IconComponent className={`w-6 h-6 ${metric.color}`} />
              </div>
              {metric.change && (
                <div className={`flex items-center space-x-1 ${metric.color}`}>
                  {parseFloat(metric.change) >= 0 ? 
                    <TrendingUp className="w-4 h-4" /> : 
                    <TrendingDown className="w-4 h-4" />
                  }
                  <span className="text-sm font-medium">
                    {parseFloat(metric.change) >= 0 ? '+' : ''}{metric.change}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{metric.title}</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                {metric.subtitle && (
                  <span className="text-sm text-gray-500">{metric.subtitle}</span>
                )}
                {metric.changePercent && (
                  <span className={`text-sm ${metric.color}`}>
                    ({parseFloat(metric.changePercent) >= 0 ? '+' : ''}{metric.changePercent}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StockChart = ({ stock, historicalData }) => {
  const [timeframe, setTimeframe] = useState('30d');
  
  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No chart data available</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: item.close,
    volume: item.volume
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{stock.symbol} Price Chart</h3>
          <p className="text-gray-600">{stock.name}</p>
        </div>
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SectorAnalysis = ({ sectors }) => {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Sector Analysis</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>No sector data available</p>
        </div>
      </div>
    );
  }

  const chartData = sectors.map((sector, index) => ({
    ...sector,
    color: CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length]
  }));

  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    return num?.toLocaleString() || '0';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Sector Analysis</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="totalMarketCap"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [formatNumber(value), 'Market Cap']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-4">
          {chartData.map((sector, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: sector.color }}
                />
                <div>
                  <div className="font-semibold text-gray-900">{sector.name}</div>
                  <div className="text-sm text-gray-500">{sector.stockCount} stocks</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatNumber(sector.totalMarketCap)}
                </div>
                <div className={`text-sm ${
                  sector.avgChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange?.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-lg text-gray-600">Loading CSE Stock Analyzer...</p>
    </div>
  </div>
);

const ErrorMessage = ({ error, onRetry }) => (
  <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">Error: {error}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

// Main Component
const CSEStockAnalyzer = () => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [marketSummary, setMarketSummary] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [masi, setMasi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [socket, setSocket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  
  const { request, loading, error } = useApi();

  // WebSocket connection
  useEffect(() => {
    const newSocket = io(CONFIG.WS_URL, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      setConnectionStatus('online');
      console.log('WebSocket connected');
    });
    
    newSocket.on('disconnect', () => {
      setConnectionStatus('offline');
      console.log('WebSocket disconnected');
    });
    
    newSocket.on('connect_error', (error) => {
      setConnectionStatus('offline');
      console.error('WebSocket connection error:', error);
    });
    
    newSocket.on('initial-data', (data) => {
      console.log('Received initial data:', data);
      if (data.stocks) {
        setStocks(data.stocks);
        setFilteredStocks(data.stocks);
      }
      if (data.marketSummary) setMarketSummary(data.marketSummary);
      if (data.sectors) setSectors(data.sectors);
      if (data.masi) setMasi(data.masi);
      setLastUpdate(data.timestamp);
    });
    
    newSocket.on('market-update', (data) => {
      console.log('Market update received:', data);
      if (data.stocks) {
        setStocks(data.stocks);
        setFilteredStocks(prevFiltered => {
          // Maintain filters when updating
          return applyFilters(data.stocks, searchTerm, sectorFilter);
        });
      }
      if (data.marketSummary) setMarketSummary(data.marketSummary);
      if (data.sectors) setSectors(data.sectors);
      if (data.masi) setMasi(data.masi);
      setLastUpdate(data.timestamp);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [searchTerm, sectorFilter]);

  // Apply filters function
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
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [stocksData, summaryData, sectorsData, masiData] = await Promise.all([
          request('/stocks').catch(() => ({ stocks: [] })),
          request('/market-summary').catch(() => ({})),
          request('/sectors').catch(() => ({ sectors: [] })),
          request('/masi').catch(() => ({}))
        ]);

        setStocks(stocksData.stocks || []);
        setFilteredStocks(stocksData.stocks || []);
        setMarketSummary(summaryData);
        setSectors(sectorsData.sectors || sectorsData || []);
        setMasi(masiData);
        setLastUpdate(stocksData.lastUpdate);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [request]);

  // Filter stocks when search or sector filter changes
  useEffect(() => {
    const filtered = applyFilters(stocks, searchTerm, sectorFilter);
    setFilteredStocks(filtered);
  }, [stocks, searchTerm, sectorFilter, applyFilters]);

  // Fetch historical data for selected stock
  useEffect(() => {
    if (selectedStock) {
      const fetchHistoricalData = async () => {
        try {
          const data = await request(`/stocks/${selectedStock.symbol}/history`);
          setHistoricalData(data.history || []);
        } catch (err) {
          console.error('Failed to fetch historical data:', err);
          setHistoricalData([]);
        }
      };
      
      fetchHistoricalData();
    }
  }, [selectedStock, request]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setActiveTab('chart');
  };

  const handleRefresh = async () => {
    try {
      const stocksData = await request('/stocks');
      setStocks(stocksData.stocks || []);
      setFilteredStocks(stocksData.stocks || []);
      setLastUpdate(stocksData.lastUpdate);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const currentTheme = CONFIG.THEMES[theme];
  const availableSectors = useMemo(() => {
    const sectorSet = new Set(stocks.map(stock => stock.sector));
    return Array.from(sectorSet);
  }, [stocks]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen ${currentTheme.background}`}>
      {/* Header */}
      <header className={`${currentTheme.card} shadow-sm border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-8 h-8 text-blue-600" />
                <h1 className={`text-2xl font-bold ${currentTheme.text}`}>
                  CSE Stock Analyzer
                </h1>
              </div>
              <StatusIndicator 
                status={connectionStatus} 
                text={connectionStatus === 'online' ? 'Live Data' : 'Offline Mode'} 
              />
            </div>
            
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className={`text-sm ${currentTheme.textSecondary}`}>
                  Last update: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`p-2 rounded-lg ${currentTheme.card} border ${currentTheme.border} hover:bg-gray-100 disabled:opacity-50`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`p-2 rounded-lg ${currentTheme.card} border ${currentTheme.border} hover:bg-gray-100`}
              >
                {theme === 'light' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={`${currentTheme.card} border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', name: 'Market Overview', icon: Globe },
              { id: 'sectors', name: 'Sector Analysis', icon: BarChart3 },
              { id: 'chart', name: 'Stock Chart', icon: Activity }
            ].map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : `border-transparent ${currentTheme.textSecondary} hover:text-gray-700 hover:border-gray-300`
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <ErrorMessage error={error} onRetry={handleRefresh} />
        )}

        {/* Search and Filter Controls */}
        {activeTab === 'overview' && (
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search stocks by symbol or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Sectors</option>
                {availableSectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Market Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <MarketOverview marketSummary={marketSummary} masi={masi} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStocks.map(stock => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onClick={handleStockSelect}
                  isSelected={selectedStock?.symbol === stock.symbol}
                />
              ))}
            </div>

            {filteredStocks.length === 0 && stocks.length > 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-lg font-medium ${currentTheme.text} mb-2`}>
                  No stocks found
                </h3>
                <p className={currentTheme.textSecondary}>
                  Try adjusting your search terms or sector filter.
                </p>
              </div>
            )}

            {stocks.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-lg font-medium ${currentTheme.text} mb-2`}>
                  No stocks available
                </h3>
                <p className={currentTheme.textSecondary}>
                  Stock data is currently unavailable. Please try refreshing.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sector Analysis Tab */}
        {activeTab === 'sectors' && (
          <div className="space-y-8">
            <SectorAnalysis sectors={sectors} />
            
            {/* Top Performers by Sector */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sectors.map(sector => {
                const sectorStocks = stocks
                  .filter(stock => stock.sector === sector.name)
                  .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
                  .slice(0, 3);

                return (
                  <div key={sector.name} className={`${currentTheme.card} rounded-xl shadow-lg p-6`}>
                    <h4 className={`text-lg font-bold ${currentTheme.text} mb-4`}>
                      Top {sector.name} Performers
                    </h4>
                    <div className="space-y-3">
                      {sectorStocks.map((stock, index) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleStockSelect(stock)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{stock.symbol}</div>
                              <div className="text-sm text-gray-500 truncate max-w-[150px]">
                                {stock.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {stock.price?.toFixed(2)} MAD
                            </div>
                            <div className={`text-sm ${
                              (stock.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(stock.changePercent || 0) >= 0 ? '+' : ''}
                              {stock.changePercent?.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock Chart Tab */}
        {activeTab === 'chart' && (
          <div className="space-y-8">
            {selectedStock ? (
              <>
                <StockChart stock={selectedStock} historicalData={historicalData} />
                
                {/* Stock Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <StockCard
                      stock={selectedStock}
                      onClick={() => {}}
                      isSelected={true}
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <div className={`${currentTheme.card} rounded-xl shadow-lg p-6`}>
                      <h4 className={`text-lg font-bold ${currentTheme.text} mb-6`}>
                        Stock Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className={`font-semibold ${currentTheme.text} mb-3`}>Basic Info</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Symbol:</span>
                              <span className={currentTheme.text}>{selectedStock.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>ISIN:</span>
                              <span className={currentTheme.text}>{selectedStock.isin}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Sector:</span>
                              <span className={currentTheme.text}>{selectedStock.sector}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Previous Close:</span>
                              <span className={currentTheme.text}>{selectedStock.previousClose?.toFixed(2)} MAD</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className={`font-semibold ${currentTheme.text} mb-3`}>Performance</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Daily Change:</span>
                              <span className={`${
                                (selectedStock.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(selectedStock.change || 0) >= 0 ? '+' : ''}
                                {selectedStock.change?.toFixed(2)} MAD
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>% Change:</span>
                              <span className={`${
                                (selectedStock.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(selectedStock.changePercent || 0) >= 0 ? '+' : ''}
                                {selectedStock.changePercent?.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Day High:</span>
                              <span className={currentTheme.text}>{selectedStock.dayHigh?.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Day Low:</span>
                              <span className={currentTheme.text}>{selectedStock.dayLow?.toFixed(2)} MAD</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className={`font-semibold ${currentTheme.text} mb-3`}>Volume & Cap</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Volume:</span>
                              <span className={currentTheme.text}>
                                {selectedStock.volume?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>Market Cap:</span>
                              <span className={currentTheme.text}>
                                {((selectedStock.marketCap || 0) / 1e9).toFixed(1)}B MAD
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className={`font-semibold ${currentTheme.text} mb-3`}>Technical</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>RSI (14):</span>
                              <span className={`${
                                (selectedStock.rsi || 0) > 70 ? 'text-red-600' :
                                (selectedStock.rsi || 0) < 30 ? 'text-green-600' : currentTheme.text
                              }`}>
                                {selectedStock.rsi?.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>MA 20:</span>
                              <span className={currentTheme.text}>{selectedStock.ma20?.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={currentTheme.textSecondary}>MA 50:</span>
                              <span className={currentTheme.text}>{selectedStock.ma50?.toFixed(2)} MAD</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-lg font-medium ${currentTheme.text} mb-2`}>
                  Select a stock to view its chart
                </h3>
                <p className={currentTheme.textSecondary}>
                  Choose a stock from the overview or sectors to see detailed price history.
                </p>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Stocks
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`${currentTheme.card} border-t ${currentTheme.border} mt-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
                <h3 className={`text-lg font-bold ${currentTheme.text}`}>
                  CSE Stock Analyzer
                </h3>
              </div>
              <p className={`text-sm ${currentTheme.textSecondary} leading-relaxed`}>
                Real-time stock market analysis for the Casablanca Stock Exchange. 
                Track performance, analyze trends, and make informed investment decisions.
              </p>
            </div>
            
            <div>
              <h4 className={`font-semibold ${currentTheme.text} mb-3`}>Market Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={currentTheme.textSecondary}>Total Stocks:</span>
                  <span className={currentTheme.text}>{stocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={currentTheme.textSecondary}>Active Gainers:</span>
                  <span className="text-green-600">{marketSummary?.gainers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={currentTheme.textSecondary}>Active Losers:</span>
                  <span className="text-red-600">{marketSummary?.losers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={currentTheme.textSecondary}>Connection:</span>
                  <span className={connectionStatus === 'online' ? 'text-green-600' : 'text-red-600'}>
                    {connectionStatus === 'online' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className={`font-semibold ${currentTheme.text} mb-3`}>System Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={currentTheme.textSecondary}>
                    {connectionStatus === 'online' ? 'Live Updates' : 'No Live Updates'}
                  </span>
                </div>
                {lastUpdate && (
                  <div className={currentTheme.textSecondary}>
                    Last Update: {new Date(lastUpdate).toLocaleString()}
                  </div>
                )}
                <div className={currentTheme.textSecondary}>
                  Theme: {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </div>
                <div className={currentTheme.textSecondary}>
                  Filtered: {filteredStocks.length} of {stocks.length} stocks
                </div>
              </div>
            </div>
          </div>
          
          <div className={`border-t ${currentTheme.border} mt-8 pt-8 text-center`}>
            <p className={`text-sm ${currentTheme.textSecondary}`}>
              © 2025 CSE Stock Analyzer. Built for the Moroccan stock market community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CSEStockAnalyzer;
