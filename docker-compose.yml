version: '3.8'

services:
  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - PORT=5000
      - FRONTEND_URL=http://localhost:3000
      - MONGODB_URI=mongodb://mongodb:27017/cse_stock_analyzer
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mongodb
      - redis
    networks:
      - cse-network
    restart: unless-stopped

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api
      - REACT_APP_WS_URL=http://localhost:5000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - cse-network
    restart: unless-stopped

  # MongoDB Database
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password123
      - MONGO_INITDB_DATABASE=cse_stock_analyzer
    volumes:
      - mongodb_data:/data/db
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - cse-network
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - cse-network
    restart: unless-stopped
    command: redis-server --appendonly yes

  # Nginx Reverse Proxy (Optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - cse-network
    restart: unless-stopped
    profiles: ["production"]

volumes:
  mongodb_data:
  redis_data:

networks:
  cse-network:
    driver: bridge
