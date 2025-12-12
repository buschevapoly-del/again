// data-loader.js
/**
 * Data Loader Module for S&P 500 Stock Prediction
 * Handles CSV parsing, normalization, and dataset preparation
 */
export class DataLoader {
    constructor() {
        this.data = null;
        this.normalizedData = null;
        this.stockSymbols = [];
        this.dateIndex = [];
        this.minValues = null;
        this.maxValues = null;
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        this.trainIndices = null;
        this.testIndices = null;
    }

    /**
     * Load and parse CSV file from file input
     * @param {File} file - CSV file object
     * @returns {Promise<Object>} Parsed data with dates, symbols, and prices
     */
    async loadCSV(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const csvText = event.target.result;
                    const rows = csvText.split('\n').filter(row => row.trim());
                    
                    if (rows.length === 0) {
                        reject(new Error('CSV file is empty'));
                        return;
                    }

                    const headers = rows[0].split(',').map(h => h.trim());
                    
                    // Extract dates and stock symbols
                    this.dateIndex = rows.slice(1).map(row => row.split(',')[0].trim());
                    this.stockSymbols = headers.slice(1);
                    
                    // Parse price data
                    const prices = [];
                    for (let i = 1; i < rows.length; i++) {
                        const columns = rows[i].split(',');
                        const rowPrices = columns.slice(1).map(val => parseFloat(val.trim()));
                        prices.push(rowPrices);
                    }

                    // Transpose to [symbols, days]
                    const transposed = [];
                    for (let i = 0; i < this.stockSymbols.length; i++) {
                        transposed.push(prices.map(dayPrices => dayPrices[i]));
                    }

                    this.data = {
                        dates: this.dateIndex,
                        symbols: this.stockSymbols,
                        prices: transposed
                    };

                    console.log(`Loaded ${this.stockSymbols.length} stocks over ${this.dateIndex.length} days`);
                    resolve(this.data);
                } catch (error) {
                    reject(new Error(`CSV parsing failed: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Normalize price data using Min-Max scaling per stock
     */
    normalizeData() {
        if (!this.data) {
            throw new Error('No data loaded. Call loadCSV first.');
        }

        const { prices } = this.data;
        this.minValues = [];
        this.maxValues = [];
        this.normalizedData = [];

        // Normalize each stock independently
        for (let i = 0; i < prices.length; i++) {
            const stockPrices = prices[i];
            const min = Math.min(...stockPrices.filter(p => !isNaN(p)));
            const max = Math.max(...stockPrices.filter(p => !isNaN(p)));
            
            this.minValues.push(min);
            this.maxValues.push(max);
            
            // Apply Min-Max normalization
            const normalized = stockPrices.map(p => 
                isNaN(p) ? 0 : (p - min) / (max - min)
            );
            this.normalizedData.push(normalized);
        }

        console.log('Data normalized successfully');
    }

    /**
     * Calculate daily returns for a given price series
     * @param {Array} prices - Array of prices
     * @returns {Array} Daily returns
     */
    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            returns.push(ret);
        }
        return returns;
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

        const numStocks = this.normalizedData.length;
        const numDays = this.normalizedData[0].length;
        
        // Calculate returns for each stock
        const returns = [];
        for (let i = 0; i < numStocks; i++) {
            const originalPrices = this.data.prices[i];
            returns.push(this.calculateReturns(originalPrices));
        }

        // Create sliding window samples
        const samples = [];
        const labels = [];
        
        // We use the first stock (assumed to be S&P 500 index) as target
        const targetReturns = returns[0];
        
        for (let i = 0; i < numDays - sequenceLength - predictionDays; i++) {
            // Input: sequence of normalized prices for all stocks
            const input = [];
            for (let s = 0; s < numStocks; s++) {
                const seq = this.normalizedData[s].slice(i, i + sequenceLength);
                input.push(seq);
            }
            
            // Output: binary classification of next 5 days returns (1 if positive, 0 if negative)
            const futureReturns = targetReturns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            const output = futureReturns.map(ret => ret > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }

        // Split into training and testing sets
        const splitIndex = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIndex}, (_, i) => i + splitIndex);

        // Convert to tensors
        this.X_train = tf.tensor3d(
            this.trainIndices.map(idx => samples[idx]),
            [splitIndex, numStocks, sequenceLength]
        );
        
        this.y_train = tf.tensor2d(
            this.trainIndices.map(idx => labels[idx]),
            [splitIndex, predictionDays]
        );
        
        this.X_test = tf.tensor3d(
            this.testIndices.map(idx => samples[idx]),
            [samples.length - splitIndex, numStocks, sequenceLength]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIndex, predictionDays]
        );

        console.log(`Dataset prepared: ${samples.length} total samples`);
        console.log(`Training: ${splitIndex}, Testing: ${samples.length - splitIndex}`);
    }

    /**
     * Get dataset statistics
     * @returns {Object} Dataset statistics
     */
    getStatistics() {
        if (!this.data) return null;

        return {
            numStocks: this.stockSymbols.length,
            numDays: this.dateIndex.length,
            dateRange: {
                start: this.dateIndex[0],
                end: this.dateIndex[this.dateIndex.length - 1]
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0
        };
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
}
