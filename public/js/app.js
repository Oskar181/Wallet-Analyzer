class WalletAnalyzer {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
                return;
            }

            // Check API health
            await this.checkApiHealth();
            
            // Initialize application
            this.setupGlobalErrorHandling();
            this.logStartup();
            
            this.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize Wallet Analyzer:', error);
            this.handleInitializationError(error);
        }
    }

    async checkApiHealth() {
        try {
            const health = await window.api.getHealth();
            console.log('API Health Check:', health);
            
            if (window.ui) {
                window.ui.addDebugLog('success', `API health check passed (${health.env})`);
            }
        } catch (error) {
            console.warn('API health check failed:', error);
            
            if (window.ui) {
                window.ui.addDebugLog('warning', 'API health check failed - some features may not work');
            }
        }
    }

    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            if (window.ui) {
                window.ui.addDebugLog('error', `Uncaught error: ${event.error.message}`);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            if (window.ui) {
                window.ui.addDebugLog('error', `Unhandled promise rejection: ${event.reason}`);
            }
        });
    }

    logStartup() {
        if (window.ui) {
            window.ui.addDebugLog('success', `Wallet Analyzer v${this.version} initialized`);
            window.ui.addDebugLog('info', `Environment: ${this.getEnvironment()}`);
            window.ui.addDebugLog('info', `User Agent: ${navigator.userAgent.split(' ')[0]}`);
            
            // Log storage info
            const storageInfo = window.storage.getStorageInfo();
            window.ui.addDebugLog('info', `Storage: ${storageInfo.sizeFormatted} (${storageInfo.itemCount} items)`);
        }
    }

    getEnvironment() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        }
        return 'production';
    }

    handleInitializationError(error) {
        // Show basic error message if UI is not available
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #0f0f0f;
                color: #ef4444;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <h1>⚠️ Initialization Error</h1>
                    <p>Failed to start Wallet Analyzer</p>
                    <pre style="color: #a3a3a3; font-size: 12px;">${error.message}</pre>
                    <button onclick="window.location.reload()" style="
                        background: #10b981;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        🔄 Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    // Public methods for debugging
    getVersion() {
        return this.version;
    }

    getStatus() {
        return {
            initialized: this.initialized,
            version: this.version,
            environment: this.getEnvironment(),
            apiHealthy: window.api && !window.api.isCurrentlyAnalyzing(),
            storageInfo: window.storage.getStorageInfo()
        };
    }

    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            version: this.version,
            environment: this.getEnvironment(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            localStorage: {
                available: typeof(Storage) !== "undefined",
                quota: this.getStorageQuota()
            },
            api: {
                baseUrl: window.api.baseUrl,
                analyzing: window.api.isCurrentlyAnalyzing()
            },
            storage: window.storage.getStorageInfo(),
            preferences: window.storage.getPreferences(),
            analysisHistory: window.storage.getAnalysisHistory().length
        };

        try {
            diagnostics.api.health = await window.api.getHealth();
        } catch (error) {
            diagnostics.api.error = error.message;
        }

        console.log('Wallet Analyzer Diagnostics:', diagnostics);
        
        if (window.ui) {
            window.ui.addDebugLog('info', 'Diagnostics completed - check browser console');
        }

        return diagnostics;
    }

    getStorageQuota() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return 'Available';
        } catch (error) {
            return 'Unavailable';
        }
    }
}

// Initialize the application
window.walletAnalyzer = new WalletAnalyzer();

// Expose utilities for debugging
window.debug = {
    getStatus: () => window.walletAnalyzer.getStatus(),
    runDiagnostics: () => window.walletAnalyzer.runDiagnostics(),
    clearStorage: () => window.storage.clearAll(),
    getStorageInfo: () => window.storage.getStorageInfo(),
    simulateError: () => { throw new Error('Simulated error for testing'); }
};
