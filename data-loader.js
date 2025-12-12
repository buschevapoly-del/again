// data-loader.js
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
    }

    /**
     * Fetch S&P 500 historical data from Yahoo Finance
     * @param {number} years - Number of years of historical data (default: 5)
     * @returns {Promise<Object>} Historical price data
     */
    async fetchYahooFinanceData(years = 5) {
        this.showStatus('Fetching S&P 500 data from Yahoo Finance...', 'info');
        
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (years * 365 * 24 * 60 * 60);
        
        try {
            // Using yahoo finance API through CORS proxy
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${this.symbol}?period1=${startDate}&period2=${endDate}&interval=1d&events=history`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.chart || !result.chart.result || result.chart.result.length === 0) {
                throw new Error('Invalid response format from Yahoo Finance');
            }
            
            const chartData = result.chart.result[0];
            const timestamps = chartData.timestamp;
            const quotes = chartData.indicators.quote[0];
            const adjClose = chartData.indicators.adjclose[0].adjclose;
            
            // Use adjusted close prices when available
            const prices = adjClose || quotes.close;
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data available');
            }
            
            // Convert timestamps to dates
            this.dateIndex = timestamps.map(ts => {
                const date = new Date(ts * 1000);
                return date.toISOString().split('T')[0];
            });
            
            // Filter out null values and ensure data integrity
            const validData = [];
            const validDates = [];
            
            for (let i = 0; i < prices.length; i++) {
                if (prices[i] !== null && !isNaN(prices[i]) && prices[i] > 0) {
                    validData.push(prices[i]);
                    validDates.push(this.dateIndex[i]);
                }
            }
            
            this.data = {
                dates: validDates,
                symbol: this.symbol,
                prices: validData
            };
            
            console.log(`Fetched ${validData.length} days of S&P 500 data`);
            return this.data;
            
        } catch (error) {
            console.error('Error fetching Yahoo Finance data:', error);
            
            // Fallback to simulated data if API fails
            this.showStatus('Using simulated data (API limited). Loading...', 'warning');
            return this.generateSimulatedData(years);
        }
    }

    /**
     * Generate simulated S&P 500 data for demo purposes
     * @param {number} years - Number of years of data
     * @returns {Object} Simulated price data
     */
    generateSimulatedData(years) {
        const days = years * 252; // Trading days per year
        let price = 4000; // Starting price
        
        const dates = [];
        const prices = [];
        
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);
        
        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Generate realistic price movements
            const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily
            const volatility = 0.012;
            const drift = 0.0004;
            
            const change = price * (drift + volatility * dailyReturn);
            price += change;
            
            // Ensure price stays positive
            price = Math.max(price, 100);
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
        }
        
        this.data = {
            dates: dates,
            symbol: '^GSPC (Simulated)',
            prices: prices
        };
        
        console.log(`Generated ${days} days of simulated S&P 500 data`);
        return this.data;
    }

    /**
     * Normalize price data using Min-Max scaling
     */
    normalizeData() {
        if (!this.data) {
            throw new Error('No data loaded. Call fetchYahooFinanceData first.');
        }

        const { prices } = this.data;
        
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        // Apply Min-Max normalization
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );

        // Calculate returns
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            this.returns.push(ret);
        }
        
        console.log('Data normalized successfully');
    }

    /**
     * Prepare time series dataset with sliding window
     * @param {number} sequenceLength - Length of input sequence (default: 60)
     * @param {number} predictionDays - Days ahead to predict (default: 5)
     * @param {number} trainSplit - Percentage of data for training (default: 0.8)
     */
    prepareDataset(sequenceLength = 60, predictionDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData first.');
        }

        if (this.returns.length < sequenceLength + predictionDays) {
            throw new Error(`Insufficient data. Need at least ${sequenceLength + predictionDays} days after returns calculation.`);
        }

        const numDays = this.normalizedData.length;
        
        // Create sliding window samples using normalized prices as input
        // and binary returns (positive/negative) as output
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < numDays - sequenceLength - predictionDays; i++) {
            // Input: sequence of normalized prices
            const input = this.normalizedData.slice(i, i + sequenceLength);
            
            // Output: binary classification of next 5 days returns
            // We use the returns starting from i+sequenceLength
            const futureReturns = this.returns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            const output = futureReturns.map(ret => ret > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }

        if (samples.length === 0) {
            throw new Error('No samples generated. Check data length and parameters.');
        }

        // Split into training and testing sets chronologically
        const splitIndex = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIndex}, (_, i) => i + splitIndex);

        // Convert to tensors
        // Reshape samples to [batch, 1, sequenceLength] for single time series
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
            [samples.length - splitIndex, 1, sequenceLength]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIndex, predictionDays]
        );

        console.log(`Dataset prepared: ${samples.length} total samples`);
        console.log(`Training: ${splitIndex}, Testing: ${samples.length - splitIndex}`);
    }

    /**
     * Get the most recent sequence for prediction
     * @param {number} sequenceLength - Length of input sequence
     * @returns {tf.Tensor} Tensor of shape [1, 1, sequenceLength]
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error('Insufficient data for prediction');
        }
        
        const latestSequence = this.normalizedData.slice(-sequenceLength);
        return tf.tensor3d([[latestSequence]], [1, 1, sequenceLength]);
    }

    /**
     * Denormalize a normalized value back to original price
     * @param {number} normalizedValue - Normalized value (0-1)
     * @returns {number} Original price
     */
    denormalizePrice(normalizedValue) {
        if (this.minValue === null || this.maxValue === null) {
            throw new Error('Normalization parameters not available');
        }
        return normalizedValue * (this.maxValue - this.minValue) + this.minValue;
    }

    /**
     * Get dataset statistics
     * @returns {Object} Dataset statistics
     */
    getStatistics() {
        if (!this.data) return null;

        const prices = this.data.prices;
        const returns = this.returns || [];
        
        const avgReturn = returns.length > 0 ? 
            returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        
        const volatility = returns.length > 0 ?
            Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length) : 0;

        return {
            symbol: this.data.symbol,
            numDays: this.data.dates.length,
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
                volatility: volatility,
                positiveDays: returns.filter(r => r > 0).length,
                totalDays: returns.length
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0
        };
    }

    /**
     * Get historical returns for visualization
     * @returns {Array} Array of returns data points
     */
    getReturnsData() {
        if (!this.returns || !this.data) return [];
        
        return this.returns.map((ret, idx) => ({
            date: this.data.dates[idx + 1], // Returns start from day 2
            return: ret,
            positive: ret > 0
        }));
    }

    /**
     * Clean up tensors and release memory
     */
    dispose() {
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        tensors.forEach(tensor => {
            if (tensor) tensor.dispose();
        });
    }

    /**
     * Show status message (to be implemented in app.js)
     */
    showStatus(message, type) {
        console.log(`${type}: ${message}`);
    }
}
