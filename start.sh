#!/bin/bash

# ==============================================
# CSE Stock Analyzer - Enhanced Start Script
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NODE_MIN_VERSION="18.0.0"
REQUIRED_PORTS=(5000 3000)
PROJECT_NAME="CSE Stock Analyzer"

print_banner() {
    echo -e "${PURPLE}"
    echo "=================================================="
    echo "    CSE Stock Analyzer - Enhanced Start Script    "
    echo "    Casablanca Stock Exchange Market Analyzer     "
    echo "    Version 2.0 - Real-time Stock Data          "
    echo "=================================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Version comparison function
version_compare() {
    if [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; then
        return 0
    else
        return 1
    fi
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        if version_compare "$NODE_VERSION" "$NODE_MIN_VERSION"; then
            print_success "Node.js $NODE_VERSION ✓"
        else
            print_error "Node.js $NODE_VERSION found, but $NODE_MIN_VERSION or higher required"
            print_error "Please upgrade Node.js: https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Node.js not found. Please install Node.js $NODE_MIN_VERSION or higher"
        print_error "Download from: https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION ✓"
    else
        print_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_success "Git $GIT_VERSION ✓"
    else
        print_warning "Git not found (optional for development)"
    fi
    
    # Check Docker (optional)
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker $DOCKER_VERSION ✓"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found (optional for development)"
        DOCKER_AVAILABLE=false
    fi
    
    # Check Docker Compose (optional)
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker Compose $COMPOSE_VERSION ✓"
        COMPOSE_AVAILABLE=true
    else
        print_warning "Docker Compose not found (optional for development)"
        COMPOSE_AVAILABLE=false
    fi
}

# Check port availability
check_ports() {
    print_status "Checking port availability..."
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if command_exists lsof && lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use"
            
            if [ "$port" = "5000" ]; then
                print_error "Backend port $port is in use. Please stop the service using this port."
                echo "To find what's using port $port, run: lsof -i :$port"
                exit 1
            elif [ "$port" = "3000" ]; then
                print_error "Frontend port $port is in use. Please stop the service using this port."
                echo "To find what's using port $port, run: lsof -i :$port"
                exit 1
            fi
        else
            print_success "Port $port available ✓"
        fi
    done
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create necessary directories
    mkdir -p logs data temp backups
    print_success "Created necessary directories ✓"
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from template ✓"
            print_warning "Please review .env file and update configuration as needed"
        else
            print_warning ".env.example not found, creating basic .env file"
            cat > .env << EOF
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
UPDATE_INTERVAL_MINUTES=*/2
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=30
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=20
RATE_LIMIT_MAX_REQUESTS=100
CACHE_DURATION_MINUTES=5
EOF
            print_success "Created basic .env file ✓"
        fi
    else
        print_success "Environment file exists ✓"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Check if we need to install root dependencies
    if [ -f "package.json" ]; then
        if [ ! -d "node_modules" ]; then
            print_status "Installing root dependencies..."
            npm install
            print_success "Root dependencies installed ✓"
        else
            print_success "Root dependencies already installed ✓"
        fi
    fi
    
    # Backend dependencies
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        cd backend
        if [ ! -d "node_modules" ]; then
            print_status "Installing backend dependencies..."
            npm install
            print_success "Backend dependencies installed ✓"
        else
            print_success "Backend dependencies already installed ✓"
        fi
        cd ..
    else
        print_error "Backend directory or package.json not found"
        exit 1
    fi
    
    # Frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        if [ ! -d "node_modules" ]; then
            print_status "Installing frontend dependencies..."
            npm install
            print_success "Frontend dependencies installed ✓"
        else
            print_success "Frontend dependencies already installed ✓"
        fi
        cd ..
    else
        print_error "Frontend directory or package.json not found"
        exit 1
    fi
}

# Start with Docker (optional)
start_with_docker() {
    print_status "Checking Docker services..."
    
    if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
        if [ -f "docker-compose.yml" ]; then
            print_status "Starting database services with Docker..."
            docker-compose up -d mongodb redis 2>/dev/null || true
            
            print_status "Waiting for databases to be ready..."
            sleep 10
            
            print_success "Docker services started ✓"
            return 0
        else
            print_warning "docker-compose.yml not found"
            return 1
        fi
    else
        print_warning "Docker or Docker Compose not available"
        return 1
    fi
}

# Start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    # Start backend
    if [ -f "backend/server.js" ]; then
        print_status "Starting backend server..."
        cd backend
        
        # Kill any existing backend process
        if [ -f "../.backend.pid" ]; then
            OLD_PID=$(cat ../.backend.pid)
            kill $OLD_PID 2>/dev/null || true
            rm ../.backend.pid
        fi
        
        if command_exists nodemon; then
            nohup npm run dev > ../logs/backend.log 2>&1 &
        else
            nohup npm start > ../logs/backend.log 2>&1 &
        fi
        BACKEND_PID=$!
        cd ..
        echo $BACKEND_PID > .backend.pid
        print_success "Backend started (PID: $BACKEND_PID) ✓"
        
        # Wait for backend to start
        print_status "Waiting for backend to initialize..."
        sleep 8
    else
        print_error "backend/server.js not found"
        exit 1
    fi
    
    # Start frontend
    if [ -f "frontend/package.json" ]; then
        print_status "Starting frontend server..."
        cd frontend
        
        # Kill any existing frontend process
        if [ -f "../.frontend.pid" ]; then
            OLD_PID=$(cat ../.frontend.pid)
            kill $OLD_PID 2>/dev/null || true
            rm ../.frontend.pid
        fi
        
        # Set environment for React
        export BROWSER=none
        export REACT_APP_API_URL=http://localhost:5000/api
        export REACT_APP_WS_URL=http://localhost:5000
        
        nohup npm start > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ..
        echo $FRONTEND_PID > .frontend.pid
        print_success "Frontend started (PID: $FRONTEND_PID) ✓"
    else
        print_error "frontend/package.json not found"
        exit 1
    fi
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check backend health
    for i in {1..15}; do
        if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
            print_success "Backend health check passed ✓"
            BACKEND_HEALTHY=true
            break
        else
            if [ $i -eq 15 ]; then
                print_error "Backend health check failed after 15 attempts"
                print_error "Check logs: tail -f logs/backend.log"
                return 1
            fi
            print_status "Backend health check attempt $i/15..."
            sleep 2
        fi
    done
    
    # Check frontend (less strict)
    for i in {1..10}; do
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Frontend health check passed ✓"
            break
        else
            if [ $i -eq 10 ]; then
                print_warning "Frontend may still be starting..."
                break
            fi
            sleep 2
        fi
    done
}

# Show final status
show_status() {
    echo ""
    print_success "🎉 CSE Stock Analyzer started successfully!"
    echo ""
    echo -e "${CYAN}🌐 Application URLs:${NC}"
    echo -e "   Frontend:    ${GREEN}http://localhost:3000${NC}"
    echo -e "   Backend API: ${GREEN}http://localhost:5000/api${NC}"
    echo -e "   Health:      ${GREEN}http://localhost:5000/api/health${NC}"
    echo ""
    echo -e "${CYAN}📊 Features available:${NC}"
    echo -e "   ${GREEN}✓${NC} Real-time stock data"
    echo -e "   ${GREEN}✓${NC} Interactive charts"
    echo -e "   ${GREEN}✓${NC} Sector analysis"
    echo -e "   ${GREEN}✓${NC} Market overview"
    echo -e "   ${GREEN}✓${NC} WebSocket updates"
    echo -e "   ${GREEN}✓${NC} Search and filtering"
    echo ""
    echo -e "${CYAN}📝 Logs location:${NC}"
    echo -e "   Backend:  ${YELLOW}logs/backend.log${NC}"
    echo -e "   Frontend: ${YELLOW}logs/frontend.log${NC}"
    echo ""
    echo -e "${CYAN}🛠️ Useful commands:${NC}"
    echo -e "   View backend logs:  ${YELLOW}tail -f logs/backend.log${NC}"
    echo -e "   View frontend logs: ${YELLOW}tail -f logs/frontend.log${NC}"
    echo -e "   Stop servers:       ${YELLOW}./start.sh stop${NC}"
    echo -e "   Restart:            ${YELLOW}./start.sh restart${NC}"
    echo ""
    echo -e "${GREEN}🚀 Happy trading! 📈${NC}"
    echo ""
}

# Stop servers
stop_servers() {
    print_status "Stopping servers..."
    
    # Stop backend
    if [ -f ".backend.pid" ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill $BACKEND_PID 2>/dev/null; then
            print_success "Backend stopped (PID: $BACKEND_PID) ✓"
        fi
        rm .backend.pid
    fi
    
    # Stop frontend
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend stopped (PID: $FRONTEND_PID) ✓"
        fi
        rm .frontend.pid
    fi
    
    # Stop Docker services (optional)
    if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ] && [ -f "docker-compose.yml" ]; then
        docker-compose down 2>/dev/null || true
        print_success "Docker services stopped ✓"
    fi
    
    print_success "All servers stopped successfully"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start         Start the application (default)"
    echo "  stop          Stop all servers"
    echo "  restart       Restart the application"
    echo "  status        Show application status"
    echo "  logs          Show application logs"
    echo "  clean         Clean temporary files and logs"
    echo "  install       Install/update dependencies"
    echo "  health        Check application health"
    echo "  help          Show this help"
    echo ""
    echo "Options:"
    echo "  --force       Force restart even if already running"
    echo "  --no-docker   Skip Docker services"
    echo "  --verbose     Show detailed output"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start application"
    echo "  $0 start --no-docker  # Start without Docker"
    echo "  $0 logs               # View logs"
    echo "  $0 restart --force    # Force restart"
}

# Show logs
show_logs() {
    echo -e "${CYAN}=== Recent Backend Logs ===${NC}"
    if [ -f "logs/backend.log" ]; then
        tail -n 30 logs/backend.log
    else
        echo "No backend logs found"
    fi
    
    echo ""
    echo -e "${CYAN}=== Recent Frontend Logs ===${NC}"
    if [ -f "logs/frontend.log" ]; then
        tail -n 30 logs/frontend.log
    else
        echo "No frontend logs found"
    fi
}

# Clean temporary files
clean_temp() {
    print_status "Cleaning temporary files..."
    
    # Remove logs
    rm -rf logs/*.log
    
    # Remove temp files
    rm -rf temp/*
    
    # Remove PID files
    rm -f .*.pid
    
    # Remove node_modules if requested
    if [ "$1" = "--full" ]; then
        print_status "Removing node_modules..."
        rm -rf node_modules backend/node_modules frontend/node_modules
    fi
    
    print_success "Cleanup completed ✓"
}

# Check application status
check_status() {
    echo -e "${CYAN}=== Application Status ===${NC}"
    
    # Check if processes are running
    if [ -f ".backend.pid" ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_success "Backend running (PID: $BACKEND_PID)"
        else
            print_error "Backend PID file exists but process not running"
            rm .backend.pid
        fi
    else
        print_warning "Backend not running"
    fi
    
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend running (PID: $FRONTEND_PID)"
        else
            print_error "Frontend PID file exists but process not running"
            rm .frontend.pid
        fi
    else
        print_warning "Frontend not running"
    fi
    
    # Check port availability
    echo ""
    echo -e "${CYAN}=== Port Status ===${NC}"
    for port in "${REQUIRED_PORTS[@]}"; do
        if command_exists lsof && lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "Port $port is in use"
        else
            print_warning "Port $port is available"
        fi
    done
    
    # Check URLs
    echo ""
    echo -e "${CYAN}=== Health Check ===${NC}"
    if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
        print_success "Backend API responding"
    else
        print_error "Backend API not responding"
    fi
    
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend responding"
    else
        print_error "Frontend not responding"
    fi
}

# Install/update dependencies
install_deps() {
    print_status "Installing/updating dependencies..."
    
    # Update root
    if [ -f "package.json" ]; then
        npm install
    fi
    
    # Update backend
    if [ -d "backend" ]; then
        cd backend && npm install && cd ..
    fi
    
    # Update frontend
    if [ -d "frontend" ]; then
        cd frontend && npm install && cd ..
    fi
    
    print_success "Dependencies updated ✓"
}

# Main function
main() {
    print_banner
    
    # Parse command line arguments
    COMMAND="${1:-start}"
    FORCE_FLAG=""
    NO_DOCKER_FLAG=""
    VERBOSE_FLAG=""
    
    case "${1:-start}" in
        "start")
            # Parse options
            shift
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --force)
                        FORCE_FLAG="--force"
                        shift
                        ;;
                    --no-docker)
                        NO_DOCKER_FLAG="--no-docker"
                        DOCKER_AVAILABLE=false
                        shift
                        ;;
                    --verbose)
                        VERBOSE_FLAG="--verbose"
                        set -x
                        shift
                        ;;
                    *)
                        print_error "Unknown option: $1"
                        show_usage
                        exit 1
                        ;;
                esac
            done
            
            # Check if already running
            if [ -f ".backend.pid" ] || [ -f ".frontend.pid" ]; then
                if [ "$FORCE_FLAG" != "--force" ]; then
                    print_warning "Application appears to be running. Use --force to restart"
                    check_status
                    exit 0
                else
                    print_status "Force flag detected, stopping existing processes..."
                    stop_servers
                    sleep 2
                fi
            fi
            
            check_requirements
            check_ports
            setup_environment
            install_dependencies
            
            if [ "$NO_DOCKER_FLAG" != "--no-docker" ]; then
                if start_with_docker; then
                    print_success "Using Docker for additional services"
                else
                    print_warning "Running without Docker services"
                fi
            else
                print_status "Skipping Docker services (--no-docker flag)"
            fi
            
            start_dev_servers
            health_check
            show_status
            ;;
        "stop")
            stop_servers
            ;;
        "restart")
            stop_servers
            sleep 2
            main start
            ;;
        "status")
            check_status
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            stop_servers
            clean_temp "$2"
            ;;
        "install")
            install_deps
            ;;
        "health")
            health_check
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Handle script interruption
trap 'echo ""; print_warning "Script interrupted"; stop_servers; exit 1' INT TERM

# Change to script directory
cd "$(dirname "$0")"

# Run main function
main "$@"
