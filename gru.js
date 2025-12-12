// gru.js
/**
 * GRU Model Module for Stock Prediction
 * Defines, trains, and evaluates the GRU model
 */
export class GRUModel {
    constructor(sequenceLength = 60, numStocks = 1, predictionDays = 5) {
        this.sequenceLength = sequenceLength;
        this.numStocks = numStocks;
        this.predictionDays = predictionDays;
        this.model = null;
        this.history = null;
        this.isTrained = false;
        
        // Training configuration
        this.config = {
            epochs: 50,
            batchSize: 32,
            validationSplit: 0.2,
            learningRate: 0.001
        };
    }

    /**
     * Build and compile the GRU model
     */
    buildModel() {
        // Clear any existing model
        if (this.model) {
            this.model.dispose();
        }

        this.model = tf.sequential();
        
        // Input shape: [batch, numStocks, sequenceLength]
        this.model.add(tf.layers.reshape({
            inputShape: [this.numStocks, this.sequenceLength],
            targetShape: [this.numStocks, this.sequenceLength]
        }));
        
        // First GRU layer with return sequences
        this.model.add(tf.layers.gru({
            units: 64,
            returnSequences: true,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({l2: 0.01}),
            inputShape: [this.numStocks, this.sequenceLength]
        }));
        
        // Dropout for regularization
        this.model.add(tf.layers.dropout({rate: 0.3}));
        
        // Second GRU layer
        this.model.add(tf.layers.gru({
            units: 32,
            activation: 'relu'
        }));
        
        // Dense layer
        this.model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Output layer: 5 units for 5-day prediction (binary classification per day)
        this.model.add(tf.layers.dense({
            units: this.predictionDays,
            activation: 'sigmoid'
        }));
        
        // Compile model
        const optimizer = tf.train.adam(this.config.learningRate);
        this.model.compile({
            optimizer: optimizer,
            loss: 'binaryCrossentropy',
            metrics: ['accuracy', 'mse']
        });
        
        console.log('GRU model built successfully');
        this.model.summary();
    }

    /**
     * Train the model
     * @param {tf.Tensor} X_train - Training features
     * @param {tf.Tensor} y_train - Training labels
     * @param {tf.Tensor} X_val - Validation features
     * @param {tf.Tensor} y_val - Validation labels
     * @param {Function} onEpochEnd - Callback for epoch updates
     * @returns {Promise<Object>} Training history
     */
    async train(X_train, y_train, X_val = null, y_val = null, onEpochEnd = null) {
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }

        console.log('Starting training...');
        
        const callbacks = {
            onEpochEnd: async (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}/${this.config.epochs}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A'}`);
                
                if (onEpochEnd) {
                    onEpochEnd(epoch + 1, logs);
                }
                
                // Force garbage collection
                await tf.nextFrame();
            }
        };

        let validationData = null;
        if (X_val && y_val) {
            validationData = [X_val, y_val];
        }

        this.history = await this.model.fit(X_train, y_train, {
            epochs: this.config.epochs,
            batchSize: this.config.batchSize,
            validationSplit: validationData ? 0 : this.config.validationSplit,
            validationData: validationData,
            callbacks: callbacks,
            shuffle: true,
            verbose: 0
        });

        this.isTrained = true;
        console.log('Training completed');
        
        return this.history;
    }

    /**
     * Evaluate model on test data
     * @param {tf.Tensor} X_test - Test features
     * @param {tf.Tensor} y_test - Test labels
     * @returns {Object} Evaluation metrics
     */
    evaluate(X_test, y_test) {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained. Call train first.');
        }

        const results = this.model.evaluate(X_test, y_test, {
            batchSize: this.config.batchSize,
            verbose: 0
        });
        
        const loss = results[0].dataSync()[0];
        const accuracy = results[1].dataSync()[0];
        const mse = results[2].dataSync()[0];
        const rmse = Math.sqrt(mse);
        
        // Calculate additional metrics
        const predictions = this.model.predict(X_test);
        const predData = predictions.dataSync();
        const trueData = y_test.dataSync();
        
        let correct = 0;
        let total = 0;
        
        for (let i = 0; i < predData.length; i++) {
            const pred = predData[i] > 0.5 ? 1 : 0;
            const trueVal = trueData[i];
            if (pred === trueVal) correct++;
            total++;
        }
        
        const binaryAccuracy = correct / total;
        
        // Clean up
        predictions.dispose();
        results.forEach(r => r.dispose());
        
        return {
            loss: loss,
            accuracy: accuracy,
            binaryAccuracy: binaryAccuracy,
            mse: mse,
            rmse: rmse
        };
    }

    /**
     * Make predictions for the next 5 days
     * @param {tf.Tensor} input - Input tensor of shape [1, numStocks, sequenceLength]
     * @returns {Array} Predictions for next 5 days with confidence scores
     */
    predict(input) {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained. Call train first.');
        }

        const prediction = this.model.predict(input);
        const values = prediction.dataSync();
        prediction.dispose();
        
        // Format predictions: each value is probability of positive return
        const predictions = [];
        for (let i = 0; i < this.predictionDays; i++) {
            const prob = values[i];
            predictions.push({
                day: i + 1,
                probability: prob,
                prediction: prob > 0.5 ? 1 : 0,
                confidence: Math.abs(prob - 0.5) * 2 // Normalize to 0-1
            });
        }
        
        return predictions;
    }

    /**
     * Save model weights to IndexedDB
     * @returns {Promise<boolean>} Success status
     */
    async saveModel() {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained. Cannot save.');
        }

        try {
            await this.model.save('indexeddb://sp500-gru-model');
            console.log('Model saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save model:', error);
            return false;
        }
    }

    /**
     * Load model weights from IndexedDB
     * @returns {Promise<boolean>} Success status
     */
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('indexeddb://sp500-gru-model');
            console.log('Model loaded successfully');
            
            // Recompile the loaded model
            const optimizer = tf.train.adam(this.config.learningRate);
            this.model.compile({
                optimizer: optimizer,
                loss: 'binaryCrossentropy',
                metrics: ['accuracy', 'mse']
            });
            
            this.isTrained = true;
            return true;
        } catch (error) {
            console.log('No saved model found:', error);
            return false;
        }
    }

    /**
     * Clean up model and release memory
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.history = null;
        this.isTrained = false;
    }

    /**
     * Get model configuration
     * @returns {Object} Model configuration
     */
    getConfig() {
        return {
            ...this.config,
            sequenceLength: this.sequenceLength,
            numStocks: this.numStocks,
            predictionDays: this.predictionDays,
            isTrained: this.isTrained
        };
    }
}
