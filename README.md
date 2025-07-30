# CSE Stock Analyzer 📈

[![GitHub Stars](https://img.shields.io/github/stars/wizard5919/cse-stock-analyzer?style=for-the-badge)](https://github.com/wizard5919/cse-stock-analyzer/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/wizard5919/cse-stock-analyzer?style=for-the-badge)](https://github.com/wizard5919/cse-stock-analyzer/network)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge)](https://nodejs.org/)

> **Real-time Casablanca Stock Exchange (CSE) market analyzer** with advanced charting, sector analysis, and WebSocket-powered live updates. Built for the Moroccan financial community.

![CSE Stock Analyzer Demo](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=CSE+Stock+Analyzer+Demo)

## 🌟 **Live Demo**

🔗 **[Try Live Demo](https://your-domain.com)** *(Coming Soon)*

## ✨ **Key Features**

### 🔄 **Real-Time Data**
- **Live stock prices** from major CSE companies
- **WebSocket connections** for instant market updates
- **Market hours detection** with automatic data refresh
- **Multi-source data fallback** for reliability

### 📊 **Advanced Analytics**
- **Interactive price charts** with 30-day history
- **Sector performance analysis** with visual breakdowns
- **Market breadth indicators** (gainers vs losers ratio)
- **MASI index tracking** with real-time calculations
- **Volume analysis** and trading pattern recognition
- **Technical indicators** (RSI, Moving Averages, Trading Signals)

### 🎨 **Modern User Interface**
- **Responsive design** that works on all devices
- **Dark/Light theme** support with user preferences
- **Real-time updates** without page refresh needed
- **Advanced search & filtering** by symbol, name, or sector
- **Interactive charts** with hover tooltips and zoom

### 🏗️ **Production Ready**
- **Docker containerization** for easy deployment
- **Professional logging** and error handling
- **Health monitoring** endpoints
- **Environment-based configuration**
- **Scalable architecture** ready for production use

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js 18+** and npm
- **Git** for version control
- **Docker** (optional, for containerized deployment)

### **1. Clone Repository**
```bash
git clone https://github.com/wizard5919/cse-stock-analyzer.git
cd cse-stock-analyzer
```

### **2. Quick Setup**
```bash
# Make start script executable
chmod +x start.sh

# Start application (installs dependencies automatically)
./start.sh
```

### **3. Manual Setup (Alternative)**
```bash
# Install dependencies for backend
cd backend && npm install && cd ..

# Install dependencies for frontend
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env

# Start backend
cd backend && npm run dev &

# Start frontend (in a new terminal)
cd frontend && npm start
```

### **4. Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 📱 **Screenshots**

### Market Overview Dashboard
![Market Overview](https://via.placeholder.com/600x400/10B981/FFFFFF?text=Market+Overview+Dashboard)

*Real-time market summary with MASI index, gainers/losers, and top performing stocks*

### Interactive Stock Charts
![Stock Charts](https://via.placeholder.com/600x400/3B82F6/FFFFFF?text=Interactive+Stock+Charts)

*Detailed price history with technical indicators and volume analysis*

### Sector Analysis
![Sector Analysis](https://via.placeholder.com/600x400/8B5CF6/FFFFFF?text=Sector+Performance+Analysis)

*Visual breakdown of sector performance with market cap distribution*

### Advanced Search & Filtering
![Search and Filter](https://via.placeholder.com/600x400/F59E0B/FFFFFF?text=Advanced+Search+%26+Filtering)

*Powerful search capabilities by stock symbol, company name, or sector*

## 🛠️ **Technology Stack**

### **Backend**
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18+ |
| **Express.js** | Web Framework | ^4.18.2 |
| **Socket.IO** | Real-time Communication | ^4.7.5 |
| **Axios** | HTTP Client | ^1.7.2 |
| **Cheerio** | Web Scraping | ^1.0.0-rc.12 |
| **Joi** | Data Validation | ^17.13.3 |
| **Node-Cron** | Task Scheduling | ^3.0.3 |

### **Frontend**
| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Library | ^18.2.0 |
| **Recharts** | Chart Library | ^2.8.0 |
| **Tailwind CSS** | Styling Framework | ^3.4.0 |
| **Lucide React** | Icon Library | ^0.263.1 |
| **Socket.IO Client** | Real-time Updates | ^4.7.5 |

### **DevOps**
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container Orchestration |
| **GitHub Actions** | CI/CD Pipeline |

## 📊 **API Documentation**

### **Base URL**: `http://localhost:5000/api`

### **Key Endpoints**

#### **📈 Stock Data**
```http
GET /stocks
```
Get all stocks with real-time data

#### **🔍 Individual Stock**
```http
GET /stocks/{symbol}
```
Get specific stock details with technical indicators

#### **📈 Historical Data**
```http
GET /stocks/{symbol}/history?days=30
```
Get historical price data with technical analysis

#### **🌍 Market Summary**
```http
GET /market-summary
```
Get comprehensive market overview with MASI index

#### **🏢 Sector Analysis**
```http
GET /sectors
```
Get sector performance data

#### **🎯 Trading Signals**
```http
GET /signals
```
Get stocks with BUY/SELL/HOLD signals based on technical analysis

#### **❤️ Health Check**
```http
GET /health
```
Get application health status

## 🌐 **WebSocket Events**

### **Connect to WebSocket**
```javascript
const socket = io('http://localhost:5000');
```

### **Events**
| Event | Description | Data |
|-------|-------------|------|
| `initial-data` | Initial market data on connection | Complete market state |
| `market-update` | Real-time market updates | Updated stock prices |
| `connection` | Client connected | Connection info |
| `disconnect` | Client disconnected | Disconnection info |

## 📦 **Docker Deployment**

### **Development**
```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### **Production**
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Monitor services
docker-compose ps
```

## 🔧 **Configuration**

### **Environment Variables**
Create `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Market Configuration
UPDATE_INTERVAL_MINUTES=*/2
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=30
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=20

# API Limits
RATE_LIMIT_MAX_REQUESTS=100
CACHE_DURATION_MINUTES=5
```

### **Market Hours**
- **Open**: 9:30 AM Morocco Time (GMT+1)
- **Close**: 3:20 PM Morocco Time (GMT+1)
- **Days**: Monday to Friday

### **Supported Stocks**
| Symbol | Company | Sector |
|--------|---------|--------|
| **ATW** | Attijariwafa Bank | Banking |
| **IAM** | Itissalat Al-Maghrib | Telecommunications |
| **COS** | Cosumar | Food & Beverages |
| **BCP** | Banque Centrale Populaire | Banking |
| **SNA** | Société Nationale d'Autoroutes | Infrastructure |
| **LES** | Lesieur Cristal | Food & Beverages |
| **MNG** | Managem | Mining |
| **TQM** | Taqa Morocco | Utilities |
| **CDM** | Credit du Maroc | Banking |
| **EQD** | EQDOM | Financial Services |
| **GAZ** | Afriquia Gaz | Energy |
| **HPS** | HPS | Technology |
| **MIC** | Microdata | Technology |
| **WAA** | Wafa Assurance | Insurance |
| *...and 8 more* | *Total: 23 stocks* | *Various sectors* |

## 🧪 **Testing**

### **Run Tests**
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# All tests with coverage
npm run test:coverage
```

## ⚡ **Performance Features**

- **Real-time updates** every 2 minutes during market hours
- **WebSocket connections** for instant data synchronization  
- **Efficient caching** with 5-minute cache duration
- **Rate limiting** (100 requests per 15 minutes)
- **Market hours detection** to optimize resource usage
- **Technical indicators** calculated on-demand
- **Responsive design** optimized for all devices

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Quick Contribution Steps**
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📈 **Roadmap**

### **Phase 1: Core Features** ✅
- [x] Real-time stock data
- [x] Interactive charts
- [x] Sector analysis
- [x] WebSocket updates
- [x] Responsive UI
- [x] Technical indicators
- [x] Trading signals

### **Phase 2: Enhanced Features** 🔄
- [ ] User authentication
- [ ] Portfolio tracking
- [ ] Price alerts
- [ ] News integration
- [ ] Advanced charting tools

### **Phase 3: Advanced Analytics** 📋
- [ ] Machine learning predictions
- [ ] Sentiment analysis
- [ ] Backtesting tools
- [ ] API for developers
- [ ] Mobile companion app

## 🐛 **Known Issues**

- Data is currently simulated for development (real CSE integration pending)
- Historical data limited to generated mock data
- WebSocket reconnection could be improved
- Mobile optimization in progress

## 📄 **License**

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Casablanca Stock Exchange** for market data inspiration
- **React & Node.js communities** for excellent documentation
- **Moroccan financial community** for feedback and support
- **Open source contributors** who make projects like this possible

## 📞 **Support & Contact**

- **📧 Email**: youssefsbai1959@gmail.com
- **🐛 Issues**: [GitHub Issues](https://github.com/wizard5919/cse-stock-analyzer/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/wizard5919/cse-stock-analyzer/discussions)

## ⭐ **Show Your Support**

If this project helped you, please consider:
- ⭐ **Starring** the repository
- 🍴 **Forking** for your own use
- 🐛 **Reporting** bugs you find
- 💡 **Suggesting** new features
- 📢 **Sharing** with others

---

<div align="center">

**Built with ❤️ for the Moroccan financial community**

🇲🇦 **Morocco** • 📈 **Finance** • 🚀 **Technology**

</div>
