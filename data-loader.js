// data-loader.js
/**
 * Data Loader Module for S&P 500 Index
 * Handles data loading from multiple sources: demo data, Yahoo Finance, or file upload
 */

class DataLoader {
    constructor() {
        this.data = null;
        this.featureColumns = ['Close'];
        this.targetColumn = 'Close';
        this.sequenceLength = 60;
        this.forecastDays = 5;
        this.trainTestSplit = 0.8;
        this.normalizationParams = {};
    }

    /**
     * Generate realistic demo data for S&P 500
     * @param {number} days - Number of days to generate
     * @returns {Promise<Array>} - Generated data
     */
    async generateDemoData(days = 1000) {
        console.log(`Generating ${days} days of demo data...`);
        
        // Start from a realistic price
        let price = 4000;
        const volatility = 0.012;
        const drift = 0.0001; // Slight upward trend
        
        const rows = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            // Skip weekends for realistic trading days
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                continue;
            }
            
            // Generate realistic price movement
            const randomFactor = (Math.random() - 0.5) * 2;
            const change = price * volatility * randomFactor + price * drift;
            price += change;
            
            // Add some noise
            price += (Math.random() - 0.5) * price * 0.001;
            
            // Ensure price doesn't go below 0
            price = Math.max(price, 100);
            
            // Create OHLC data
            const open = price;
            const close = price + (Math.random() - 0.5) * price * 0.005;
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.008);
            const volume = Math.floor(Math.random() * 1000000) + 500000;
            
            rows.push({
                Date: currentDate.toISOString().split('T')[0],
                Open: parseFloat(open.toFixed(2)),
                High: parseFloat(high.toFixed(2)),
                Low: parseFloat(low.toFixed(2)),
                Close: parseFloat(close.toFixed(2)),
                Volume: volume
            });
            
            price = close; // Use close as next day's starting point
        }
        
        this.data = rows;
        this.featureColumns = ['Close']; // Use Close as primary feature
        
        console.log(`Generated ${rows.length} days of demo data`);
        console.log('First row:', rows[0]);
        console.log('Last row:', rows[rows.length - 1]);
        
        return rows;
    }

    /**
     * Fetch data from Yahoo Finance using public API
     * @param {string} ticker - Stock ticker symbol
     * @param {string} period - Time period
     * @param {string} interval - Data interval
     * @returns {Promise<Array>} - Fetched data
     */
    async fetchYahooFinanceData(ticker = '^GSPC', period = '1y', interval = '1d') {
        console.log(`Fetching data for ${ticker} from Yahoo Finance...`);
        
        try {
            // Using Yahoo Finance public API through CORS proxy
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${period}&interval=${interval}`;
            
            // Use CORS proxy to avoid CORS issues
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(proxyUrl + encodeURIComponent(url));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('No data returned from Yahoo Finance');
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            if (!timestamps || timestamps.length === 0) {
                throw new Error('No timestamp data available');
            }
            
            const rows = [];
            
            for (let i = 0; i < timestamps.length; i++) {
                const date = new Date(timestamps[i] * 1000);
                
                // Skip if any price data is null
                if (!quotes.close || quotes.close[i] === null) continue;
                
                rows.push({
                    Date: date.toISOString().split('T')[0],
                    Open: quotes.open[i] || quotes.close[i],
                    High: quotes.high[i] || quotes.close[i],
                    Low: quotes.low[i] || quotes.close[i],
                    Close: quotes.close[i],
                    Volume: quotes.volume[i] || 0
                });
            }
            
            if (rows.length === 0) {
                throw new Error('No valid price data found');
            }
            
            this.data = rows;
            this.featureColumns = ['Close'];
            
            console.log(`Fetched ${rows.length} days of data from Yahoo Finance`);
            console.log('First row:', rows[0]);
            console.log('Last row:', rows[rows.length - 1]);
            
            return rows;
            
        } catch (error) {
            console.error('Error fetching from Yahoo Finance:', error);
            
            // Fallback to demo data if Yahoo Finance fails
            console.log('Falling back to demo data...');
            return await this.generateDemoData(365);
        }
    }

    /**
     * Load and parse CSV file
     */
    async loadCSV(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const rows = this.parseSimpleCSV(csvText);
                    
                    if (rows.length === 0) {
                        reject(new Error('No valid data found in CSV'));
                        return;
                    }
                    
                    this.data = rows;
                    this.featureColumns = ['Close'];
                    
                    console.log(`Loaded ${rows.length} rows from CSV`);
                    resolve(rows);
                    
                } catch (error) {
                    console.error('CSV parsing error:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Simple CSV parser - handles single column of prices
     */
    parseSimpleCSV(csvText) {
        const rows = [];
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Try to extract a number
            const match = line.match(/(\d+\.?\d*)/);
            if (match) {
                const value = parseFloat(match[1]);
                if (!isNaN(value) && value > 0) {
                    rows.push({
                        Date: `Day ${rows.length + 1}`,
                        Close: value
                    });
                }
            }
        }
        
        return rows;
    }

    /**
     * Preprocess data for model training
     */
    preprocessData() {
        console.log('=== PREPROCESSING DATA ===');
        
        if (!this.data || this.data.length === 0) {
            throw new Error('No data loaded. Please load data first.');
        }

        console.log(`Preprocessing ${this.data.length} data points...`);

        // Extract Close prices
        const closePrices = this.data.map(row => {
            const val = row[this.targetColumn];
            return typeof val === 'number' && isFinite(val) ? val : 0;
        }).filter(val => val > 0);

        if (closePrices.length < this.sequenceLength + this.forecastDays) {
            throw new Error(`Need at least ${this.sequenceLength + this.forecastDays} data points`);
        }

        console.log(`Valid close prices: ${closePrices.length}`);
        console.log('First 5 prices:', closePrices.slice(0, 5));

        // Normalize data
        const normalizedPrices = this.normalizeArray(closePrices, 'target');

        // Create sequences (using only close prices as features)
        return this.createSequences([normalizedPrices], normalizedPrices);
    }

    /**
     * Normalize an array
     */
    normalizeArray(array, name) {
        const validArray = array.filter(val => isFinite(val));
        if (validArray.length === 0) {
            throw new Error(`No valid values in array: ${name}`);
        }
        
        const min = Math.min(...validArray);
        const max = Math.max(...validArray);
        const range = max - min || 1;
        
        this.normalizationParams[name] = { min, max, range };
        
        console.log(`${name}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, range=${range.toFixed(2)}`);
        
        return array.map(val => {
            if (!isFinite(val)) return 0;
            return (val - min) / range;
        });
    }

    /**
     * Denormalize an array
     */
    denormalizeArray(normalizedArray, name) {
        const params = this.normalizationParams[name];
        if (!params) {
            throw new Error(`No normalization params for ${name}`);
        }
        
        return normalizedArray.map(val => val * params.range + params.min);
    }

    /**
     * Create sequences for training
     */
    createSequences(normalizedFeatures, normalizedTarget) {
        const totalSamples = normalizedTarget.length - this.sequenceLength - this.forecastDays + 1;
        
        if (totalSamples <= 0) {
            throw new Error(`Need more data. Required: ${this.sequenceLength + this.forecastDays}, Have: ${normalizedTarget.length}`);
        }

        console.log(`Creating ${totalSamples} sequences...`);

        const sequences = [];
        const targets = [];
        
        for (let i = 0; i < totalSamples; i++) {
            const sequence = [];
            for (let j = 0; j < this.sequenceLength; j++) {
                const timeStep = normalizedFeatures.map(feature => feature[i + j]);
                sequence.push(timeStep);
            }
            sequences.push(sequence);
            
            const nextValues = normalizedTarget.slice(
                i + this.sequenceLength, 
                i + this.sequenceLength + this.forecastDays
            );
            targets.push(nextValues);
        }

        // Split into train/test
        const splitIndex = Math.floor(sequences.length * this.trainTestSplit);
        
        const X_train = sequences.slice(0, splitIndex);
        const y_train = targets.slice(0, splitIndex);
        const X_test = sequences.slice(splitIndex);
        const y_test = targets.slice(splitIndex);

        console.log(`Training samples: ${X_train.length}`);
        console.log(`Testing samples: ${X_test.length}`);

        return {
            X_train: tf.tensor3d(X_train),
            y_train: tf.tensor2d(y_train),
            X_test: tf.tensor3d(X_test),
            y_test: tf.tensor2d(y_test),
            featureNames: this.featureColumns,
            sequenceLength: this.sequenceLength,
            forecastDays: this.forecastDays
        };
    }

    /**
     * Get the latest window for prediction
     */
    getLatestWindow() {
        if (!this.data || this.data.length < this.sequenceLength) {
            throw new Error(`Need at least ${this.sequenceLength} days of data`);
        }

        const closePrices = this.data.map(row => row[this.targetColumn]);
        const latestPrices = closePrices.slice(-this.sequenceLength);

        const params = this.normalizationParams['target'];
        if (!params) {
            throw new Error('No normalization parameters found');
        }

        const normalizedLatest = latestPrices.map(val => (val - params.min) / params.range);
        
        // Reshape to [1, sequenceLength, 1]
        const sequence = normalizedLatest.map(price => [price]);
        
        return tf.tensor3d([sequence]);
    }

    /**
     * Get data statistics
     */
    getStats() {
        if (!this.data || this.data.length === 0) {
            return null;
        }

        const closePrices = this.data.map(row => row[this.targetColumn]);
        const returns = [];
        
        for (let i = 1; i < closePrices.length; i++) {
            const ret = (closePrices[i] - closePrices[i-1]) / closePrices[i-1];
            if (isFinite(ret)) {
                returns.push(ret);
            }
        }

        const stats = {
            totalDays: this.data.length,
            minPrice: Math.min(...closePrices).toFixed(2),
            maxPrice: Math.max(...closePrices).toFixed(2),
            lastPrice: closePrices[closePrices.length - 1].toFixed(2),
            dataSource: this.data[0].Date.includes('Day') ? 'Demo Data' : 'Yahoo Finance'
        };
        
        if (returns.length > 0) {
            stats.meanReturn = (returns.reduce((a, b) => a + b, 0) / returns.length * 100).toFixed(3);
            stats.volatility = (Math.sqrt(returns.reduce((sq, n) => sq + n * n, 0) / returns.length) * 100).toFixed(3);
        }

        console.log('Data statistics:', stats);
        return stats;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.data = null;
        this.normalizationParams = {};
    }
}

// Export singleton instance
export const dataLoader = new DataLoader();
