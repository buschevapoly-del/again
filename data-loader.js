// data-loader.js - COMPLETE WORKING VERSION
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
        this.trainIndices = null;
        this.testIndices = null;
        this.symbol = '^GSPC';
        this.isFetching = false;
    }

    /**
     * Fetch S&P 500 data - SIMPLE, NO RECURSION
     */
    async fetchYahooFinanceData(startYear = 2020) {
        console.log('Fetching data...');
        
        if (this.isFetching) {
            console.log('Already fetching, returning existing data');
            return this.data;
        }
        
        this.isFetching = true;
        
        try {
            // Try to get real data
            const data = await this.fetchSimpleData(startYear);
            this.data = data;
            console.log(`✅ Got ${data.prices.length} data points`);
            return data;
        } catch (error) {
            console.log('Using simulated data:', error.message);
            const simulated = this.generateSimpleSimulatedData(startYear);
            this.data = simulated;
            return simulated;
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Try to fetch real data
     */
    async fetchSimpleData(startYear) {
        // Use recent data (2 years) to avoid CORS issues
        const actualYear = Math.max(startYear, new Date().getFullYear() - 2);
        const startDate = new Date(actualYear, 0, 1);
        const endDate = new Date();
        
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);
        
        // Use SPY ETF instead of ^GSPC (more reliable)
        const url = `https://query1.finance.yahoo.com/v7/finance/download/SPY?period1=${period1}&period2=${period2}&interval=1d&events=history`;
        
        console.log('Fetching from:', url);
        
        try {
            const response = await fetch(url, { 
                mode: 'cors',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csv = await response.text();
            const rows = csv.trim().split('\n');
            
            if (rows.length <= 1) {
                throw new Error('Empty CSV response');
            }
            
            const dates = [];
            const prices = [];
            
            // Parse CSV (Date,Open,High,Low,Close,Adj Close,Volume)
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length >= 5) {
                    const date = cols[0];
                    const close = parseFloat(cols[4]); // Close price
                    
                    if (!isNaN(close) && close > 0) {
                        dates.push(date);
                        prices.push(close);
                    }
                }
            }
            
            if (dates.length === 0) {
                throw new Error('No valid data found');
            }
            
            return {
                dates: dates,
                symbol: 'SPY (S&P 500 ETF)',
                prices: prices,
                source: 'Yahoo Finance'
            };
            
        } catch (error) {
            console.log('Fetch failed:', error.message);
            throw error; // Let caller handle it
        }
    }

    /**
     * Generate simulated data - NO RECURSION
     */
    generateSimpleSimulatedData(startYear) {
        console.log('Generating simulated data...');
        
        // Fixed number of points
        const years = 3;
        const totalPoints = years * 252;
        
        const dates = [];
        const prices = [];
        
        let price = 4000;
        let currentDate = new Date(startYear, 0, 1);
        
        // Simple loop - NO recursion
        for (let i = 0; i < totalPoints; i++) {
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Skip weekends
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }
            
            // Simple price movement
            const change = (Math.random() - 0.5) * 50;
            price += change;
            price = Math.max(price, 3500);
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
            
            // Safety stop
            if (prices.length >= 500) break;
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
        if (!this.data || !this.data.prices) {
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
        
        // Normalize
        this.normalizedData = new Array(prices.length);
        const range = this.maxValue - this.minValue;
        
        for (let i = 0; i < prices.length; i++) {
            this.normalizedData[i] = (prices[i] - this.minValue) / range;
        }
        
        // Calculate returns
        this.returns = new Array(prices.length - 1);
        for (let i = 1; i < prices.length; i++) {
            this.returns[i-1] = (prices[i] - prices[i-1]) / prices[i-1];
        }
        
        console.log(`Normalized ${prices.length} prices`);
    }

    /**
     * Prepare dataset for training
     */
    prepareDataset(sequenceLength = 60, predictionDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData first.');
        }
        
        const totalSamples = this.normalizedData.length - sequenceLength - predictionDays;
        
        if (totalSamples <= 0) {
            throw new Error(`Not enough data. Need ${sequenceLength + predictionDays} points`);
        }
        
        console.log(`Preparing dataset from ${this.normalizedData.length} points...`);
        
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
        
        console.log(`Created ${samples.length} samples (${splitIndex} train, ${samples.length - splitIndex} test)`);
        
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
    }

    /**
     * Get latest sequence for prediction - MUST EXIST
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error('Not enough normalized data');
        }
        
        const latest = this.normalizedData.slice(-sequenceLength);
        return tf.tensor3d([[latest]], [1, 1, sequenceLength]);
    }

    /**
     * Get statistics - THIS WAS MISSING!
     */
    getStatistics() {
        if (!this.data) {
            return {
                symbol: 'No data loaded',
                numDays: 0,
                currentPrice: 0,
                status: 'Load data first'
            };
        }
        
        const prices = this.data.prices;
        const returns = this.returns || [];
        
        // Calculate basic stats
        let totalReturn = 0;
        let positiveDays = 0;
        
        for (const ret of returns) {
            totalReturn += ret;
            if (ret > 0) positiveDays++;
        }
        
        const avgReturn = returns.length > 0 ? totalReturn / returns.length : 0;
        
        return {
            symbol: this.data.symbol,
            source: this.data.source || 'Unknown',
            numDays: prices.length,
            currentPrice: prices[prices.length - 1].toFixed(2),
            dateRange: {
                start: this.data.dates[0] || 'N/A',
                end: this.data.dates[this.data.dates.length - 1] || 'N/A'
            },
            priceRange: {
                min: Math.min(...prices).toFixed(2),
                max: Math.max(...prices).toFixed(2)
            },
            returns: {
                average: (avgReturn * 100).toFixed(2) + '%',
                positiveDays: positiveDays,
                totalDays: returns.length,
                positiveRate: returns.length > 0 ? ((positiveDays / returns.length) * 100).toFixed(1) + '%' : '0%'
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0
        };
    }

    /**
     * Denormalize price - FOR COMPLETENESS
     */
    denormalizePrice(normalizedValue) {
        if (this.minValue === null || this.maxValue === null) {
            return normalizedValue;
        }
        return normalizedValue * (this.maxValue - this.minValue) + this.minValue;
    }

    /**
     * Get price data for charts
     */
    getPriceData(maxPoints = 200) {
        if (!this.data) return [];
        
        const { dates, prices } = this.data;
        
        if (dates.length <= maxPoints) {
            return dates.map((date, i) => ({
                date: date,
                price: prices[i]
            }));
        }
        
        // Sample data
        const step = Math.ceil(dates.length / maxPoints);
        const result = [];
        
        for (let i = 0; i < dates.length; i += step) {
            result.push({
                date: dates[i],
                price: prices[i]
            });
        }
        
        // Add last point
        if (result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({
                date: dates[dates.length - 1],
                price: prices[prices.length - 1]
            });
        }
        
        return result;
    }

    /**
     * Clean up memory
     */
    dispose() {
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
        
        console.log('Memory cleaned up');
    }
}
