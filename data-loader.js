// data-loader.js - SIMPLIFIED WORKING VERSION
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
    }

    /**
     * Fetch S&P 500 data using multiple reliable methods
     */
    async fetchYahooFinanceData(startYear = 2015) {
        console.log('Fetching S&P 500 data...');
        
        // Try Method 1: Yahoo Finance CSV API (most reliable)
        try {
            console.log('Trying Yahoo Finance CSV API...');
            const data = await this.fetchYahooCSV(startYear);
            if (data && data.prices.length > 100) {
                this.data = data;
                console.log(`✅ Got ${data.prices.length} days from Yahoo CSV`);
                return data;
            }
        } catch (e) {
            console.log('Yahoo CSV failed:', e.message);
        }
        
        // Try Method 2: Alpha Vantage API (requires free API key)
        try {
            console.log('Trying Alpha Vantage API...');
            const data = await this.fetchAlphaVantage(startYear);
            if (data && data.prices.length > 100) {
                this.data = data;
                console.log(`✅ Got ${data.prices.length} days from Alpha Vantage`);
                return data;
            }
        } catch (e) {
            console.log('Alpha Vantage failed:', e.message);
        }
        
        // Try Method 3: IEX Cloud API (free tier available)
        try {
            console.log('Trying IEX Cloud API...');
            const data = await this.fetchIEXCloud(startYear);
            if (data && data.prices.length > 100) {
                this.data = data;
                console.log(`✅ Got ${data.prices.length} days from IEX Cloud`);
                return data;
            }
        } catch (e) {
            console.log('IEX Cloud failed:', e.message);
        }
        
        // Fallback to simulated data
        console.log('All APIs failed, using simulated data...');
        return this.generateSimpleSimulatedData(startYear);
    }

    /**
     * METHOD 1: Yahoo Finance CSV API (Most Reliable)
     */
    async fetchYahooCSV(startYear) {
        const endDate = new Date();
        const startDate = new Date(startYear, 0, 1);
        
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);
        
        // Use this URL format which often works better
        const url = `https://query1.finance.yahoo.com/v7/finance/download/${this.symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
        
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const csv = await response.text();
        const rows = csv.trim().split('\n');
        
        const dates = [];
        const prices = [];
        
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length >= 6) {
                const date = cols[0];
                const close = parseFloat(cols[4]); // Close price
                
                if (!isNaN(close) && close > 0) {
                    dates.push(date);
                    prices.push(close);
                }
            }
        }
        
        return {
            dates: dates,
            symbol: this.symbol,
            prices: prices,
            source: 'Yahoo Finance CSV'
        };
    }

    /**
     * METHOD 2: Alpha Vantage API (Get free API key at alphavantage.co)
     */
    async fetchAlphaVantage(startYear) {
        // Get your FREE API key from: https://www.alphavantage.co/support/#api-key
        const apiKey = 'demo'; // Replace with your own key for more data
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data['Time Series (Daily)']) {
            throw new Error('Invalid Alpha Vantage response');
        }
        
        const timeSeries = data['Time Series (Daily)'];
        const dates = [];
        const prices = [];
        
        // Convert object to arrays and filter by date
        for (const [date, values] of Object.entries(timeSeries)) {
            const dateObj = new Date(date);
            if (dateObj.getFullYear() >= startYear) {
                const close = parseFloat(values['4. close']);
                if (!isNaN(close)) {
                    dates.unshift(date); // Oldest first
                    prices.unshift(close);
                }
            }
        }
        
        return {
            dates: dates,
            symbol: 'SPY (S&P 500 ETF)',
            prices: prices,
            source: 'Alpha Vantage'
        };
    }

    /**
     * METHOD 3: IEX Cloud API (free sandbox tier)
     */
    async fetchIEXCloud(startYear) {
        // Free sandbox token (for testing)
        const token = 'Tpk_ee567917a6b640bb8602834c9d30e571';
        const url = `https://sandbox.iexapis.com/stable/stock/SPY/chart/5y?token=${token}&chartCloseOnly=true`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid IEX Cloud response');
        }
        
        const dates = [];
        const prices = [];
        
        data.forEach(item => {
            const dateObj = new Date(item.date);
            if (dateObj.getFullYear() >= startYear) {
                dates.push(item.date);
                prices.push(item.close);
            }
        });
        
        return {
            dates: dates,
            symbol: 'SPY (IEX Cloud)',
            prices: prices,
            source: 'IEX Cloud'
        };
    }

    /**
     * SIMPLE simulated data (no recursion, no stack overflow)
     */
    generateSimpleSimulatedData(startYear) {
        console.log('Generating simple simulated data...');
        
        const currentYear = new Date().getFullYear();
        const years = currentYear - startYear + 1;
        const totalDays = years * 252; // Trading days
        
        const dates = [];
        const prices = [];
        let price = 2000; // Start price
        
        let currentDate = new Date(startYear, 0, 1);
        let daysGenerated = 0;
        
        while (daysGenerated < totalDays) {
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Skip weekends
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                continue;
            }
            
            // Simple price movement
            const changePercent = (Math.random() - 0.48) * 0.04; // ~±2%
            price = price * (1 + changePercent);
            price = Math.max(price, 100); // Keep positive
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
            daysGenerated++;
            
            // Safety check
            if (daysGenerated > 5000) break;
        }
        
        this.data = {
            dates: dates,
            symbol: `${this.symbol} (Simulated)`,
            prices: prices,
            source: 'Simulated'
        };
        
        console.log(`Generated ${daysGenerated} simulated days`);
        return this.data;
    }

    /**
     * Normalize data (0-1 range)
     */
    normalizeData() {
        if (!this.data) throw new Error('No data loaded');
        
        const prices = this.data.prices;
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Calculate returns
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            this.returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        console.log(`Normalized ${prices.length} prices`);
    }

    /**
     * Prepare dataset
     */
    prepareDataset(seqLen = 60, predDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) throw new Error('Normalize data first');
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < this.normalizedData.length - seqLen - predDays; i++) {
            samples.push(this.normalizedData.slice(i, i + seqLen));
            
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            labels.push(futureReturns.map(r => r > 0 ? 1 : 0));
        }
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        
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
        
        console.log(`Dataset: ${samples.length} samples (${splitIdx} train, ${samples.length - splitIdx} test)`);
    }

    getStatistics() {
        if (!this.data) return null;
        
        const prices = this.data.prices;
        const returns = this.returns || [];
        
        return {
            symbol: this.data.symbol,
            source: this.data.source,
            days: prices.length,
            currentPrice: prices[prices.length - 1].toFixed(2),
            dateRange: `${this.data.dates[0]} to ${this.data.dates[this.data.dates.length - 1]}`,
            returns: {
                positive: returns.filter(r => r > 0).length,
                total: returns.length
            }
        };
    }
}
