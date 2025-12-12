// data-loader.js - FIXED VERSION
/**
 * Data Loader Module for S&P 500 Stock Prediction
 * Fetches data from Yahoo Finance API and prepares dataset
 */
export class DataLoader {
    constructor() {
        this.data = null;
        this.normalizedData = null;
        this.dateIndex = [];
        this.minValue = null;
        this.maxValue = null;
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        this.trainIndices = null;
        this.testIndices = null;
        this.returns = null;
        this.symbol = '^GSPC'; // S&P 500 index symbol
        this.isFetching = false; // Prevent multiple simultaneous fetches
    }

    /**
     * Fetch S&P 500 historical data from Yahoo Finance (2000-01-01 to today)
     * @returns {Promise<Object>} Historical price data
     */
    async fetchYahooFinanceData(startYear = 2000) {
        // Prevent multiple simultaneous fetches
        if (this.isFetching) {
            console.log('Already fetching data, skipping...');
            return this.data;
        }
        
        this.isFetching = true;
        console.log(`Fetching S&P 500 data from ${startYear}-01-01 to today...`);
        
        try {
            // Use more recent date if startYear is too old (avoid too much data)
            const actualStartYear = Math.max(startYear, 2010); // Start from 2010 for better API response
            const endDate = new Date();
            const startDate = new Date(actualStartYear, 0, 1);
            
            // Convert to Unix timestamps
            const period1 = Math.floor(startDate.getTime() / 1000);
            const period2 = Math.floor(endDate.getTime() / 1000);
            
            console.log(`Fetching data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
            
            // Use alternative Yahoo Finance endpoint (more reliable)
            const url = `https://query1.finance.yahoo.com/v7/finance/download/${this.symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
            
            console.log(`Fetching from Yahoo Finance CSV endpoint...`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText || csvText.length < 100) {
                throw new Error('API returned insufficient data');
            }
            
            // Parse CSV data (Date,Open,High,Low,Close,Adj Close,Volume)
            const rows = csvText.trim().split('\n');
            const headers = rows[0].split(',');
            
            // Find column indices
            const dateIndex = headers.indexOf('Date');
            const closeIndex = headers.indexOf('Close');
            const adjCloseIndex = headers.indexOf('Adj Close');
            
            if (dateIndex === -1 || (closeIndex === -1 && adjCloseIndex === -1)) {
                throw new Error('CSV format not recognized');
            }
            
            const dates = [];
            const prices = [];
            
            // Parse rows (skip header)
            for (let i = 1; i < rows.length; i++) {
                const columns = rows[i].split(',');
                if (columns.length < Math.max(dateIndex, closeIndex, adjCloseIndex) + 1) {
                    continue; // Skip malformed rows
                }
                
                const date = columns[dateIndex];
                // Use Adjusted Close if available, otherwise use Close
                const price = adjCloseIndex !== -1 && columns[adjCloseIndex] ? 
                    parseFloat(columns[adjCloseIndex]) : 
                    parseFloat(columns[closeIndex]);
                
                if (!isNaN(price) && price > 0 && date) {
                    dates.push(date);
                    prices.push(price);
                }
            }
            
            if (dates.length === 0 || prices.length === 0) {
                throw new Error('No valid data found in response');
            }
            
            this.data = {
                dates: dates,
                symbol: this.symbol,
                prices: prices,
                source: 'Yahoo Finance API'
            };
            
            console.log(`✅ Successfully fetched ${dates.length} trading days of S&P 500 data`);
            console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
            console.log(`Price range: $${Math.min(...prices).toFixed(2)} to $${Math.max(...prices).toFixed(2)}`);
            console.log(`Latest price: $${prices[prices.length - 1].toFixed(2)}`);
            
            return this.data;
            
        } catch (error) {
            console.error('❌ Error fetching from Yahoo Finance:', error.message);
            
            // Use fallback to simulated data WITHOUT recursion
            console.log('Using high-quality simulated S&P 500 data...');
            return this.generateSimulatedDataSafely(startYear);
            
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * SAFE VERSION: Generate simulated S&P 500 data WITHOUT recursion
     */
    generateSimulatedDataSafely(startYear = 2000) {
        console.log(`Generating simulated S&P 500 data from ${startYear}...`);
        
        const currentYear = new Date().getFullYear();
        const totalYears = currentYear - startYear + 1;
        
        // Calculate total trading days (approx 252 per year)
        const tradingDaysPerYear = 252;
        const totalDays = totalYears * tradingDaysPerYear;
        
        // Initialize arrays with fixed size
        const dates = new Array(totalDays);
        const prices = new Array(totalDays);
        
        let price = 1500; // Starting price around year 2000
        
        // Track current date
        let currentDate = new Date(startYear, 0, 1);
        let dayCount = 0;
        
        // Market parameters
        const annualReturn = 0.07; // 7% annual return
        const dailyReturn = annualReturn / tradingDaysPerYear;
        const dailyVolatility = 0.012;
        
        // Generate data using simple loop (NO recursion)
        for (let i = 0; i < totalDays && dayCount < totalDays; i++) {
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Skip weekends
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }
            
            // Calculate price change (random walk with drift)
            const randomComponent = (Math.random() - 0.5) * 2 * dailyVolatility;
            price = price * (1 + dailyReturn + randomComponent);
            
            // Ensure price is positive
            price = Math.max(price, 100);
            
            // Store data
            dates[dayCount] = currentDate.toISOString().split('T')[0];
            prices[dayCount] = price;
            dayCount++;
        }
        
        // Trim arrays to actual size
        const finalDates = dates.slice(0, dayCount);
        const finalPrices = prices.slice(0, dayCount);
        
        this.data = {
            dates: finalDates,
            symbol: `${this.symbol} (Simulated)`,
            prices: finalPrices,
            source: 'Simulated Data'
        };
        
        console.log(`✅ Generated ${dayCount} days of simulated S&P 500 data`);
        console.log(`Final price: $${price.toFixed(2)} (from $1500 in ${startYear})`);
        
        return this.data;
    }

    /**
     * Normalize price data (0 to 1 range)
     */
    normalizeData() {
        if (!this.data) {
            throw new Error('No data loaded. Call fetchYahooFinanceData first.');
        }

        const prices = this.data.prices;
        
        // Find min and max
        this.minValue = prices[0];
        this.maxValue = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] < this.minValue) this.minValue = prices[i];
            if (prices[i] > this.maxValue) this.maxValue = prices[i];
        }
        
        // Normalize all prices
        this.normalizedData = new Array(prices.length);
        const range = this.maxValue - this.minValue;
        
        if (range === 0) {
            // All prices are the same (unlikely but handle it)
            this.normalizedData.fill(0.5);
        } else {
            for (let i = 0; i < prices.length; i++) {
                this.normalizedData[i] = (prices[i] - this.minValue) / range;
            }
        }
        
        // Calculate returns
        this.returns = new Array(prices.length - 1);
        for (let i = 1; i < prices.length; i++) {
            this.returns[i-1] = (prices[i] - prices[i-1]) / prices[i-1];
        }
        
        console.log(`✅ Data normalized. Min: $${this.minValue.toFixed(2)}, Max: $${this.maxValue.toFixed(2)}`);
    }

    /**
     * Prepare dataset with sliding windows
     */
    prepareDataset(sequenceLength = 60, predictionDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData first.');
        }

        const totalSamples = this.normalizedData.length - sequenceLength - predictionDays;
        
        if (totalSamples <= 0) {
            throw new Error(`Not enough data. Need ${sequenceLength + predictionDays} points, have ${this.normalizedData.length}`);
        }
        
        console.log(`Preparing dataset from ${this.normalizedData.length} data points...`);
        
        // Create samples and labels
        const samples = new Array(totalSamples);
        const labels = new Array(totalSamples);
        
        for (let i = 0; i < totalSamples; i++) {
            // Input sequence
            samples[i] = this.normalizedData.slice(i, i + sequenceLength);
            
            // Output labels (binary: 1 if return > 0)
            const futureReturns = this.returns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            labels[i] = futureReturns.map(ret => ret > 0 ? 1 : 0);
        }
        
        // Split indices
        const splitIndex = Math.floor(totalSamples * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: totalSamples - splitIndex}, (_, i) => i + splitIndex);
        
        console.log(`Created ${totalSamples} samples (${splitIndex} train, ${totalSamples - splitIndex} test)`);
        
        // Create tensors
        this.X_train = tf.tensor3d(
            this.trainIndices.map(idx => [samples[idx]]),
            [splitIndex, 1, sequenceLength]
        );
        
        this.y_train = tf.tensor2d(
            this.trainIndices.map(idx => labels[idx]),
            [splitIndex, predictionDays]
        );
        
        this.X_test = tf.tensor3d(
            this.testIndices.map(idx => [samples[idx]]),
            [totalSamples - splitIndex, 1, sequenceLength]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [totalSamples - splitIndex, predictionDays]
        );
        
        console.log('✅ Dataset prepared');
    }

    /**
     * Get latest sequence for prediction
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error('Not enough data for prediction');
        }
        
        const latest = this.normalizedData.slice(-sequenceLength);
        return tf.tensor3d([[latest]], [1, 1, sequenceLength]);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        if (!this.data) return null;

        const prices = this.data.prices;
        const returns = this.returns || [];
        
        // Calculate basic stats
        let sumReturn = 0;
        let positiveDays = 0;
        
        for (const ret of returns) {
            sumReturn += ret;
            if (ret > 0) positiveDays++;
        }
        
        const avgReturn = returns.length > 0 ? sumReturn / returns.length : 0;
        
        return {
            symbol: this.data.symbol,
            numDays: prices.length,
            dateRange: {
                start: this.data.dates[0],
                end: this.data.dates[this.data.dates.length - 1]
            },
            priceRange: {
                min: Math.min(...prices),
                max: Math.max(...prices),
                current: prices[prices.length - 1]
            },
            returns: {
                average: avgReturn,
                positiveDays: positiveDays,
                negativeDays: returns.length - positiveDays,
                totalDays: returns.length
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0
        };
    }

    /**
     * Clean up memory
     */
    dispose() {
        [this.X_train, this.y_train, this.X_test, this.y_test].forEach(tensor => {
            if (tensor && tensor.dispose) {
                tensor.dispose();
            }
        });
        
        this.X_train = this.y_train = this.X_test = this.y_test = null;
    }
}
