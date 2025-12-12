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
        this.trainingLogs = [];
        
        // Training configuration - оптимизированные гиперпараметры
        this.config = {
            epochs: 20,  // Еще меньше для быстрого обучения
            batchSize: 32,
            validationSplit: 0.2,
            learningRate: 0.001,
            earlyStopping: false,  // Отключено для простоты
            patience: 5
        };
    }

    /**
     * Build and compile the GRU model - УПРОЩЕННАЯ АРХИТЕКТУРА
     */
    buildModel() {
        // Clear any existing model
        if (this.model) {
            this.model.dispose();
        }

        console.log(`Building GRU model with input shape: [${this.numFeatures}, ${this.sequenceLength}]`);
        
        try {
            this.model = tf.sequential();
            
            // Input shape: [batch, 1, sequenceLength] - single feature (price)
            // Упрощенная архитектура для лучшей работы в браузере
            this.model.add(tf.layers.gru({
                units: 32,
                returnSequences: false,
                activation: 'tanh',
                inputShape: [this.numFeatures, this.sequenceLength]
            }));
            
            // Dropout for regularization
            this.model.add(tf.layers.dropout({rate: 0.2}));
            
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
                metrics: ['accuracy']
            });
            
            console.log('✅ GRU model built successfully');
            this.printModelSummary();
            
            return this.model;
            
        } catch (error) {
            console.error('❌ Error building model:', error);
            throw error;
        }
    }

    /**
     * Print model summary
     */
    printModelSummary() {
        if (!this.model) {
            console.log('Model not built yet');
            return;
        }
        
        const totalParams = this.model.countParams();
        console.log(`Model total parameters: ${totalParams.toLocaleString()}`);
        console.log('Model layers:');
        this.model.layers.forEach((layer, i) => {
            console.log(`  Layer ${i}: ${layer.name} - ${layer.getClassName()}`);
        });
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
        
        this.trainingLogs = [];
        
        const callbacks = {
            onEpochEnd: async (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}/${this.config.epochs}: 
                    loss = ${logs.loss?.toFixed(4) || 'N/A'}, 
                    acc = ${logs.acc?.toFixed(4) || 'N/A'}, 
                    val_loss = ${logs.val_loss?.toFixed(4) || 'N/A'}, 
                    val_acc = ${logs.val_acc?.toFixed(4) || 'N/A'}`);
                
                this.trainingLogs.push({
                    epoch: epoch + 1,
                    loss: logs.loss,
                    acc: logs.acc,
                    val_loss: logs.val_loss,
                    val_acc: logs.val_acc
                });
                
                if (onEpochEnd) {
                    onEpochEnd(epoch + 1, logs, this.config.epochs);
                }
                
                // Force garbage collection
                await tf.nextFrame();
            }
        };

        try {
            this.history = await this.model.fit(X_train, y_train, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationSplit: this.config.validationSplit,
                callbacks: callbacks,
                shuffle: true,
                verbose: 0
            });

            this.isTrained = true;
            console.log('✅ Training completed');
            
            return this.history;
            
        } catch (error) {
            console.error('❌ Error during training:', error);
            throw error;
        }
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

        console.log('Evaluating model...');
        
        try {
            const results = this.model.evaluate(X_test, y_test, {
                batchSize: this.config.batchSize,
                verbose: 0
            });
            
            if (!results || results.length === 0) {
                throw new Error('Evaluation returned no results');
            }
            
            const loss = results[0]?.dataSync()[0] || 0;
            const accuracy = results[1]?.dataSync()[0] || 0;
            
            // Calculate additional metrics manually
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
            
            const binaryAccuracy = total > 0 ? correct / total : 0;
            
            // Calculate RMSE
            const mse = tf.metrics.meanSquaredError(y_test, predictions).dataSync()[0];
            const rmse = Math.sqrt(mse);
            
            // Clean up
            predictions.dispose();
            
            if (Array.isArray(results)) {
                results.forEach(r => {
                    if (r && r.dispose) r.dispose();
                });
            }
            
            const metrics = {
                loss: parseFloat(loss.toFixed(4)),
                accuracy: parseFloat(accuracy.toFixed(4)),
                binaryAccuracy: parseFloat(binaryAccuracy.toFixed(4)),
                rmse: parseFloat(rmse.toFixed(4)),
                mse: parseFloat(mse.toFixed(4))
            };
            
            console.log('✅ Evaluation completed:', metrics);
            return metrics;
            
        } catch (error) {
            console.error('❌ Error during evaluation:', error);
            return {
                loss: 0,
                accuracy: 0,
                binaryAccuracy: 0,
                rmse: 0,
                mse: 0
            };
        }
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

        console.log('Making predictions...');
        
        try {
            const prediction = this.model.predict(input);
            const values = prediction.dataSync();
            
            if (!values || values.length === 0) {
                throw new Error('Prediction returned no values');
            }
            
            // Format predictions: each value is probability of positive return
            const predictions = [];
            for (let i = 0; i < this.predictionDays; i++) {
                const prob = values[i] || 0;
                predictions.push({
                    day: i + 1,
                    probability: prob,
                    prediction: prob > 0.5 ? 1 : 0,
                    confidence: Math.abs(prob - 0.5) * 2, // Normalize to 0-1
                    direction: prob > 0.5 ? 'UP' : 'DOWN',
                    strength: prob > 0.5 ? prob : 1 - prob
                });
            }
            
            // Clean up
            prediction.dispose();
            
            console.log('✅ Predictions generated:', predictions);
            return predictions;
            
        } catch (error) {
            console.error('❌ Error during prediction:', error);
            // Return default predictions in case of error
            return Array.from({length: this.predictionDays}, (_, i) => ({
                day: i + 1,
                probability: 0.5,
                prediction: 0,
                confidence: 0,
                direction: 'UNKNOWN',
                strength: 0.5
            }));
        }
    }

    /**
     * Get model predictions with uncertainty estimation (упрощенная версия)
     * @param {tf.Tensor} input - Input tensor
     * @returns {Object} Predictions with uncertainty
     */
    async predictWithUncertainty(input) {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained');
        }

        console.log('Making predictions with uncertainty...');
        
        try {
            // Простая версия без множественных проходов
            const prediction = this.model.predict(input);
            const values = prediction.dataSync();
            
            const results = [];
            for (let i = 0; i < this.predictionDays; i++) {
                const prob = values[i] || 0;
                const uncertainty = 0.1; // Фиксированная неопределенность для простоты
                
                results.push({
                    day: i + 1,
                    meanProbability: prob,
                    uncertainty: uncertainty,
                    prediction: prob > 0.5 ? 1 : 0,
                    confidenceInterval: [
                        Math.max(0, prob - 1.96 * uncertainty),
                        Math.min(1, prob + 1.96 * uncertainty)
                    ]
                });
            }
            
            prediction.dispose();
            return results;
            
        } catch (error) {
            console.error('Error in predictWithUncertainty:', error);
            throw error;
        }
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
            console.log('✅ Model saved successfully to IndexedDB');
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
            // Check if model exists in IndexedDB
            const models = await tf.io.listModels();
            console.log('Available models:', models);
            
            if (!models['indexeddb://sp500-gru-model']) {
                console.log('No saved model found in IndexedDB');
                return false;
            }
            
            this.model = await tf.loadLayersModel('indexeddb://sp500-gru-model');
            console.log('✅ Model loaded successfully from IndexedDB');
            
            // Update model parameters based on loaded model
            const inputShape = this.model.layers[0].batchInputShape;
            if (inputShape) {
                this.sequenceLength = inputShape[2] || this.sequenceLength;
                this.numFeatures = inputShape[1] || this.numFeatures;
                this.predictionDays = this.model.layers[this.model.layers.length - 1].units || this.predictionDays;
            }
            
            // Recompile the loaded model
            const optimizer = tf.train.adam(this.config.learningRate);
            this.model.compile({
                optimizer: optimizer,
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });
            
            this.isTrained = true;
            console.log(`Loaded model configuration: seqLen=${this.sequenceLength}, features=${this.numFeatures}, predDays=${this.predictionDays}`);
            return true;
            
        } catch (error) {
            console.log('Error loading model:', error);
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
        this.trainingLogs = [];
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

    /**
     * Get training logs
     * @returns {Array} Training logs
     */
    getTrainingLogs() {
        return this.trainingLogs;
    }
}
