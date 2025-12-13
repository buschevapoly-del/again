// data-loader.js - NO RECURSION VERSION
export class DataLoader {
    constructor() {
        this.data = null;
        this.normalizedData = null;
        this.minValue = null;
        this.maxValue = null;
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        this.returns = null;
        this.symbol = '^GSPC';
        this.fetchAttempted = false; // Prevent retry loops
    }

    /**
     * Fetch S&P 500 data - SIMPLE VERSION, NO RECURSION
     */
    async fetchYahooFinanceData(startYear = 2020) {
        console.log('Starting data fetch...');
        
        // ONLY try ONE method to avoid any recursion
        try {
            const data = await this.fetchSimpleYahooData(startYear);
            this.data = data;
            console.log(`✅ Got ${data.prices.length} days of data`);
            return data;
        } catch (error) {
            console.log('API failed, using simulated data:', error.message);
            // Use simulated data immediately - NO RETRY, NO RECURSION
            return this.generateSimpleSimulatedData(startYear);
        }
    }

    /**
     * SIMPLE Yahoo Finance fetch - NO RETRY LOGIC
     */
    async fetchSimpleYahooData(startYear) {
        console.log('Fetching from Yahoo Finance...');
        
        // Use current year - 2 years to get manageable amount of data
        const actualStartYear = Math.max(startYear, new Date().getFullYear() - 2);
        const startDate = new Date(actualStartYear, 0, 1);
        const endDate = new Date();
        
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);
        
        // Use SPY instead of ^GSPC (more reliable)
        const symbol = 'SPY';
        const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
        
        console.log(`URL: ${url}`);
        
        // Use fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csv = await response.text();
            
            if (!csv || csv.length < 100) {
                throw new Error('Invalid CSV response');
            }
            
            const rows = csv.trim().split('\n');
            const dates = [];
            const prices = [];
            
            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length >= 6) {
                    const date = cols[0];
                    const close = parseFloat(cols[4]);
                    
                    if (!isNaN(close) && close > 0) {
                        dates.push(date);
                        prices.push(close);
                    }
                }
            }
            
            if (dates.length === 0) {
                throw new Error('No valid data in CSV');
            }
            
            return {
                dates: dates,
                symbol: 'SPY (S&P 500 ETF)',
                prices: prices,
                source: 'Yahoo Finance'
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error; // Just throw, don't retry
        }
    }

    /**
     * SIMPLE simulated data - NO RECURSION, NO COMPLEX LOGIC
     */
    generateSimpleSimulatedData(startYear) {
        console.log('Creating simulated data...');
        
        // Fixed number of days - no while loops
        const years = new Date().getFullYear() - startYear + 1;
        const totalDays = years * 252;
        
        const dates = [];
        const prices = [];
        
        let price = 4000; // Starting price
        let currentDate = new Date(startYear, 0, 1);
        
        // SIMPLE for loop - no recursion
        for (let i = 0; i < totalDays; i++) {
            // Add 1 day
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Only add weekdays
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Simple price change
                const change = (Math.random() - 0.5) * 80; // ±40 points
                price += change;
                price = Math.max(price, 1000); // Keep reasonable
                
                dates.push(currentDate.toISOString().split('T')[0]);
                prices.push(price);
            }
        }
        
        this.data = {
            dates: dates,
            symbol: 'S&P 500 (Simulated)',
            prices: prices,
            source: 'Simulated'
        };
        
        console.log(`Created ${prices.length} simulated data points`);
        return this.data;
    }

    /**
     * Normalize data
     */
    normalizeData() {
        if (!this.data) {
            throw new Error('Load data first');
        }
        
        const prices = this.data.prices;
        
        // Find min/max
        let min = prices[0];
        let max = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] < min) min = prices[i];
            if (prices[i] > max) max = prices[i];
        }
        
        this.minValue = min;
        this.maxValue = max;
        
        // Normalize
        this.normalizedData = new Array(prices.length);
        const range = max - min;
        
        for (let i = 0; i < prices.length; i++) {
            this.normalizedData[i] = (prices[i] - min) / range;
        }
        
        // Calculate returns
        this.returns = new Array(prices.length - 1);
        for (let i = 1; i < prices.length; i++) {
            this.returns[i-1] = (prices[i] - prices[i-1]) / prices[i-1];
        }
        
        console.log(`Normalized ${prices.length} values`);
    }

    /**
     * Prepare dataset
     */
    prepareDataset(seqLen = 60, predDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Normalize data first');
        }
        
        const totalPossible = this.normalizedData.length - seqLen - predDays;
        
        if (totalPossible <= 0) {
            throw new Error('Not enough data');
        }
        
        const samples = [];
        const labels = [];
        
        // Simple loop - no recursion
        for (let i = 0; i < totalPossible; i++) {
            const input = this.normalizedData.slice(i, i + seqLen);
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            const output = futureReturns.map(r => r > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        
        // Create tensors
        this.X_train = tf.tensor3d(
            samples.slice(0, splitIdx).map(s => [s]),
            [splitIdx, 1, seqLen]
        );
        
        this.y_train = tf.tensor2d(
            labels.slice(0, splitIdx),
            [splitIdx, predDays]
        );
        
        this.X_test = tf.tensor3d(
            samples.slice(splitIdx).map(s => [s]),
            [samples.length - splitIdx, 1, seqLen]
        );
        
        this.y_test = tf.tensor2d(
            labels.slice(splitIdx),
            [samples.length - splitIdx, predDays]
        );
        
        console.log(`Dataset: ${samples.length} samples`);
    }

    dispose() {
        // Clean up
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        for (const tensor of tensors) {
            if (tensor) tensor.dispose();
        }
    }
}
