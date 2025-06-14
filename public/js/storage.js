class StorageManager {
    constructor() {
        this.storageKey = 'walletAnalyzer';
        this.maxHistoryItems = 10;
    }

    // Save analysis to history
    saveAnalysis(data) {
        try {
            const history = this.getAnalysisHistory();
            const analysisData = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                network: data.network,
                walletCount: data.walletCount,
                tokenCount: data.tokenCount,
                results: {
                    allTokens: data.results.allTokens.length,
                    someTokens: data.results.someTokens.length,
                    noTokens: data.results.noTokens.length
                }
            };

            history.unshift(analysisData);
            
            // Keep only the most recent items
            if (history.length > this.maxHistoryItems) {
                history.splice(this.maxHistoryItems);
            }

            this.setItem('analysisHistory', history);
            console.log('Analysis saved to history');
        } catch (error) {
            console.error('Failed to save analysis:', error);
        }
    }

    // Get analysis history
    getAnalysisHistory() {
        return this.getItem('analysisHistory', []);
    }

    // Save user preferences
    savePreferences(preferences) {
        try {
            const current = this.getPreferences();
            const updated = { ...current, ...preferences };
            this.setItem('preferences', updated);
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }

    // Get user preferences
    getPreferences() {
        return this.getItem('preferences', {
            selectedNetwork: 'ethereum',
            debugVisible: true,
            theme: 'dark'
        });
    }

    // Save input values
    saveInputs(wallets, tokens) {
        try {
            this.setItem('lastInputs', {
                wallets: wallets,
                tokens: tokens,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to save inputs:', error);
        }
    }

    // Get saved inputs
    getSavedInputs() {
        const saved = this.getItem('lastInputs', null);
        
        // Only return inputs saved in the last 24 hours
        if (saved && (Date.now() - saved.timestamp) < 24 * 60 * 60 * 1000) {
            return {
                wallets: saved.wallets,
                tokens: saved.tokens
            };
        }
        
        return null;
    }

    // Generic storage methods
    setItem(key, value) {
        try {
            const data = this.getStorageData();
            data[key] = value;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('LocalStorage write error:', error);
        }
    }

    getItem(key, defaultValue = null) {
        try {
            const data = this.getStorageData();
            return data[key] !== undefined ? data[key] : defaultValue;
        } catch (error) {
            console.error('LocalStorage read error:', error);
            return defaultValue;
        }
    }

    getStorageData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('LocalStorage parse error:', error);
            return {};
        }
    }

    // Clear all data
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('All storage data cleared');
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }

    // Get storage usage info
    getStorageInfo() {
        try {
            const data = JSON.stringify(this.getStorageData());
            return {
                size: new Blob([data]).size,
                sizeFormatted: this.formatBytes(new Blob([data]).size),
                itemCount: Object.keys(this.getStorageData()).length
            };
        } catch (error) {
            return { size: 0, sizeFormatted: '0 B', itemCount: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Global storage instance
window.storage = new StorageManager();
