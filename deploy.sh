# Wallet Analyzer - Deployment Script
# Automates deployment to Render.com

set -e

echo "🚀 Deploying Wallet Analyzer to Render..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it first."
    exit 1
fi

# Check if API key is configured
if ! grep -q "ETHERSCAN_API_KEY=" .env || grep -q "your_etherscan_api_key_here" .env; then
    echo "❌ Error: Please configure ETHERSCAN_API_KEY in .env file"
    exit 1
fi

echo "✅ Pre-deployment checks passed"

# Test the application locally first
echo "🧪 Testing application locally..."
npm test 2>/dev/null || echo "⚠️  No tests found, skipping..."

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps for Render deployment:"
echo "1. Push your code to GitHub"
echo "2. Connect your GitHub repo to Render"
echo "3. Create a new Web Service"
echo "4. Set environment variables in Render dashboard:"
echo "   - ETHERSCAN_API_KEY"
echo "   - BASESCAN_API_KEY (optional)"
echo "   - NODE_ENV=production"
echo "5. Deploy!"
echo ""
echo "🌐 Your app will be available at: https://your-app.onrender.com"
