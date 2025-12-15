// gru.js - GRU МОДЕЛЬ ДЛЯ ПРЕДСКАЗАНИЯ ДОХОДНОСТИ S&P 500
export class GRUModel {
    constructor() {
        console.log('GRUModel initialized for S&P 500 returns prediction');
        this.model = null;
        this.history = null;
        this.isTrained = false;
        this.trainingLosses = [];
        this.validationLosses = [];
        this.scaler = {
            mean: 0,
            std: 1
        };
        this.lookback = 20; // Окно для создания последовательностей
        this.forecastHorizon = 5; // Предсказываем на 5 дней вперед
    }

    /**
     * Подготовка данных для обучения (returns вместо цен)
     */
    prepareData(prices) {
        console.log('Preparing data for returns prediction...');
        
        // 1. Рассчитываем логарифмические доходности
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = Math.log(prices[i] / prices[i - 1]);
            returns.push(ret);
        }
        
        console.log(`Returns calculated: ${returns.length} points`);
        
        // 2. Нормализуем доходности
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length);
        
        this.scaler.mean = mean;
        this.scaler.std = std;
        
        const normalizedReturns = returns.map(r => (r - mean) / std);
        
        // 3. Создаем последовательности (X) и таргеты (y)
        const X = [];
        const y = [];
        
        for (let i = this.lookback; i < normalizedReturns.length - this.forecastHorizon + 1; i++) {
            // Вход: окно доходностей
            const sequence = normalizedReturns.slice(i - this.lookback, i);
            X.push(sequence);
            
            // Цель: кумулятивная доходность на следующие 5 дней
            const futureReturn = normalizedReturns.slice(i, i + this.forecastHorizon)
                .reduce((sum, r) => sum + r, 0);
            y.push(futureReturn);
        }
        
        console.log(`Created ${X.length} sequences with lookback=${this.lookback}, horizon=${this.forecastHorizon}`);
        
        // 4. Разделяем на train/val/test (70/15/15 как в коллабе)
        const n_samples = X.length;
        const train_size = Math.floor(n_samples * 0.7);
        const val_size = Math.floor(n_samples * 0.15);
        
        const X_train = X.slice(0, train_size);
        const y_train = y.slice(0, train_size);
        
        const X_val = X.slice(train_size, train_size + val_size);
        const y_val = y.slice(train_size, train_size + val_size);
        
        const X_test = X.slice(train_size + val_size);
        const y_test = y.slice(train_size + val_size);
        
        console.log(`Train: ${X_train.length}, Val: ${X_val.length}, Test: ${X_test.length}`);
        
        // 5. Преобразуем в тензоры
        const X_train_tensor = tf.tensor3d(X_train, [X_train.length, this.lookback, 1]);
        const y_train_tensor = tf.tensor2d(y_train, [y_train.length, 1]);
        
        const X_val_tensor = tf.tensor3d(X_val, [X_val.length, this.lookback, 1]);
        const y_val_tensor = tf.tensor2d(y_val, [y_val.length, 1]);
        
        const X_test_tensor = tf.tensor3d(X_test, [X_test.length, this.lookback, 1]);
        const y_test_tensor = tf.tensor2d(y_test, [y_test.length, 1]);
        
        return {
            X_train: X_train_tensor,
            y_train: y_train_tensor,
            X_val: X_val_tensor,
            y_val: y_val_tensor,
            X_test: X_test_tensor,
            y_test: y_test_tensor,
            returns: returns,
            normalizedReturns: normalizedReturns
        };
    }

    /**
     * Строит GRU модель для предсказания доходности (адаптировано из коллаба)
     */
    buildModel() {
        console.log('Building GRU regression model for returns...');
        
        if (this.model) {
            this.model.dispose();
        }
        
        this.model = tf.sequential();
        
        // Первый GRU слой (как в коллабе)
        this.model.add(tf.layers.gru({
            units: 128,
            returnSequences: true,
            inputShape: [this.lookback, 1]
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
        
        // Выходной слой (1 значение - кумулятивная доходность на 5 дней)
        this.model.add(tf.layers.dense({
            units: 1
        }));
        
        // Компиляция для регрессии (как в коллабе)
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
        });
        
        console.log('✅ Regression model for returns built');
        this.model.summary();
        
        return this.model;
    }

    /**
     * Walk-forward cross-validation (адаптировано из коллаба)
     */
    async walkForwardCV(X_train_val, y_train_val, n_folds = 4, epochs = 20, batch_size = 32) {
        console.log('Starting walk-forward CV...');
        
        const fold_size = Math.floor(X_train_val.shape[0] / (n_folds + 1));
        const rmses = [];
        
        for (let k = 0; k < n_folds; k++) {
            const train_end = fold_size * (k + 1);
            const val_end = Math.min(fold_size * (k + 2), X_train_val.shape[0]);
            
            // Извлекаем fold'ы
            const X_tr = X_train_val.slice([0, 0, 0], [train_end, this.lookback, 1]);
            const y_tr = y_train_val.slice([0, 0], [train_end, 1]);
            
            const X_val_fold = X_train_val.slice([train_end, 0, 0], [val_end - train_end, this.lookback, 1]);
            const y_val_fold = y_train_val.slice([train_end, 0], [val_end - train_end, 1]);
            
            // Создаем и обучаем модель на этом fold'е
            const foldModel = this.createFoldModel();
            
            // Ранняя остановка
            let bestValLoss = Infinity;
            let patienceCounter = 0;
            const patience = 5;
            let bestWeights = null;
            
            for (let epoch = 0; epoch < epochs; epoch++) {
                // Обучение
                const history = await foldModel.fit(X_tr, y_tr, {
                    epochs: 1,
                    batchSize: batch_size,
                    shuffle: true,
                    verbose: 0
                });
                
                // Валидация
                const valResults = foldModel.evaluate(X_val_fold, y_val_fold, {verbose: 0});
                const valLoss = valResults[0].dataSync()[0];
                
                // Ранняя остановка
                if (valLoss < bestValLoss) {
                    bestValLoss = valLoss;
                    patienceCounter = 0;
                    bestWeights = foldModel.getWeights();
                } else {
                    patienceCounter++;
                    if (patienceCounter >= patience) {
                        if (bestWeights) foldModel.setWeights(bestWeights);
                        break;
                    }
                }
                
                valResults.forEach(r => r.dispose());
            }
            
            // Предсказания и RMSE
            const y_pred = foldModel.predict(X_val_fold);
            const y_true_vals = await y_val_fold.data();
            const y_pred_vals = await y_pred.data();
            
            let sumSquaredError = 0;
            for (let i = 0; i < y_true_vals.length; i++) {
                const error = y_true_vals[i] - y_pred_vals[i];
                sumSquaredError += error * error;
            }
            const rmse = Math.sqrt(sumSquaredError / y_true_vals.length);
            rmses.push(rmse);
            
            console.log(`Fold ${k+1}/${n_folds} RMSE (normalized returns): ${rmse.toFixed(5)}`);
            
            // Очистка
            X_tr.dispose();
            y_tr.dispose();
            X_val_fold.dispose();
            y_val_fold.dispose();
            y_pred.dispose();
            foldModel.dispose();
        }
        
        const meanRMSE = rmses.reduce((a, b) => a + b, 0) / rmses.length;
        console.log(`Mean RMSE across folds: ${meanRMSE.toFixed(5)}`);
        
        return rmses;
    }
    
    createFoldModel() {
        const model = tf.sequential();
        model.add(tf.layers.gru({units: 128, returnSequences: true, inputShape: [this.lookback, 1]}));
        model.add(tf.layers.dropout({rate: 0.2}));
        model.add(tf.layers.gru({units: 64}));
        model.add(tf.layers.dropout({rate: 0.2}));
        model.add(tf.layers.dense({units: 32, activation: 'relu'}));
        model.add(tf.layers.dense({units: 1}));
        model.compile({optimizer: 'adam', loss: 'meanSquaredError'});
        return model;
    }

    /**
     * Обучает модель с ранней остановкой (финальное обучение как в коллабе)
     */
    async train(X_train_val, y_train_val, X_test, y_test, onEpochEnd = null) {
        console.log('Starting final model training...');
        
        if (!this.model) {
            this.buildModel();
        }
        
        this.trainingLosses = [];
        this.validationLosses = [];
        
        // Параметры для ранней остановки (как в коллабе)
        let bestValLoss = Infinity;
        let patienceCounter = 0;
        const patience = 8;
        const epochs = 50;
        const batchSize = 32;
        let bestWeights = null;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Одна эпоха обучения
            const history = await this.model.fit(X_train_val, y_train_val, {
                epochs: 1,
                batchSize: batchSize,
                shuffle: true,
                verbose: 0
            });
            
            const trainLoss = history.history.loss[0];
            
            // Валидация на тесте (как hold-out в коллабе)
            const valResults = this.model.evaluate(X_test, y_test, {verbose: 0});
            const valLoss = valResults[0].dataSync()[0];
            
            // Сохраняем метрики
            this.trainingLosses.push(trainLoss);
            this.validationLosses.push(valLoss);
            
            // Ранняя остановка
            if (valLoss < bestValLoss) {
                bestValLoss = valLoss;
                patienceCounter = 0;
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
            
            if ((epoch + 1) % 10 === 0) {
                console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${trainLoss.toFixed(6)}, Val Loss: ${valLoss.toFixed(6)}`);
            }
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
    evaluate(X_test, y_test, prices, dates) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        console.log('Evaluating model...');
        
        // Получаем предсказания (нормализованные доходности)
        const predictions = this.model.predict(X_test);
        const yPredNorm = predictions.dataSync();
        const yTrueNorm = y_test.dataSync();
        
        // Денормализуем
        const yPred = yPredNorm.map(r => (r * this.scaler.std * Math.sqrt(this.forecastHorizon)) + 
            (this.scaler.mean * this.forecastHorizon));
        const yTrue = yTrueNorm.map(r => (r * this.scaler.std * Math.sqrt(this.forecastHorizon)) + 
            (this.scaler.mean * this.forecastHorizon));
        
        // Рассчитываем RMSE в пространстве доходностей
        let sumSquaredError = 0;
        for (let i = 0; i < yTrue.length; i++) {
            const error = yTrue[i] - yPred[i];
            sumSquaredError += error * error;
        }
        const mse = sumSquaredError / yTrue.length;
        const rmseReturns = Math.sqrt(mse);
        
        // Рассчитываем точность направления
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
        
        // Восстанавливаем цены для визуализации (как в коллабе)
        const startIdx = prices.length - yTrue.length - this.lookback - this.forecastHorizon;
        const spxTest = [];
        const spxTestPred = [];
        const spxTestTrue = [];
        
        for (let i = 0; i < yTrue.length; i++) {
            const basePrice = prices[startIdx + i + this.lookback];
            spxTest.push(basePrice);
            
            // Истинная цена через 5 дней
            spxTestTrue.push(basePrice * Math.exp(yTrue[i]));
            
            // Прогнозируемая цена через 5 дней
            spxTestPred.push(basePrice * Math.exp(yPred[i]));
        }
        
        // RMSE в пространстве цен
        let priceSquaredError = 0;
        for (let i = 0; i < spxTestTrue.length; i++) {
            const error = spxTestTrue[i] - spxTestPred[i];
            priceSquaredError += error * error;
        }
        const rmsePrice = Math.sqrt(priceSquaredError / spxTestTrue.length);
        
        predictions.dispose();
        
        return {
            rmseReturns: rmseReturns.toFixed(6),
            rmsePrice: rmsePrice.toFixed(2),
            mse: mse.toFixed(6),
            directionAccuracy: directionAccuracy.toFixed(2) + '%',
            r2: r2.toFixed(4),
            samples: yTrue.length,
            predictions: {
                trueReturns: yTrue,
                predReturns: yPred,
                truePrices: spxTestTrue,
                predPrices: spxTestPred,
                basePrices: spxTest
            }
        };
    }

    /**
     * Делает предсказание для последней доступной последовательности
     */
    predictLatestSequence(prices) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        // Рассчитываем доходности
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = Math.log(prices[i] / prices[i - 1]);
            returns.push(ret);
        }
        
        // Нормализуем
        const normalizedReturns = returns.map(r => (r - this.scaler.mean) / this.scaler.std);
        
        // Берем последнее окно
        const lastSequence = normalizedReturns.slice(-this.lookback);
        
        // Создаем тензор
        const input = tf.tensor3d([lastSequence], [1, this.lookback, 1]);
        
        // Предсказываем
        const prediction = this.model.predict(input);
        const predNorm = prediction.dataSync()[0];
        
        // Денормализуем
        const predictedReturn = (predNorm * this.scaler.std * Math.sqrt(this.forecastHorizon)) + 
            (this.scaler.mean * this.forecastHorizon);
        
        // Очистка
        input.dispose();
        prediction.dispose();
        
        return {
            predictedReturn: predictedReturn,
            annualizedReturn: predictedReturn * (252 / this.forecastHorizon), // Годовая доходность
            direction: predictedReturn > 0 ? 'UP' : 'DOWN',
            confidence: Math.min(Math.abs(predictedReturn) * 100, 95).toFixed(1) + '%'
        };
    }

    /**
     * Делает предсказания на несколько дней впеward рекурсивно
     */
    predictSequence(prices, steps = 5) {
        const predictions = [];
        
        for (let i = 0; i < steps; i++) {
            // Каждый прогноз делаем на 5 дней вперед
            const pred = this.predictLatestSequence(prices);
            
            predictions.push({
                day: i + 1,
                predictedReturn: pred.predictedReturn,
                annualizedReturn: pred.annualizedReturn,
                direction: pred.direction,
                confidence: pred.confidence
            });
            
            // Для симуляции: обновляем цены с прогнозируемой доходностью
            // (в реальности мы бы ждали новые данные)
            const lastPrice = prices[prices.length - 1];
            const simulatedPrice = lastPrice * Math.exp(pred.predictedReturn / this.forecastHorizon);
            prices.push(simulatedPrice);
        }
        
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
