// gru.js - SIMPLE GRU MODEL
export class GRUModel {
    constructor() {
        console.log('✅ GRUModel created');
        this.model = null;
        this.isTrained = false;
        this.lossHistory = [];
    }

    buildModel(inputShape) {
        console.log('🏗️ Building GRU model...');
        
        if (this.model) {
            this.model.dispose();
        }
        
        this.model = tf.sequential();
        
        // GRU Layer
        this.model.add(tf.layers.gru({
            units: 64,
            inputShape: inputShape,
            returnSequences: false
        }));
        
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Dense Layer
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        // Output Layer (single value prediction)
        this.model.add(tf.layers.dense({
            units: 1
        }));
        
        // Compile for regression
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
        });
        
        console.log('✅ Model built');
        return this.model;
    }

    async train(X_train, y_train, X_val, y_val, onEpoch) {
        if (!this.model) {
            throw new Error('Build model first');
        }
        
        console.log('🎯 Starting training...');
        this.lossHistory = [];
        
        const epochs = 30;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Train one epoch
            const history = await this.model.fit(X_train, y_train, {
                epochs: 1,
                batchSize: 32,
                shuffle: true,
                verbose: 0
            });
            
            const trainLoss = history.history.loss[0];
            
            // Validation loss
            const valResults = this.model.evaluate(X_val, y_val, {verbose: 0});
            const valLoss = valResults[0].dataSync()[0];
            
            this.lossHistory.push({ epoch: epoch + 1, trainLoss, valLoss });
            
            // Callback for UI updates
            if (onEpoch) {
                onEpoch(epoch + 1, epochs, trainLoss, valLoss);
            }
            
            // Cleanup
            valResults.forEach(r => r.dispose());
            
            console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${trainLoss.toFixed(6)}, Val: ${valLoss.toFixed(6)}`);
            
            // Early stopping
            if (epoch > 5 && trainLoss < 0.0001) {
                console.log('✅ Early stopping');
                break;
            }
        }
        
        this.isTrained = true;
        console.log('✅ Training complete');
        
        return this.lossHistory;
    }

    evaluate(X_test, y_test) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        console.log('📊 Evaluating model...');
        
        const results = this.model.evaluate(X_test, y_test, {verbose: 0});
        const loss = results[0].dataSync()[0];
        
        // Predictions
        const predictions = this.model.predict(X_test);
        const yPred = predictions.dataSync();
        const yTrue = y_test.dataSync();
        
        // Direction accuracy
        let correct = 0;
        for (let i = 0; i < yTrue.length; i++) {
            if ((yTrue[i] > 0 && yPred[i] > 0) || (yTrue[i] < 0 && yPred[i] < 0)) {
                correct++;
            }
        }
        
        const accuracy = (correct / yTrue.length) * 100;
        
        // RMSE
        let sumSq = 0;
        for (let i = 0; i < yTrue.length; i++) {
            sumSq += Math.pow(yTrue[i] - yPred[i], 2);
        }
        const rmse = Math.sqrt(sumSq / yTrue.length);
        
        predictions.dispose();
        results.forEach(r => r.dispose());
        
        return {
            loss: loss.toFixed(6),
            rmse: rmse.toFixed(6),
            accuracy: accuracy.toFixed(2) + '%',
            samples: yTrue.length
        };
    }

    predict(input) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const prediction = this.model.predict(input);
        const value = prediction.dataSync()[0];
        prediction.dispose();
        
        return {
            value: value,
            direction: value > 0 ? 'UP' : 'DOWN',
            confidence: Math.min(Math.abs(value) * 20, 100).toFixed(1) + '%'
        };
    }

    predictSequence(input, steps = 5) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const predictions = [];
        let currentInput = input.clone();
        
        for (let i = 0; i < steps; i++) {
            const pred = this.predict(currentInput);
            
            predictions.push({
                day: i + 1,
                value: pred.value,
                direction: pred.direction,
                confidence: pred.confidence
            });
            
            // Update sequence for next prediction
            if (i < steps - 1) {
                const currentData = currentInput.dataSync();
                const newSeq = Array.from(currentData).slice(1);
                newSeq.push(pred.value);
                
                currentInput.dispose();
                currentInput = tf.tensor3d([newSeq], [1, 1, newSeq.length]);
            }
        }
        
        currentInput.dispose();
        return predictions;
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
        }
    }
}
