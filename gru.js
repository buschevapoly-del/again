// gru.js - GRU МОДЕЛЬ ДЛЯ ПРЕДСКАЗАНИЯ ДОХОДНОСТИ
export class GRUModel {
    constructor() {
        console.log('GRUModel initialized for returns prediction');
        this.model = null;
        this.history = null;
        this.isTrained = false;
        this.trainingLosses = [];
        this.validationLosses = [];
    }

    /**
     * Строит GRU модель для регрессии (предсказание доходности)
     */
    buildModel(inputShape) {
        console.log('Building GRU regression model...');
        
        if (this.model) {
            this.model.dispose();
        }
        
        this.model = tf.sequential();
        
        // Первый GRU слой
        this.model.add(tf.layers.gru({
            units: 128,
            returnSequences: true,
            inputShape: inputShape
        }));
        
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Второй GRU слой
        this.model.add(tf.layers.gru({
            units: 64
        }));
        
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Полносвязные слои
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        // Выходной слой (1 значение - предсказанная доходность)
        this.model.add(tf.layers.dense({
            units: 1
        }));
        
        // Компиляция для регрессии
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
        });
        
        console.log('✅ Regression model built');
        
        return this.model;
    }

    /**
     * Обучает модель с ранней остановкой
     */
    async train(X_train, y_train, X_val, y_val, epochs = 50, batchSize = 32, onEpochEnd = null) {
        if (!this.model) {
            throw new Error('Build model first');
        }
        
        console.log('Training model...');
        this.trainingLosses = [];
        this.validationLosses = [];
        
        // Параметры для ранней остановки
        let bestValLoss = Infinity;
        let patienceCounter = 0;
        const patience = 8;
        let bestWeights = null;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Одна эпоха обучения
            const history = await this.model.fit(X_train, y_train, {
                epochs: 1,
                batchSize: batchSize,
                shuffle: true,
                verbose: 0
            });
            
            const trainLoss = history.history.loss[0];
            
            // Валидация
            const valResults = this.model.evaluate(X_val, y_val, {verbose: 0});
            const valLoss = valResults[0].dataSync()[0];
            
            // Сохраняем метрики
            this.trainingLosses.push(trainLoss);
            this.validationLosses.push(valLoss);
            
            // Ранняя остановка
            if (valLoss < bestValLoss) {
                bestValLoss = valLoss;
                patienceCounter = 0;
                // Сохраняем лучшие веса
                bestWeights = this.model.getWeights();
            } else {
                patienceCounter++;
                if (patienceCounter >= patience) {
                    console.log(`Early stopping at epoch ${epoch + 1}`);
                    if (bestWeights) {
                        this.model.setWeights(bestWeights);
                    }
                    break;
                }
            }
            
            // Колбэк для обновления UI
            if (onEpochEnd) {
                onEpochEnd(epoch + 1, {
                    loss: trainLoss,
                    val_loss: valLoss,
                    patience: patienceCounter
                }, epochs);
            }
            
            // Освобождаем память
            valResults.forEach(r => r.dispose());
            
            console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${trainLoss.toFixed(6)}, Val Loss: ${valLoss.toFixed(6)}`);
        }
        
        this.history = {
            loss: this.trainingLosses,
            val_loss: this.validationLosses
        };
        
        this.isTrained = true;
        console.log('✅ Model training complete');
        
        return this.history;
    }

    /**
     * Оценивает модель на тестовых данных
     */
    evaluate(X_test, y_test) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        console.log('Evaluating model...');
        
        // Получаем предсказания
        const predictions = this.model.predict(X_test);
        const yPred = predictions.dataSync();
        const yTrue = y_test.dataSync();
        
        // Рассчитываем RMSE
        let sumSquaredError = 0;
        for (let i = 0; i < yTrue.length; i++) {
            const error = yTrue[i] - yPred[i];
            sumSquaredError += error * error;
        }
        const mse = sumSquaredError / yTrue.length;
        const rmse = Math.sqrt(mse);
        
        // Рассчитываем точность направления (sign accuracy)
        let correctDirection = 0;
        for (let i = 0; i < yTrue.length; i++) {
            if ((yTrue[i] > 0 && yPred[i] > 0) || (yTrue[i] < 0 && yPred[i] < 0)) {
                correctDirection++;
            }
        }
        const directionAccuracy = (correctDirection / yTrue.length) * 100;
        
        // Рассчитываем R-квадрат
        const yMean = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
        let totalSumSquares = 0;
        for (let i = 0; i < yTrue.length; i++) {
            totalSumSquares += Math.pow(yTrue[i] - yMean, 2);
        }
        const r2 = 1 - (sumSquaredError / totalSumSquares);
        
        predictions.dispose();
        
        return {
            rmse: rmse.toFixed(6),
            mse: mse.toFixed(6),
            directionAccuracy: directionAccuracy.toFixed(2) + '%',
            r2: r2.toFixed(4),
            samples: yTrue.length
        };
    }

    /**
     * Делает предсказание для одной последовательности
     */
    predict(input) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const prediction = this.model.predict(input);
        const value = prediction.dataSync()[0];
        prediction.dispose();
        
        return {
            predictedReturn: value,
            direction: value > 0 ? 'UP' : 'DOWN',
            confidence: Math.abs(value) * 10 // Простая метрика уверенности
        };
    }

    /**
     * Делает предсказания на несколько дней вперед (рекурсивно)
     */
    predictSequence(input, steps = 5) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        const predictions = [];
        let currentInput = input.clone();
        
        for (let i = 0; i < steps; i++) {
            const pred = this.model.predict(currentInput);
            const predValue = pred.dataSync()[0];
            
            predictions.push({
                day: i + 1,
                predictedReturn: predValue,
                direction: predValue > 0 ? 'UP' : 'DOWN',
                confidence: Math.min(Math.abs(predValue) * 15, 100).toFixed(1) + '%'
            });
            
            // Обновляем вход для следующего предсказания
            if (i < steps - 1) {
                // Сдвигаем последовательность
                const newData = currentInput.dataSync();
                const lookback = newData.length;
                
                // Создаем новую последовательность
                const newSequence = [];
                for (let j = 1; j < lookback; j++) {
                    newSequence.push(newData[j]);
                }
                newSequence.push(predValue);
                
                // Очищаем старый тензор
                currentInput.dispose();
                
                // Создаем новый
                currentInput = tf.tensor3d([newSequence], [1, 1, lookback]);
            }
            
            pred.dispose();
        }
        
        currentInput.dispose();
        
        return predictions;
    }

    /**
     * Возвращает историю обучения
     */
    getTrainingHistory() {
        return this.history;
    }

    /**
     * Очищает память
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
        }
        this.trainingLosses = [];
        this.validationLosses = [];
    }
}
