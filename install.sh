#!/bin/bash

# Wallet Analyzer - Automated Installation Script
# This script sets up the complete development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=========================================="
echo "🔍 Wallet Analyzer Setup"
echo "Version: 1.0.0"
echo "=========================================="
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node --version)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚙️ Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️ Please edit .env file and add your API keys:${NC}"
    echo "   - ETHERSCAN_API_KEY (required)"
    echo "   - BASESCAN_API_KEY (optional)"
fi

# Create necessary directories
mkdir -p logs
mkdir -p temp

echo -e "${GREEN}✅ Installation completed!${NC}"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "1. Edit .env file and add your Etherscan API key"
echo "2. Run: npm run dev (for development)"
echo "3. Run: npm start (for production)"
echo "4. Open: http://localhost:3000"
echo ""
echo -e "${YELLOW}📖 Documentation: README.md${NC}"
