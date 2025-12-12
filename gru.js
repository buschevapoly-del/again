// gru.js
/**
 * GRU Model Module for Stock Prediction
 * Defines, trains, and evaluates the GRU model
 */
export class GRUModel {
    constructor(sequenceLength = 60, numFeatures = 1, predictionDays = 5) {
        this.sequenceLength = sequenceLength;
        this.numFeatures = numFeatures;
        this.predictionDays = predictionDays;
        this.model = null;
        this.history = null;
        this.isTrained = false;
        
        // Training configuration
        this.config = {
            epochs: 100,
            batchSize: 32,
            validationSplit: 0.2,
            learningRate: 0.001,
            earlyStopping: true,
            patience: 15
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
        
        // Input shape: [batch, 1, sequenceLength] - single feature (price)
        this.model.add(tf.layers.gru({
            units: 128,
            returnSequences: true,
            activation: 'tanh',
            recurrentDropout: 0.2,
            inputShape: [this.numFeatures, this.sequenceLength]
        }));
        
        // Batch normalization
        this.model.add(tf.layers.batchNormalization());
        
        // Second GRU layer
        this.model.add(tf.layers.gru({
            units: 64,
            returnSequences: false,
            activation: 'tanh',
            recurrentDropout: 0.2
        }));
        
        // Dropout for regularization
        this.model.add(tf.layers.dropout({rate: 0.3}));
        
        // Dense layers
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({l2: 0.001})
        }));
        
        this.model.add(tf.layers.batchNormalization());
        
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
            metrics: [
                'accuracy',
                tf.metrics.binaryAccuracy,
                tf.metrics.precision,
                tf.metrics.recall
            ]
        });
        
        console.log('GRU model built successfully');
        return this.model;
    }

    /**
     * Train the model
     * @param {tf.Tensor} X_train - Training features
     * @param {tf.Tensor} y_train - Training labels
     * @param {Function} onEpochEnd - Callback for epoch updates
     * @returns {Promise<Object>} Training history
     */
    async train(X_train, y_train, onEpochEnd = null) {
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }

        console.log('Starting training...');
        console.log(`Training data shape: ${X_train.shape}`);
        console.log(`Labels shape: ${y_train.shape}`);
        
        // Calculate steps per epoch
        const stepsPerEpoch = Math.ceil(X_train.shape[0] / this.config.batchSize);
        
        const callbacks = {
            onEpochEnd: async (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}/${this.config.epochs}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A'}, acc = ${logs.acc ? logs.acc.toFixed(4) : 'N/A'}`);
                
                if (onEpochEnd) {
                    onEpochEnd(epoch + 1, logs, stepsPerEpoch);
                }
                
                // Force garbage collection
                await tf.nextFrame();
            },
            onTrainEnd: (logs) => {
                console.log('Training completed');
            }
        };

        // Add early stopping callback if enabled
        if (this.config.earlyStopping) {
            callbacks.onEpochEnd = async (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}/${this.config.epochs}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A'}`);
                
                if (onEpochEnd) {
                    onEpochEnd(epoch + 1, logs, stepsPerEpoch);
                }
                
                await tf.nextFrame();
            };
        }

        this.history = await this.model.fit(X_train, y_train, {
            epochs: this.config.epochs,
            batchSize: this.config.batchSize,
            validationSplit: this.config.validationSplit,
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
        const precision = results[3]?.dataSync()[0] || 0;
        const recall = results[4]?.dataSync()[0] || 0;
        
        // Calculate F1 score
        const f1Score = precision + recall > 0 ? 
            2 * (precision * recall) / (precision + recall) : 0;
        
        // Calculate predictions for additional metrics
        const predictions = this.model.predict(X_test);
        const predData = predictions.dataSync();
        const trueData = y_test.dataSync();
        
        let correct = 0;
        let total = 0;
        let truePositives = 0;
        let falsePositives = 0;
        let trueNegatives = 0;
        let falseNegatives = 0;
        
        for (let i = 0; i < predData.length; i++) {
            const pred = predData[i] > 0.5 ? 1 : 0;
            const trueVal = trueData[i];
            
            if (pred === trueVal) correct++;
            
            if (pred === 1 && trueVal === 1) truePositives++;
            else if (pred === 1 && trueVal === 0) falsePositives++;
            else if (pred === 0 && trueVal === 0) trueNegatives++;
            else if (pred === 0 && trueVal === 1) falseNegatives++;
            
            total++;
        }
        
        const binaryAccuracy = correct / total;
        
        // Calculate RMSE
        const mse = tf.metrics.meanSquaredError(y_test, predictions).dataSync()[0];
        const rmse = Math.sqrt(mse);
        
        // Clean up
        predictions.dispose();
        results.forEach(r => r.dispose());
        
        return {
            loss: loss,
            accuracy: accuracy,
            binaryAccuracy: binaryAccuracy,
            precision: precision,
            recall: recall,
            f1Score: f1Score,
            rmse: rmse,
            confusionMatrix: {
                truePositives: truePositives,
                falsePositives: falsePositives,
                trueNegatives: trueNegatives,
                falseNegatives: falseNegatives
            }
        };
    }

    /**
     * Make predictions for the next 5 days
     * @param {tf.Tensor} input - Input tensor of shape [1, 1, sequenceLength]
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
                confidence: Math.abs(prob - 0.5) * 2, // Normalize to 0-1
                direction: prob > 0.5 ? 'UP' : 'DOWN',
                strength: prob > 0.5 ? prob : 1 - prob
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
            const models = await tf.io.listModels();
            if (!models['indexeddb://sp500-gru-model']) {
                return false;
            }
            
            this.model = await tf.loadLayersModel('indexeddb://sp500-gru-model');
            console.log('Model loaded successfully');
            
            // Update model parameters based on loaded model
            const inputShape = this.model.layers[0].batchInputShape;
            this.sequenceLength = inputShape[2];
            this.numFeatures = inputShape[1];
            this.predictionDays = this.model.layers[this.model.layers.length - 1].units;
            
            // Recompile the loaded model
            const optimizer = tf.train.adam(this.config.learningRate);
            this.model.compile({
                optimizer: optimizer,
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });
            
            this.isTrained = true;
            return true;
        } catch (error) {
            console.log('No saved model found:', error);
            return false;
        }
    }

    /**
     * Get model predictions with uncertainty estimation
     * @param {tf.Tensor} input - Input tensor
     * @param {number} samples - Number of Monte Carlo samples for uncertainty
     * @returns {Object} Predictions with uncertainty
     */
    async predictWithUncertainty(input, samples = 10) {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained');
        }

        const predictions = [];
        
        // Multiple forward passes for uncertainty estimation
        for (let i = 0; i < samples; i++) {
            const pred = this.model.predict(input);
            predictions.push(pred);
            await tf.nextFrame(); // Prevent blocking
        }
        
        // Stack predictions and calculate statistics
        const stacked = tf.stack(predictions);
        const mean = stacked.mean(0);
        const std = stacked.std(0);
        
        const meanData = mean.dataSync();
        const stdData = std.dataSync();
        
        // Clean up
        predictions.forEach(p => p.dispose());
        stacked.dispose();
        mean.dispose();
        std.dispose();
        
        const results = [];
        for (let i = 0; i < this.predictionDays; i++) {
            results.push({
                day: i + 1,
                meanProbability: meanData[i],
                uncertainty: stdData[i],
                prediction: meanData[i] > 0.5 ? 1 : 0,
                confidenceInterval: [
                    Math.max(0, meanData[i] - 1.96 * stdData[i]),
                    Math.min(1, meanData[i] + 1.96 * stdData[i])
                ]
            });
        }
        
        return results;
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
            numFeatures: this.numFeatures,
            predictionDays: this.predictionDays,
            isTrained: this.isTrained,
            totalParams: this.model ? this.model.countParams() : 0
        };
    }
}
