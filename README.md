# 🔍 Wallet Analyzer

> Privacy-first crypto portfolio scanner. Check if whales have your tokens!

![Wallet Analyzer Screenshot](https://via.placeholder.com/800x400/0f0f0f/10b981?text=Wallet+Analyzer)

## ✨ Features

### 🎯 **Core Functionality**
- **Multi-Wallet Analysis**: Analyze up to 50 wallets simultaneously
- **Token Detection**: Search for up to 20 ERC-20 tokens per analysis
- **Multi-Chain Support**: Ethereum Mainnet & Base Mainnet
- **Real-time Pricing**: USD values via DexScreener API
- **Smart Categorization**: ALL/SOME/NO token matches

### 🛡️ **Privacy & Security**
- **localStorage Only**: No server-side data storage
- **No Tracking**: Zero analytics or tracking scripts
- **Client-Side Processing**: Sensitive data stays in browser
- **Rate Limited**: Protection against API abuse

### 🎨 **User Experience**
- **Dark Theme**: Professional crypto-native design
- **Real-time Logs**: Debug console with live updates
- **Mobile Responsive**: Works on all devices
- **Keyboard Shortcuts**: Power user features

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Etherscan API Key** ([Get Free Key](https://etherscan.io/apis))

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd wallet-analyzer
   chmod +x install.sh
   ./install.sh
   ```

2. **Configure API Keys**
   ```bash
   # Edit .env file
   nano .env
   
   # Add your API keys:
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY_HERE
   BASESCAN_API_KEY=YOUR_BASESCAN_KEY_HERE  # Optional
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   ```
   http://localhost:3000
   ```

## 📖 Usage Guide

### Basic Workflow

1. **Select Network**: Choose Ethereum or Base from dropdown
2. **Add Wallets**: Paste wallet addresses (one per line)
3. **Add Tokens**: Paste token contract addresses (one per line)
4. **Analyze**: Click "Analyze Wallets" button
5. **Review Results**: See categorized results with USD values

### Example Inputs

**Popular Wallet Addresses:**
```
0x742d35Cc6634C0532925a3b8D2645Ff9b5B4b6bE
0x8ba1f109551bD432803012645Hac136c5F7eB4B5B
0x1234567890123456789012345678901234567890
```

**Popular Token Addresses (Ethereum):**
```
0xdAC17F958D2ee523a2206206994597C13D831ec7  # USDT
0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4CE  # SHIB
0x2260fac5e5542a773aa44fbcfedf7c193bc2c599  # WBTC
```

### Keyboard Shortcuts
- `Ctrl + Enter`: Start analysis
- `F12`: Open browser dev tools for advanced debugging

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ETHERSCAN_API_KEY` | Etherscan API key | ✅ | - |
| `BASESCAN_API_KEY` | Basescan API key | ❌ | Uses Etherscan key |
| `NODE_ENV` | Environment | ❌ | development |
| `PORT` | Server port | ❌ | 3000 |
| `RATE_LIMIT_WINDOW` | Rate limit window (min) | ❌ | 15 |
| `RATE_LIMIT_MAX` | Max requests per window | ❌ | 100 |

### Network Support

| Network | Status | API | Explorer |
|---------|--------|-----|----------|
| Ethereum Mainnet | ✅ | Etherscan | etherscan.io |
| Base Mainnet | ✅ | Basescan | basescan.org |

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vanilla JavaScript, Modern CSS
- **Backend**: Node.js, Express.js
- **APIs**: Etherscan, Basescan, DexScreener
- **Storage**: localStorage (client-side only)
- **Hosting**: Render.com (recommended)

### Project Structure
```
wallet-analyzer/
├── server.js              # Express server
├── routes/
│   └── analyze.js          # API routes
├── services/
│   ├── etherscan.js        # Blockchain service
│   └── dexscreener.js      # Price service
├── utils/
│   └── helpers.js          # Utility functions
├── public/
│   ├── index.html          # Main HTML
│   ├── css/main.css        # Styles
│   └── js/                 # Frontend JavaScript
│       ├── app.js          # Main app logic
│       ├── ui.js           # UI management
│       ├── api.js          # API communication
│       └── storage.js      # localStorage wrapper
├── package.json
├── .env                    # Environment config
└── README.md
```

## 🚀 Deployment

### Render.com (Recommended)

1. **Connect Repository**
   - Fork this repo to your GitHub
   - Connect Render to your GitHub account

2. **Create Web Service**
   - Select your repository
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**
   ```
   ETHERSCAN_API_KEY=your_etherscan_key
   BASESCAN_API_KEY=your_basescan_key
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be live at: `https://your-app.onrender.com`

### Local Production

```bash
# Build and start production server
NODE_ENV=production npm start
```

## 🔍 API Reference

### POST /api/analyze
Analyze wallets for specific tokens.

**Request Body:**
```json
{
  "wallets": ["0x742d35C...", "0x8ba1f10..."],
  "tokens": ["0xdAC17F9...", "0x95aD61b..."],
  "network": "ethereum"
}
```

**Response:**
```json
{
  "success": true,
  "network": "ethereum",
  "analysis": {
    "walletCount": 2,
    "tokenCount": 2
  },
  "results": {
    "allTokens": [...],
    "someTokens": [...],
    "noTokens": [...]
  }
}
```

### POST /api/validate
Validate Ethereum addresses.

**Request Body:**
```json
{
  "addresses": ["0x742d35C...", "invalid_address"]
}
```

**Response:**
```json
{
  "success": true,
  "valid": ["0x742d35c..."],
  "invalid": ["invalid_address"],
  "summary": {
    "total": 2,
    "validCount": 1,
    "invalidCount": 1
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-XX...",
  "env": "production"
}
```

## 🛠️ Development

### Scripts

```bash
# Development server with auto-reload
npm run dev

# Production server
npm start

# Install dependencies
npm install

# Run automated setup
./install.sh
```

### Debug Features

**Browser Console Commands:**
```javascript
// Get application status
debug.getStatus()

// Run full diagnostics
debug.runDiagnostics()

// Clear all localStorage data
debug.clearStorage()

// Get storage information
debug.getStorageInfo()

// Simulate error for testing
debug.simulateError()
```

### Adding New Features

1. **New API Endpoint**
   - Add route in `routes/analyze.js`
   - Add service logic in `services/`
   - Update frontend in `public/js/api.js`

2. **New UI Component**
   - Add HTML structure in `index.html`
   - Add styles in `css/main.css`
   - Add logic in `js/ui.js`

3. **New Network Support**
   - Update `NETWORK_CONFIGS` in `services/etherscan.js`
   - Add network option in frontend selector
   - Test with network-specific API endpoints

## 🔒 Security

### Best Practices Implemented
- **Environment Variables**: API keys stored securely
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Server and client-side validation
- **CORS Protection**: Configured for production domains
- **Helmet.js**: Security headers
- **No Data Persistence**: No sensitive data stored server-side

### Privacy Features
- **localStorage Only**: All data stays in browser
- **No Analytics**: Zero tracking scripts
- **No Cookies**: No cookie banner needed
- **Open Source**: Fully auditable code

## ❗ Troubleshooting

### Common Issues

**"Missing API Key" Error**
```bash
# Solution: Add API key to .env file
echo "ETHERSCAN_API_KEY=your_key_here" >> .env
```

**"Rate Limit Exceeded" Error**
```bash
# Solution: Wait 5 minutes or use different API key
# Free tier: 5 calls/second, 100,000 calls/day
```

**"Network Error" Messages**
```bash
# Solution: Check internet connection and API status
curl https://api.etherscan.io/api?module=stats&action=ethsupply&apikey=YourApiKeyToken
```

**Port Already in Use**
```bash
# Solution: Change port in .env file
echo "PORT=3001" >> .env
```

### Debug Steps

1. **Check Browser Console**: F12 → Console tab
2. **Review Debug Logs**: Click "Show" in debug console
3. **Run Diagnostics**: Type `debug.runDiagnostics()` in console
4. **Verify API Keys**: Check .env file exists and has valid keys
5. **Test Manually**: Use curl to test API endpoints directly

## 📊 Performance

### Optimization Features
- **Rate Limiting**: Prevents API overuse
- **Client-side Caching**: localStorage for recent results
- **Lazy Loading**: Progressive result display
- **Efficient APIs**: Minimal blockchain calls
- **Compressed Assets**: Optimized CSS/JS

### Benchmarks
- **Analysis Speed**: ~2-5 seconds per wallet (depends on token count)
- **Memory Usage**: <10MB typical usage
- **Bundle Size**: <500KB total assets
- **API Calls**: ~3-5 calls per token per wallet

## 🤝 Contributing

### Development Setup
```bash
git clone <repo-url>
cd wallet-analyzer
./install.sh
npm run dev
```

### Code Style
- **JavaScript**: ES6+ features
- **CSS**: CSS Custom Properties (variables)
- **HTML**: Semantic HTML5
- **Comments**: JSDoc style for functions

### Pull Request Process
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Changelog

### v1.0.0 (2025-01-XX)
- ✨ Initial release
- 🔷 Ethereum Mainnet support
- 🔵 Base Mainnet support
- 💰 USD pricing integration
- 🎨 Dark theme UI
- 📱 Mobile responsive design
- 🛡️ Privacy-first architecture

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Etherscan**: Blockchain data API
- **Basescan**: Base network data API  
- **DexScreener**: Real-time token pricing
- **Render.com**: Hosting platform
- **Community**: Beta testers and feedback

---

**Built with ❤️ for the crypto community**

*Wallet Analyzer - Scan Wallet! Check if all the whales you track have your token!*
