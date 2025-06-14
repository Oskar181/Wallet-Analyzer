class ApiManager {
    constructor() {
        // Automatyczna detekcja base URL
        this.baseUrl = this.detectBaseUrl();
        this.isAnalyzing = false;
        this.healthCheckPassed = false;
        
        // Sprawdź API przy inicjalizacji
        this.initializeConnection();
    }

    detectBaseUrl() {
        // Jeśli jesteśmy w development (localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/api';
        }
        
        // Jeśli jesteśmy na Render lub innym hoście
        return '/api';
    }

    async initializeConnection() {
        try {
            await this.checkConnection();
            this.healthCheckPassed = true;
            console.log('✅ API connection established');
        } catch (error) {
            this.healthCheckPassed = false;
            console.warn('⚠️ API connection failed, running in demo mode');
            this.showApiConnectionError();
        }
    }

    async checkConnection() {
        const response = await fetch('/health', {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        
        return await response.json();
    }

    showApiConnectionError() {
        // Pokaż użytkownikowi że API nie działa
        if (window.ui) {
            window.ui.addDebugLog('warning', 'API server not available - check if backend is running');
            window.ui.addDebugLog('info', 'Running in demo mode with mock data');
        }
    }

    async makeRequest(endpoint, options = {}) {
        // Jeśli API nie działa, użyj mock data
        if (!this.healthCheckPassed && endpoint.includes('/analyze')) {
            console.warn('API not available, returning mock data');
            return this.getMockAnalysisData();
        }

        if (!this.healthCheckPassed && endpoint.includes('/validate')) {
            console.warn('API not available, returning mock validation');
            return this.getMockValidationData(options.body);
        }

        try {
            const url = `${this.baseUrl}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            
            // Fallback to mock data for certain endpoints
            if (endpoint.includes('/analyze')) {
                console.warn('Falling back to mock analysis data');
                return this.getMockAnalysisData();
            }
            
            throw error;
        }
    }

    // Mock data dla testowania gdy API nie działa
    getMockAnalysisData() {
        return {
            success: true,
            network: 'ethereum',
            analysis: {
                walletCount: 3,
                tokenCount: 2
            },
            results: {
                allTokens: [
                    {
                        walletAddress: '0x742d35Cc6634C0532925a3b8D2645Ff9b5B4b6bE',
                        foundTokens: [
                            {
                                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                                symbol: 'USDT',
                                name: 'Tether USD',
                                balance: '1,245.67',
                                decimals: 6,
                                priceUsd: 1.0,
                                priceChange24h: 0.01,
                                usdValue: 1245.67
                            },
                            {
                                address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4CE',
                                symbol: 'SHIB',
                                name: 'SHIBA INU',
                                balance: '15,678,912.34',
                                decimals: 18,
                                priceUsd: 0.000027,
                                priceChange24h: -2.45,
                                usdValue: 423.33
                            }
                        ],
                        totalUsdValue: 1669.0
                    }
                ],
                someTokens: [
                    {
                        walletAddress: '0x8ba1f109551bD432803012645Hac136c5F7eB4B5B',
                        foundTokens: [
                            {
                                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                                symbol: 'USDT',
                                name: 'Tether USD',
                                balance: '500.00',
                                decimals: 6,
                                priceUsd: 1.0,
                                priceChange24h: 0.01,
                                usdValue: 500.0
                            }
                        ],
                        totalUsdValue: 500.0
                    }
                ],
                noTokens: [
                    {
                        walletAddress: '0x1234567890123456789012345678901234567890',
                        foundTokens: [],
                        totalUsdValue: 0
                    }
                ]
            }
        };
    }

    getMockValidationData(requestBody) {
        try {
            const data = JSON.parse(requestBody);
            const addresses = data.addresses || [];
            
            // Prosta walidacja - sprawdź format 0x...
            const valid = addresses.filter(addr => /^0x[a-fA-F0-9]{40}$/.test(addr));
            const invalid = addresses.filter(addr => !/^0x[a-fA-F0-9]{40}$/.test(addr));
            
            return {
                success: true,
                valid: valid,
                invalid: invalid,
                summary: {
                    total: addresses.length,
                    validCount: valid.length,
                    invalidCount: invalid.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Invalid request format'
            };
        }
    }

    async validateAddresses(addresses) {
        return this.makeRequest('/validate', {
            method: 'POST',
            body: JSON.stringify({ addresses })
        });
    }

    async analyzeWallets(wallets, tokens, network = 'ethereum', onProgress = null) {
        if (this.isAnalyzing) {
            throw new Error('Analysis already in progress');
        }

        this.isAnalyzing = true;

        try {
            // Simulate progress updates during API call
            if (onProgress) {
                onProgress(0, 'Initializing analysis...');
                
                // Simulate intermediate progress
                const progressInterval = setInterval(() => {
                    const randomProgress = Math.min(90, Math.random() * 80 + 10);
                    onProgress(randomProgress, `Analyzing ${network} blockchain data...`);
                }, 2000);

                const result = await this.makeRequest('/analyze', {
                    method: 'POST',
                    body: JSON.stringify({ wallets, tokens, network })
                });

                clearInterval(progressInterval);
                onProgress(100, 'Analysis complete!');
                
                return result;
            } else {
                return await this.makeRequest('/analyze', {
                    method: 'POST',
                    body: JSON.stringify({ wallets, tokens, network })
                });
            }
        } finally {
            this.isAnalyzing = false;
        }
    }

    async getHealth() {
        try {
            const response = await fetch('/health', { method: 'GET' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            // Fallback health data
            return {
                status: 'MOCK',
                timestamp: new Date().toISOString(),
                message: 'Running in demo mode - backend not available'
            };
        }
    }

    isCurrentlyAnalyzing() {
        return this.isAnalyzing;
    }

    isApiHealthy() {
        return this.healthCheckPassed;
    }
}

// Global API instance
window.api = new ApiManager();
