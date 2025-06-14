class UIManager {
    constructor() {
        this.currentResults = null;
        this.activeTab = 'all';
        this.debugVisible = true;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSavedState();
    }

    initializeElements() {
        // Input elements
        this.walletsInput = document.getElementById('walletsInput');
        this.tokensInput = document.getElementById('tokensInput');
        this.walletCounter = document.getElementById('walletCounter');
        this.tokenCounter = document.getElementById('tokenCounter');
        this.networkSelector = document.getElementById('networkSelector');

        // Control elements
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.validateBtn = document.getElementById('validateBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Loading elements
        this.loadingSection = document.getElementById('loadingSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.loadingMessage = document.getElementById('loadingMessage');

        // Debug elements
        this.debugConsole = document.getElementById('debugConsole');
        this.debugContent = document.getElementById('debugContent');
        this.debugToggle = document.getElementById('debugToggle');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.statsGrid = document.getElementById('statsGrid');
        this.resultsTabs = document.getElementById('resultsTabs');
        this.allResults = document.getElementById('allResults');
        this.someResults = document.getElementById('someResults');
        this.noneResults = document.getElementById('noneResults');

        // Error elements
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.retryBtn = document.getElementById('retryBtn');
    }

    setupEventListeners() {
        // Input listeners
        this.walletsInput.addEventListener('input', () => this.updateCounters());
        this.tokensInput.addEventListener('input', () => this.updateCounters());
        this.walletsInput.addEventListener('input', () => this.saveInputs());
        this.tokensInput.addEventListener('input', () => this.saveInputs());

        // Network selector
        this.networkSelector.addEventListener('change', () => this.onNetworkChange());

        // Control buttons
        this.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        this.validateBtn.addEventListener('click', () => this.validateAddresses());
        this.clearBtn.addEventListener('click', () => this.clearInputs());
        this.retryBtn.addEventListener('click', () => this.startAnalysis());

        // Debug toggle
        this.debugToggle.addEventListener('click', () => this.toggleDebug());

        // Tab listeners
        this.resultsTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                const category = e.target.dataset.category;
                if (category) {
                    this.switchTab(category);
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.startAnalysis();
            }
        });

        // Initialize debug log
        this.addDebugLog('info', 'UI Manager initialized');
        this.addDebugLog('success', 'Event listeners registered');
    }

    loadSavedState() {
        // Load preferences
        const prefs = window.storage.getPreferences();
        this.networkSelector.value = prefs.selectedNetwork;
        this.debugVisible = prefs.debugVisible;

        // Load saved inputs
        const savedInputs = window.storage.getSavedInputs();
        if (savedInputs) {
            this.walletsInput.value = savedInputs.wallets;
            this.tokensInput.value = savedInputs.tokens;
            this.addDebugLog('info', 'Restored previous session inputs');
        }

        this.updateCounters();
        this.updateDebugVisibility();
    }

    updateCounters() {
        const walletLines = this.parseAddressInput(this.walletsInput.value);
        const tokenLines = this.parseAddressInput(this.tokensInput.value);

        // Update wallet counter
        this.walletCounter.textContent = `${walletLines.length} / 50`;
        this.walletCounter.className = 'counter';
        if (walletLines.length > 50) {
            this.walletCounter.classList.add('error');
        } else if (walletLines.length > 40) {
            this.walletCounter.classList.add('warning');
        }

        // Update token counter
        this.tokenCounter.textContent = `${tokenLines.length} / 20`;
        this.tokenCounter.className = 'counter';
        if (tokenLines.length > 20) {
            this.tokenCounter.classList.add('error');
        } else if (tokenLines.length > 15) {
            this.tokenCounter.classList.add('warning');
        }

        // Update analyze button state
        const canAnalyze = walletLines.length > 0 && tokenLines.length > 0 && 
                          walletLines.length <= 50 && tokenLines.length <= 20 &&
                          !window.api.isCurrentlyAnalyzing();
        
        this.analyzeBtn.disabled = !canAnalyze;
    }

    parseAddressInput(input) {
        if (!input || typeof input !== 'string') return [];
        
        return input
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    onNetworkChange() {
        const network = this.networkSelector.value;
        window.storage.savePreferences({ selectedNetwork: network });
        this.addDebugLog('info', `Network changed to: ${network}`);
        
        // Clear results when switching networks
        if (this.currentResults) {
            this.hideResults();
            this.addDebugLog('warning', 'Previous results cleared due to network change');
        }
    }

    async startAnalysis() {
        if (window.api.isCurrentlyAnalyzing()) {
            this.addDebugLog('warning', 'Analysis already in progress');
            return;
        }

        try {
            // Parse inputs
            const wallets = this.parseAddressInput(this.walletsInput.value);
            const tokens = this.parseAddressInput(this.tokensInput.value);
            const network = this.networkSelector.value;

            // Validate inputs
            if (wallets.length === 0 || tokens.length === 0) {
                throw new Error('Please provide both wallet and token addresses');
            }

            if (wallets.length > 50 || tokens.length > 20) {
                throw new Error('Too many addresses (max 50 wallets, 20 tokens)');
            }

            this.addDebugLog('info', `Starting analysis: ${wallets.length} wallets, ${tokens.length} tokens on ${network}`);
            
            // Show loading state
            this.showLoading();
            this.hideResults();
            this.hideError();

            // Start analysis
            const result = await window.api.analyzeWallets(
                wallets, 
                tokens, 
                network,
                (progress, message) => this.updateProgress(progress, message)
            );

            this.addDebugLog('success', 'Analysis completed successfully');
            
            // Save to history
            window.storage.saveAnalysis({
                network,
                walletCount: wallets.length,
                tokenCount: tokens.length,
                results: result.results
            });

            // Display results
            this.displayResults(result);

        } catch (error) {
            this.addDebugLog('error', `Analysis failed: ${error.message}`);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async validateAddresses() {
        try {
            const wallets = this.parseAddressInput(this.walletsInput.value);
            const tokens = this.parseAddressInput(this.tokensInput.value);
            const allAddresses = [...wallets, ...tokens];

            if (allAddresses.length === 0) {
                throw new Error('No addresses to validate');
            }

            this.addDebugLog('info', `Validating ${allAddresses.length} addresses`);

            const result = await window.api.validateAddresses(allAddresses);
            
            this.addDebugLog('success', 
                `Validation complete: ${result.valid.length} valid, ${result.invalid.length} invalid`
            );

            if (result.invalid.length > 0) {
                this.addDebugLog('warning', `Invalid addresses: ${result.invalid.join(', ')}`);
                this.showError(`Found ${result.invalid.length} invalid addresses. Check debug console for details.`);
            } else {
                this.addDebugLog('success', 'All addresses are valid!');
            }

        } catch (error) {
            this.addDebugLog('error', `Validation failed: ${error.message}`);
            this.showError(error.message);
        }
    }

    clearInputs() {
        this.walletsInput.value = '';
        this.tokensInput.value = '';
        this.updateCounters();
        this.hideResults();
        this.hideError();
        this.addDebugLog('info', 'Inputs cleared');
        
        // Clear saved inputs
        window.storage.setItem('lastInputs', null);
    }

    saveInputs() {
        window.storage.saveInputs(this.walletsInput.value, this.tokensInput.value);
    }

    showLoading() {
        this.loadingSection.style.display = 'block';
        this.analyzeBtn.disabled = true;
        this.updateProgress(0, 'Initializing...');
    }

    hideLoading() {
        this.loadingSection.style.display = 'none';
        this.analyzeBtn.disabled = false;
    }

    updateProgress(percent, message) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
        this.loadingMessage.textContent = message;
    }

    displayResults(result) {
        this.currentResults = result.results;
        
        // Update stats
        this.updateStats(result.results);
        
        // Update tab counts
        this.updateTabCounts(result.results);
        
        // Populate results
        this.populateResults(result.results);
        
        // Show results section
        this.resultsSection.style.display = 'block';
        this.resultsSection.classList.add('fade-in');
        
        // Switch to first non-empty tab
        if (result.results.allTokens.length > 0) {
            this.switchTab('all');
        } else if (result.results.someTokens.length > 0) {
            this.switchTab('some');
        } else {
            this.switchTab('none');
        }
    }

    updateStats(results) {
        const allCount = results.allTokens.length;
        const someCount = results.someTokens.length;
        const noneCount = results.noTokens.length;

        this.statsGrid.innerHTML = `
            <div class="stat-card perfect">
                <div class="stat-icon">🎯</div>
                <div class="stat-number">${allCount}</div>
                <div class="stat-label">Perfect Match</div>
            </div>
            <div class="stat-card partial">
                <div class="stat-icon">⚡</div>
                <div class="stat-number">${someCount}</div>
                <div class="stat-label">Partial Match</div>
            </div>
            <div class="stat-card none">
                <div class="stat-icon">❌</div>
                <div class="stat-number">${noneCount}</div>
                <div class="stat-label">No Match</div>
            </div>
        `;
    }

    updateTabCounts(results) {
        document.getElementById('allCount').textContent = results.allTokens.length;
        document.getElementById('someCount').textContent = results.someTokens.length;
        document.getElementById('noneCount').textContent = results.noTokens.length;
    }

    populateResults(results) {
        this.populateCategory('allResults', results.allTokens, 'all');
        this.populateCategory('someResults', results.someTokens, 'some');
        this.populateCategory('noneResults', results.noTokens, 'none');
    }

    populateCategory(elementId, wallets, category) {
        const container = document.getElementById(elementId);
        
        if (wallets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${this.getCategoryIcon(category)}</div>
                    <h4>No wallets in this category</h4>
                    <p>Try analyzing with different tokens or wallet addresses.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = wallets.map(wallet => this.createWalletHtml(wallet, category)).join('');
        
        // Add event listeners for copy buttons
        container.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const address = e.target.dataset.address;
                this.copyToClipboard(address);
            });
        });
    }

    createWalletHtml(wallet, category) {
        const statusClass = this.getStatusClass(category);
        const statusText = this.getStatusText(category, wallet.foundTokens.length);
        
        return `
            <div class="wallet-result">
                <div class="wallet-header">
                    <div class="wallet-address">
                        <span class="wallet-address-text">${wallet.walletAddress}</span>
                        <button class="copy-btn" data-address="${wallet.walletAddress}">📋</button>
                    </div>
                    <div class="status-badge ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                
                ${wallet.error ? `
                    <div class="error-message">
                        ⚠️ ${wallet.error}
                    </div>
                ` : ''}
                
                ${wallet.foundTokens.length > 0 ? `
                    <div class="token-list">
                        ${wallet.foundTokens.map(token => this.createTokenHtml(token)).join('')}
                    </div>
                    
                    ${wallet.totalUsdValue && wallet.totalUsdValue > 0 ? `
                        <div class="total-value">
                            Total Value: ${this.formatUsdValue(wallet.totalUsdValue)}
                        </div>
                    ` : ''}
                ` : ''}
            </div>
        `;
    }

    createTokenHtml(token) {
        return `
            <div class="token-item">
                <div class="token-header">
                    <div class="token-info">
                        <h4>${token.symbol}</h4>
                        <p>${token.name}</p>
                    </div>
                    <div class="token-balance">
                        <div class="balance-amount">${token.balance} ${token.symbol}</div>
                        ${token.usdValue ? `
                            <div class="balance-usd">${this.formatUsdValue(token.usdValue)}</div>
                        ` : ''}
                    </div>
                </div>
                
                ${token.priceUsd ? `
                    <div class="price-info">
                        <span class="price">$${parseFloat(token.priceUsd).toFixed(6)}</span>
                        ${token.priceChange24h ? `
                            <span class="price-change ${token.priceChange24h >= 0 ? 'positive' : 'negative'}">
                                ${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h.toFixed(2)}%
                            </span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = { all: '🎯', some: '⚡', none: '❌' };
        return icons[category] || '📭';
    }

    getStatusClass(category) {
        const classes = { all: 'status-perfect', some: 'status-partial', none: 'status-none' };
        return classes[category] || '';
    }

    getStatusText(category, count) {
        switch (category) {
            case 'all': return `✅ Complete (${count} tokens)`;
            case 'some': return `⚡ Partial (${count} tokens)`;
            case 'none': return `❌ Empty (0 tokens)`;
            default: return '';
        }
    }

    formatUsdValue(value) {
        if (!value || value === 0) return '$0.00';
        
        if (value < 0.01) return `$${value.toFixed(6)}`;
        if (value < 1) return `$${value.toFixed(4)}`;
        if (value < 1000) return `$${value.toFixed(2)}`;
        if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${(value / 1000000).toFixed(2)}M`;
    }

    switchTab(category) {
        this.activeTab = category;
        
        // Update tab buttons
        this.resultsTabs.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            }
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${category}Results`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.currentResults = null;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => this.hideError(), 10000);
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    toggleDebug() {
        this.debugVisible = !this.debugVisible;
        this.updateDebugVisibility();
        window.storage.savePreferences({ debugVisible: this.debugVisible });
    }

    updateDebugVisibility() {
        if (this.debugVisible) {
            this.debugContent.classList.remove('hidden');
            this.debugToggle.textContent = 'Hide';
        } else {
            this.debugContent.classList.add('hidden');
            this.debugToggle.textContent = 'Show';
        }
    }

    addDebugLog(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-${type}">${this.getLogIcon(type)} ${message}</span>
        `;
        
        this.debugContent.appendChild(entry);
        this.debugContent.scrollTop = this.debugContent.scrollHeight;
        
        // Limit log entries to prevent memory issues
        const entries = this.debugContent.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
    }

    getLogIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.addDebugLog('success', 'Address copied to clipboard');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.addDebugLog('success', 'Address copied to clipboard (fallback)');
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new UIManager();
});
