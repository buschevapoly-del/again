// gru.js - SIMPLIFIED GRU MODEL
export class GRUModel {
    constructor() {
        console.log('GRUModel initialized');
        this.model = null;
        this.isTrained = false;
    }

    /**
     * Строит модель GRU
     */
    buildModel() {
        console.log('Building GRU model...');
        
        if (this.model) {
            this.model.dispose();
        }
        
        this.model = tf.sequential();
        
        // GRU слой
        this.model.add(tf.layers.gru({
            units: 32,
            returnSequences: false,
            activation: 'tanh',
            inputShape: [1, 60]
        }));
        
        // Dropout для регуляризации
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Полносвязный слой
        this.model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Выходной слой (5 дней)
        this.model.add(tf.layers.dense({
            units: 5,
            activation: 'sigmoid'
        }));
        
        // Компиляция
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('✅ Model built successfully');
    }

    /**
     * Обучает модель
     */
    async train(X_train, y_train, onEpochEnd = null) {
        if (!this.model) {
            throw new Error('Build model first');
        }
        
        console.log('Training model...');
        
        const history = await this.model.fit(X_train, y_train, {
            epochs: 20,
            batchSize: 32,
            validationSplit: 0.2,
            shuffle: true,
            verbose: 0,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}/20 - loss: ${logs.loss.toFixed(4)}`);
                    if (onEpochEnd) {
                        onEpochEnd(epoch + 1, logs, 20);
                    }
                }
            }
        });
        
        this.isTrained = true;
        console.log('✅ Model trained');
        
        return history;
    }

    /**
     * Оценивает модель
     */
    evaluate(X_test, y_test) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const results = this.model.evaluate(X_test, y_test, {verbose: 0});
        const loss = results[0].dataSync()[0];
        const accuracy = results[1].dataSync()[0];
        
        // Рассчитываем RMSE
        const predictions = this.model.predict(X_test);
        const mse = tf.metrics.meanSquaredError(y_test, predictions).dataSync()[0];
        const rmse = Math.sqrt(mse);
        
        predictions.dispose();
        results.forEach(r => r.dispose());
        
        return {
            loss: loss.toFixed(4),
            accuracy: (accuracy * 100).toFixed(2) + '%',
            rmse: rmse.toFixed(4)
        };
    }

    /**
     * Делает предсказания
     */
    predict(input) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const prediction = this.model.predict(input);
        const values = prediction.dataSync();
        prediction.dispose();
        
        // Форматируем предсказания
        return [
            {
                day: 1,
                probability: values[0],
                prediction: values[0] > 0.5 ? 1 : 0,
                direction: values[0] > 0.5 ? 'UP' : 'DOWN'
            },
            {
                day: 2,
                probability: values[1],
                prediction: values[1] > 0.5 ? 1 : 0,
                direction: values[1] > 0.5 ? 'UP' : 'DOWN'
            },
            {
                day: 3,
                probability: values[2],
                prediction: values[2] > 0.5 ? 1 : 0,
                direction: values[2] > 0.5 ? 'UP' : 'DOWN'
            },
            {
                day: 4,
                probability: values[3],
                prediction: values[3] > 0.5 ? 1 : 0,
                direction: values[3] > 0.5 ? 'UP' : 'DOWN'
            },
            {
                day: 5,
                probability: values[4],
                prediction: values[4] > 0.5 ? 1 : 0,
                direction: values[4] > 0.5 ? 'UP' : 'DOWN'
            }
        ];
    }

    /**
     * Очищает память
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
        }
    }
}
