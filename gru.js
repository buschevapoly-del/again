// gru.js
export class GRUModel {
    constructor(sequenceLength = 60, numFeatures = 1, predictionDays = 5) {
        console.log('GRUModel initialized');
        this.sequenceLength = sequenceLength;
        this.numFeatures = numFeatures;
        this.predictionDays = predictionDays;
        this.model = null;
        this.history = null;
        this.isTrained = false;
        this.trainingLogs = [];
        
        // Training configuration
        this.config = {
            epochs: 20,
            batchSize: 32,
            validationSplit: 0.2,
            learningRate: 0.001
        };
    }

    /**
     * Build and compile the GRU model
     */
    buildModel() {
        console.log('Building GRU model...');
        
        // Clear existing model
        if (this.model) {
            this.model.dispose();
        }
        
        try {
            this.model = tf.sequential();
            
            // GRU layer
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
            
            // Output layer
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
            
            // Print model summary
            const totalParams = this.model.countParams();
            console.log('Total parameters:', totalParams.toLocaleString());
            
            return this.model;
            
        } catch (error) {
            console.error('Error building model:', error);
            throw error;
        }
    }

    /**
     * Train the model
     */
    async train(X_train, y_train, onEpochEnd = null) {
        console.log('Starting model training...');
        
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }
        
        console.log('Training data shape:', X_train.shape);
        console.log('Training labels shape:', y_train.shape);
        
        this.trainingLogs = [];
        
        try {
            this.history = await this.model.fit(X_train, y_train, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationSplit: this.config.validationSplit,
                shuffle: true,
                verbose: 0,
                callbacks: {
                    onEpochEnd: async (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}/${this.config.epochs} - loss: ${logs.loss.toFixed(4)}, val_loss: ${logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A'}`);
                        
                        this.trainingLogs.push({
                            epoch: epoch + 1,
                            loss: logs.loss,
                            val_loss: logs.val_loss,
                            acc: logs.acc,
                            val_acc: logs.val_acc
                        });
                        
                        if (onEpochEnd) {
                            onEpochEnd(epoch + 1, logs, this.config.epochs);
                        }
                        
                        // Force garbage collection
                        await tf.nextFrame();
                    }
                }
            });
            
            this.isTrained = true;
            console.log('✅ Model training completed');
            
            return this.history;
            
        } catch (error) {
            console.error('Error during training:', error);
            throw error;
        }
    }

    /**
     * Evaluate model on test data
     */
    evaluate(X_test, y_test) {
        console.log('Evaluating model...');
        
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained. Call train first.');
        }
        
        try {
            const results = this.model.evaluate(X_test, y_test, {
                batchSize: this.config.batchSize,
                verbose: 0
            });
            
            const loss = results[0].dataSync()[0];
            const accuracy = results[1].dataSync()[0];
            
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
            
            const binaryAccuracy = total > 0 ? correct / total : 0;
            
            // Calculate RMSE
            const mse = tf.metrics.meanSquaredError(y_test, predictions).dataSync()[0];
            const rmse = Math.sqrt(mse);
            
            // Clean up
            predictions.dispose();
            results.forEach(r => r.dispose());
            
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
            console.error('Error during evaluation:', error);
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
     * Make predictions
     */
    predict(input) {
        console.log('Making predictions...');
        
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained. Call train first.');
        }
        
        try {
            const prediction = this.model.predict(input);
            const values = prediction.dataSync();
            
            // Format predictions
            const predictions = [];
            for (let i = 0; i < this.predictionDays; i++) {
                const prob = values[i] || 0;
                predictions.push({
                    day: i + 1,
                    probability: prob,
                    prediction: prob > 0.5 ? 1 : 0,
                    confidence: Math.abs(prob - 0.5) * 2,
                    direction: prob > 0.5 ? 'UP' : 'DOWN',
                    strength: prob > 0.5 ? prob : 1 - prob
                });
            }
            
            prediction.dispose();
            console.log('✅ Predictions generated');
            return predictions;
            
        } catch (error) {
            console.error('Error during prediction:', error);
            // Return default predictions
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
     * Get model configuration
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
     */
    getTrainingLogs() {
        return this.trainingLogs;
    }

    /**
     * Clean up memory
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
}
