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
     * Fetch S&P 500 historical data from Yahoo Finance (2000-01-01 to today)
     * Equivalent to: data = yf.download(tickers, start='2000-01-01')
     * @returns {Promise<Object>} Historical price data
     */
    async fetchYahooFinanceData(startYear = 2000) {
        console.log(`Fetching S&P 500 data from ${startYear}-01-01 to today...`);
        
        // Convert dates to Unix timestamps (seconds since epoch)
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = new Date(`${startYear}-01-01`);
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = endDate;
        
        console.log(`Date range: ${period1} (${new Date(period1 * 1000).toISOString()}) to ${period2}`);
        
        try {
            // Using Yahoo Finance's chart API v8 (same one yfinance uses)
            // This endpoint returns JSON data similar to what Python yfinance gets
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${this.symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
            
            console.log(`Fetching from: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Debug: log the API response structure
            console.log('API Response structure:', Object.keys(result));
            
            if (!result.chart || !result.chart.result || result.chart.result.length === 0) {
                console.error('Invalid API response:', result);
                throw new Error('Invalid response format from Yahoo Finance');
            }
            
            const chartData = result.chart.result[0];
            
            // Check if we have the required data
            if (!chartData.timestamp || !chartData.indicators) {
                console.error('Missing data in API response:', chartData);
                throw new Error('Missing required data fields in API response');
            }
            
            const timestamps = chartData.timestamp;
            const quotes = chartData.indicators.quote[0];
            
            // Use adjusted close if available, otherwise use regular close
            let prices;
            if (chartData.indicators.adjclose && chartData.indicators.adjclose[0]) {
                prices = chartData.indicators.adjclose[0].adjclose;
                console.log('Using adjusted close prices');
            } else {
                prices = quotes.close;
                console.log('Using regular close prices (adjusted close not available)');
            }
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data available in the response');
            }
            
            console.log(`Received ${timestamps.length} timestamps and ${prices.length} prices`);
            
            // Convert timestamps to readable dates and filter out null values
            const validData = [];
            const validDates = [];
            const validTimestamps = [];
            
            for (let i = 0; i < prices.length; i++) {
                // Skip null or invalid price values
                if (prices[i] !== null && 
                    !isNaN(prices[i]) && 
                    prices[i] > 0 && 
                    timestamps[i] !== null) {
                    
                    validData.push(prices[i]);
                    const date = new Date(timestamps[i] * 1000);
                    validDates.push(date.toISOString().split('T')[0]);
                    validTimestamps.push(timestamps[i]);
                }
            }
            
            if (validData.length === 0) {
                throw new Error('No valid price data after filtering');
            }
            
            console.log(`Filtered to ${validData.length} valid data points`);
            
            // Store the data
            this.data = {
                dates: validDates,
                timestamps: validTimestamps,
                symbol: this.symbol,
                prices: validData,
                // Also store other metrics for potential future use
                opens: quotes.open ? quotes.open.filter((v, i) => prices[i] !== null && !isNaN(prices[i]) && prices[i] > 0) : [],
                highs: quotes.high ? quotes.high.filter((v, i) => prices[i] !== null && !isNaN(prices[i]) && prices[i] > 0) : [],
                lows: quotes.low ? quotes.low.filter((v, i) => prices[i] !== null && !isNaN(prices[i]) && prices[i] > 0) : [],
                volumes: quotes.volume ? quotes.volume.filter((v, i) => prices[i] !== null && !isNaN(prices[i]) && prices[i] > 0) : []
            };
            
            console.log(`✅ Successfully fetched ${validData.length} days of S&P 500 data`);
            console.log(`Date range: ${validDates[0]} to ${validDates[validDates.length - 1]}`);
            console.log(`Price range: $${Math.min(...validData).toFixed(2)} to $${Math.max(...validData).toFixed(2)}`);
            
            return this.data;
            
        } catch (error) {
            console.error('Error fetching Yahoo Finance data:', error);
            
            // Fallback to simulated data if API fails (for development/demo)
            console.warn('Falling back to simulated data for demo purposes');
            return this.generateSimulatedData(startYear);
        }
    }

    /**
     * Generate realistic simulated S&P 500 data (fallback when API fails)
     * This creates data that mimics real S&P 500 characteristics
     * @param {number} startYear - Starting year
     * @returns {Object} Simulated price data
     */
    generateSimulatedData(startYear) {
        console.log(`Generating realistic simulated S&P 500 data from ${startYear}...`);
        
        const endYear = new Date().getFullYear();
        const years = endYear - startYear + 1;
        const tradingDaysPerYear = 252; // Average trading days
        const totalDays = years * tradingDaysPerYear;
        
        let price = 1500; // Starting price in 2000 (historical S&P 500 was around 1500)
        
        const dates = [];
        const prices = [];
        const startDate = new Date(startYear, 0, 1); // Jan 1 of startYear
        
        // Realistic S&P 500 parameters
        const baseVolatility = 0.012; // Daily volatility
        const longTermGrowth = 0.0003; // Average daily growth (~7.5% annual)
        
        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                continue;
            }
            
            // Add some monthly seasonality
            const month = currentDate.getMonth();
            let monthlyEffect = 0;
            if (month >= 10 || month <= 1) { // Nov-Feb historically stronger
                monthlyEffect = 0.0002;
            }
            
            // Add crisis simulation (2008, 2020)
            let crisisEffect = 0;
            const year = currentDate.getFullYear();
            if (year >= 2008 && year <= 2009) {
                crisisEffect = -0.001; // Financial crisis effect
            }
            if (year === 2020 && month >= 2 && month <= 4) {
                crisisEffect = -0.002; // COVID crash effect
            }
            
            // Generate price movement with random walk + drift + seasonality
            const dailyReturn = (Math.random() - 0.5) * 2 * baseVolatility;
            const drift = longTermGrowth + monthlyEffect + crisisEffect;
            
            const change = price * (drift + dailyReturn);
            price += change;
            
            // Ensure price stays positive and realistic
            price = Math.max(price, 100);
            
            // Add bull market effect for certain periods
            if (year >= 2013 && year <= 2019) {
                price *= 1.00005; // Extra bull market growth
            }
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
        }
        
        this.data = {
            dates: dates,
            symbol: `${this.symbol} (Simulated)`,
            prices: prices,
            timestamps: dates.map(d => Math.floor(new Date(d).getTime() / 1000))
        };
        
        console.log(`Generated ${dates.length} days of realistic simulated S&P 500 data`);
        console.log(`Final price: $${price.toFixed(2)} (from $1500 in ${startYear})`);
        
        return this.data;
    }

    /**
     * Normalize price data using Min-Max scaling (0 to 1)
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

        // Calculate returns (percentage change)
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            this.returns.push(ret);
        }
        
        console.log(`✅ Data normalized. Range: ${this.minValue.toFixed(2)} to ${this.maxValue.toFixed(2)}`);
        console.log(`Returns calculated: ${this.returns.length} values, mean: ${(this.returns.reduce((a, b) => a + b, 0) / this.returns.length * 100).toFixed(2)}%`);
    }

    /**
     * Prepare time series dataset with sliding window (60 days input → 5 days output)
     * This mimics the common approach in time series forecasting
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
        console.log(`Preparing dataset from ${numDays} days of data...`);
        
        // Create sliding window samples using normalized prices as input
        // and binary returns (positive/negative) as output
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < numDays - sequenceLength - predictionDays; i++) {
            // Input: sequence of normalized prices (last 'sequenceLength' days)
            const input = this.normalizedData.slice(i, i + sequenceLength);
            
            // Output: binary classification of next 'predictionDays' returns
            // We use the returns starting from i+sequenceLength
            const futureReturns = this.returns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            const output = futureReturns.map(ret => ret > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }

        if (samples.length === 0) {
            throw new Error('No samples generated. Check data length and parameters.');
        }

        console.log(`Generated ${samples.length} training samples`);
        
        // Split into training and testing sets chronologically
        const splitIndex = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIndex}, (_, i) => i + splitIndex);

        console.log(`Train/Test split: ${splitIndex} training, ${samples.length - splitIndex} testing`);
        
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

        console.log('✅ Dataset prepared successfully');
        console.log(`X_train shape: ${this.X_train.shape}`);
        console.log(`y_train shape: ${this.y_train.shape}`);
        console.log(`X_test shape: ${this.X_test.shape}`);
        console.log(`y_test shape: ${this.y_test.shape}`);
    }

    /**
     * Get the most recent sequence for prediction
     * @param {number} sequenceLength - Length of input sequence
     * @returns {tf.Tensor} Tensor of shape [1, 1, sequenceLength]
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error(`Insufficient data for prediction. Need at least ${sequenceLength} normalized values.`);
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

        // Calculate sharpe ratio (assuming 0% risk-free rate for simplicity)
        const sharpeRatio = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0;

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
                sharpeRatio: sharpeRatio,
                positiveDays: returns.filter(r => r > 0).length,
                negativeDays: returns.filter(r => r < 0).length,
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
     * Get price data for visualization
     * @param {number} maxPoints - Maximum number of points to return (for performance)
     * @returns {Array} Array of price data points
     */
    getPriceData(maxPoints = 200) {
        if (!this.data) return [];
        
        const { dates, prices } = this.data;
        
        // Sample data if we have too many points
        if (dates.length <= maxPoints) {
            return dates.map((date, idx) => ({
                date: date,
                price: prices[idx]
            }));
        }
        
        const step = Math.ceil(dates.length / maxPoints);
        const sampledData = [];
        
        for (let i = 0; i < dates.length; i += step) {
            sampledData.push({
                date: dates[i],
                price: prices[i]
            });
        }
        
        // Always include the last data point
        if (sampledData[sampledData.length - 1].date !== dates[dates.length - 1]) {
            sampledData.push({
                date: dates[dates.length - 1],
                price: prices[prices.length - 1]
            });
        }
        
        return sampledData;
    }

    /**
     * Clean up tensors and release memory
     */
    dispose() {
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        tensors.forEach(tensor => {
            if (tensor) {
                try {
                    tensor.dispose();
                } catch (e) {
                    console.warn('Error disposing tensor:', e);
                }
            }
        });
        
        // Clear references
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        
        console.log('DataLoader memory cleaned up');
    }

    /**
     * Test the data fetching and processing pipeline
     */
    async testPipeline() {
        try {
            console.log('Testing data pipeline...');
            
            // 1. Fetch data
            await this.fetchYahooFinanceData(2000);
            
            // 2. Normalize
            this.normalizeData();
            
            // 3. Prepare dataset
            this.prepareDataset(60, 5, 0.8);
            
            // 4. Get statistics
            const stats = this.getStatistics();
            console.log('Pipeline test successful!');
            console.log('Statistics:', stats);
            
            return true;
        } catch (error) {
            console.error('Pipeline test failed:', error);
            return false;
        }
    }
}
