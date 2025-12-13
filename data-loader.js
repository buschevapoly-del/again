// data-loader.js - FIXED VERSION
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized');
        this.data = null;
        this.normalizedData = null;
        this.minValue = null;
        this.maxValue = null;
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        this.returns = null;
        this.trainIndices = null;
        this.testIndices = null;
        this.symbol = '^GSPC';
        this.isFetching = false;
    }

    /**
     * Fetch S&P 500 data
     */
    async fetchYahooFinanceData(startYear = 2020) {
        console.log('Fetching data from', startYear);
        
        if (this.isFetching) {
            console.log('Already fetching, skipping...');
            return this.data;
        }
        
        this.isFetching = true;
        
        try {
            // Always use simulated data to avoid API issues
            this.data = this.generateSimulatedData(startYear);
            console.log('✅ Data loaded:', this.data.prices.length, 'points');
            return this.data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Generate simulated S&P 500 data
     */
    generateSimulatedData(startYear) {
        console.log('Generating simulated data starting from', startYear);
        
        const currentYear = new Date().getFullYear();
        const years = currentYear - startYear + 1;
        const totalDays = years * 252; // Trading days per year
        
        const dates = [];
        const prices = [];
        
        let price = 4000; // Starting price
        let currentDate = new Date(startYear, 0, 1);
        
        for (let i = 0; i < totalDays; i++) {
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Skip weekends
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }
            
            // Generate price movement
            const changePercent = (Math.random() - 0.5) * 0.04; // ±2% daily
            price = price * (1 + changePercent);
            price = Math.max(price, 3500); // Keep reasonable
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
            
            // Safety stop
            if (prices.length >= 1000) break;
        }
        
        // Ensure we have data
        if (prices.length === 0) {
            throw new Error('Failed to generate simulated data');
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 (Simulated)',
            prices: prices,
            source: 'Simulated Data'
        };
    }

    /**
     * Normalize data to 0-1 range
     */
    normalizeData() {
        console.log('Normalizing data...');
        
        if (!this.data || !this.data.prices) {
            throw new Error('No data loaded. Call fetchYahooFinanceData first.');
        }
        
        const prices = this.data.prices;
        
        // Find min and max
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        // Normalize
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Calculate returns
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            this.returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        console.log('✅ Data normalized');
        console.log('Min:', this.minValue.toFixed(2), 'Max:', this.maxValue.toFixed(2));
    }

    /**
     * Prepare dataset for training
     */
    prepareDataset(sequenceLength = 60, predictionDays = 5, trainSplit = 0.8) {
        console.log('Preparing dataset...');
        
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData first.');
        }
        
        const totalSamples = this.normalizedData.length - sequenceLength - predictionDays;
        
        if (totalSamples <= 0) {
            throw new Error('Not enough data for training');
        }
        
        const samples = [];
        const labels = [];
        
        // Create sliding windows
        for (let i = 0; i < totalSamples; i++) {
            const input = this.normalizedData.slice(i, i + sequenceLength);
            const futureReturns = this.returns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            const output = futureReturns.map(ret => ret > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }
        
        // Split into train/test
        const splitIndex = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIndex}, (_, i) => i + splitIndex);
        
        console.log('Total samples:', samples.length);
        console.log('Train samples:', splitIndex);
        console.log('Test samples:', samples.length - splitIndex);
        
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
            [samples.length - splitIndex, 1, sequenceLength]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIndex, predictionDays]
        );
        
        console.log('✅ Dataset prepared');
        console.log('X_train shape:', this.X_train.shape);
        console.log('y_train shape:', this.y_train.shape);
    }

    /**
     * Get statistics about the data - FIXED VERSION
     */
    getStatistics() {
        console.log('Getting statistics...');
        
        if (!this.data || !this.data.prices) {
            console.log('No data available for statistics');
            return {
                symbol: 'No data loaded',
                numDays: 0,
                currentPrice: 'N/A',
                dateRange: { start: 'N/A', end: 'N/A' },
                priceRange: { min: 'N/A', max: 'N/A' },
                returns: {
                    average: 'N/A',
                    positiveDays: 0,
                    totalDays: 0,
                    positiveRate: '0%'
                },
                trainSamples: 0,
                testSamples: 0,
                normalized: false
            };
        }
        
        const prices = this.data.prices || [];
        const returns = this.returns || [];
        const dates = this.data.dates || [];
        
        // Calculate statistics with null checks
        let totalReturn = 0;
        let positiveDays = 0;
        
        for (const ret of returns) {
            if (typeof ret === 'number') {
                totalReturn += ret;
                if (ret > 0) positiveDays++;
            }
        }
        
        const avgReturn = returns.length > 0 ? totalReturn / returns.length : 0;
        const positiveRate = returns.length > 0 ? (positiveDays / returns.length) * 100 : 0;
        
        // Format values with null checks
        const currentPrice = prices.length > 0 ? '$' + prices[prices.length - 1].toFixed(2) : 'N/A';
        const minPrice = prices.length > 0 ? '$' + Math.min(...prices).toFixed(2) : 'N/A';
        const maxPrice = prices.length > 0 ? '$' + Math.max(...prices).toFixed(2) : 'N/A';
        const startDate = dates.length > 0 ? dates[0] : 'N/A';
        const endDate = dates.length > 0 ? dates[dates.length - 1] : 'N/A';
        
        return {
            symbol: this.data.symbol || 'Unknown',
            source: this.data.source || 'Simulated',
            numDays: prices.length || 0,
            currentPrice: currentPrice,
            dateRange: {
                start: startDate,
                end: endDate
            },
            priceRange: {
                min: minPrice,
                max: maxPrice
            },
            returns: {
                average: (avgReturn * 100).toFixed(2) + '%',
                positiveDays: positiveDays,
                totalDays: returns.length,
                positiveRate: positiveRate.toFixed(1) + '%'
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0,
            normalized: this.normalizedData !== null
        };
    }

    /**
     * Get the latest sequence for prediction
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error('Not enough normalized data for prediction');
        }
        
        const latestSequence = this.normalizedData.slice(-sequenceLength);
        return tf.tensor3d([[latestSequence]], [1, 1, sequenceLength]);
    }

    /**
     * Get price data for visualization
     */
    getPriceData(maxPoints = 200) {
        if (!this.data || !this.data.prices || !this.data.dates) {
            return [];
        }
        
        const { dates, prices } = this.data;
        
        // Sample data if too many points
        if (dates.length <= maxPoints) {
            return dates.map((date, idx) => ({
                date: date || 'N/A',
                price: prices[idx] || 0
            }));
        }
        
        const step = Math.ceil(dates.length / maxPoints);
        const result = [];
        
        for (let i = 0; i < dates.length; i += step) {
            result.push({
                date: dates[i] || 'N/A',
                price: prices[i] || 0
            });
        }
        
        // Always include last point
        if (result.length > 0 && result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({
                date: dates[dates.length - 1] || 'N/A',
                price: prices[prices.length - 1] || 0
            });
        }
        
        return result;
    }

    /**
     * Clean up memory
     */
    dispose() {
        console.log('Cleaning up DataLoader memory...');
        
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        
        for (const tensor of tensors) {
            if (tensor && tensor.dispose) {
                try {
                    tensor.dispose();
                } catch (e) {
                    // Ignore disposal errors
                }
            }
        }
        
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
    }
}
