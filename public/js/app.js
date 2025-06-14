class WalletAnalyzer {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.demoMode = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
                return;
            }

            // Wait for UI to be ready
            await this.waitForUI();

            // Check API health with timeout
            await this.checkApiHealthWithTimeout();
            
            // Initialize application
            this.setupGlobalErrorHandling();
            this.logStartup();
            
            this.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize Wallet Analyzer:', error);
            this.handleInitializationError(error);
        }
    }

    async waitForUI() {
        // Wait for UI manager to be available
        let attempts = 0;
        while (!window.ui && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.ui) {
            throw new Error('UI Manager failed to initialize');
        }
    }

    async checkApiHealthWithTimeout() {
        try {
            // Set timeout for health check
            const healthPromise = window.api.getHealth();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Health check timeout')), 5000)
            );

            const health = await Promise.race([healthPromise, timeoutPromise]);
            
            if (health.status === 'MOCK') {
                this.demoMode = true;
                if (window.ui) {
                    window.ui.addDebugLog('warning', 'Running in DEMO MODE - backend not available');
                    window.ui.addDebugLog('info', 'You can still test the interface with mock data');
                }
            } else {
                if (window.ui) {
                    window.ui.addDebugLog('success', `API health check passed (${health.env || 'unknown'})`);
                }
            }
        } catch (error) {
            this.demoMode = true;
            console.warn('API health check failed:', error);
            
            if (window.ui) {
                window.ui.addDebugLog('warning', 'API server not reachable');
                window.ui.addDebugLog('info', 'Demo mode activated - you can test the interface');
                window.ui.addDebugLog('error', `Health check error: ${error.message}`);
            }
        }
    }

    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            // Ignore wallet extension errors
            if (event.error && (
                event.error.message.includes('ethereum') ||
                event.error.message.includes('TronLink') ||
                event.error.message.includes('evmAsk')
            )) {
                return;
            }
            
            console.error('Global error:', event.error);
            
            if (window.ui) {
                window.ui.addDebugLog('error', `Application error: ${event.error.message}`);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            if (window.ui) {
                window.ui.addDebugLog('error', `Promise rejection: ${event.reason}`);
            }
        });
    }

    logStartup() {
        if (window.ui) {
            window.ui.addDebugLog('success', `🔍 Wallet Analyzer v${this.version} initialized`);
            window.ui.addDebugLog('info', `Environment: ${this.getEnvironment()}`);
            
            if (this.demoMode) {
                window.ui.addDebugLog('warning', '🎭 DEMO MODE: Using mock data for testing');
                window.ui.addDebugLog('info', '💡 To use real data, ensure backend server is running');
            }
            
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
                    <details style="margin: 20px 0; text-align: left;">
                        <summary style="cursor: pointer; color: #10b981;">Show Error Details</summary>
                        <pre style="color: #a3a3a3; font-size: 12px; margin-top: 10px;">${error.message}</pre>
                    </details>
                    <div style="margin-top: 20px;">
                        <button onclick="window.location.reload()" style="
                            background: #10b981;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            margin: 5px;
                        ">
                            🔄 Reload Page
                        </button>
                        <button onclick="window.location.href='/?demo=1'" style="
                            background: #f59e0b;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            margin: 5px;
                        ">
                            🎭 Try Demo Mode
                        </button>
                    </div>
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
            demoMode: this.demoMode,
            version: this.version,
            environment: this.getEnvironment(),
            apiHealthy: window.api && window.api.isApiHealthy(),
            storageInfo: window.storage.getStorageInfo()
        };
    }

    isDemoMode() {
        return this.demoMode;
    }
}

// Initialize the application
window.walletAnalyzer = new WalletAnalyzer();

// Enhanced debug utilities
window.debug = {
    getStatus: () => window.walletAnalyzer.getStatus(),
    runDiagnostics: () => window.walletAnalyzer.runDiagnostics(),
    clearStorage: () => window.storage.clearAll(),
    getStorageInfo: () => window.storage.getStorageInfo(),
    toggleDemoMode: () => {
        if (window.api) {
            window.api.healthCheckPassed = !window.api.healthCheckPassed;
            console.log('Demo mode toggled:', !window.api.healthCheckPassed ? 'ON' : 'OFF');
        }
    },
    testMockData: () => {
        if (window.api) {
            return window.api.getMockAnalysisData();
        }
    }
};
