class ApiManager {
    constructor() {
        this.baseUrl = '/api';
        this.isAnalyzing = false;
    }

    async makeRequest(endpoint, options = {}) {
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
            throw error;
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
                    onProgress(randomProgress, 'Analyzing blockchain data...');
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
        return this.makeRequest('/health', { method: 'GET' });
    }

    isCurrentlyAnalyzing() {
        return this.isAnalyzing;
    }
}

// Global API instance
window.api = new ApiManager();
