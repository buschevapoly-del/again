// gru.js - GRU МОДЕЛЬ С ИСПРАВЛЕНИЕМ ОШИБКИ tensor3d
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
     * Подготовка данных для обучения (returns вместо цен) - ИСПРАВЛЕНА
     */
    prepareData(prices) {
        console.log('Preparing data for returns prediction...');
        
        // Убедимся что prices - это массив чисел
        if (!Array.isArray(prices)) {
            console.error('Prices is not an array:', prices);
            throw new Error('Prices must be an array of numbers');
        }
        
        if (prices.length < 100) {
            throw new Error(`Need at least 100 price points, got ${prices.length}`);
        }
        
        console.log(`Processing ${prices.length} price points...`);
        
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
        
        console.log(`Normalization - Mean: ${mean.toFixed(6)}, Std: ${std.toFixed(6)}`);
        
        // 3. Создаем последовательности (X) и таргеты (y)
        const X = []; // Будет форма: [samples, timesteps]
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
        console.log('First sequence shape:', X[0].length, 'timesteps');
        console.log('First sequence values:', X[0].slice(0, 5));
        
        // 4. Разделяем на train/val/test (70/15/15 как в коллабе)
        const n_samples = X.length;
        const train_size = Math.floor(n_samples * 0.7);
        const val_size = Math.floor(n_samples * 0.15);
        
        const X_train_raw = X.slice(0, train_size);
        const y_train_raw = y.slice(0, train_size);
        
        const X_val_raw = X.slice(train_size, train_size + val_size);
        const y_val_raw = y.slice(train_size, train_size + val_size);
        
        const X_test_raw = X.slice(train_size + val_size);
        const y_test_raw = y.slice(train_size + val_size);
        
        console.log(`Train: ${X_train_raw.length}, Val: ${X_val_raw.length}, Test: ${X_test_raw.length}`);
        
        // 5. Преобразуем в тензоры - ИСПРАВЛЕНИЕ ЗДЕСЬ!
        // Тензор должен быть 3D: [samples, timesteps, features]
        // features = 1 (только returns), но нам нужно добавить третье измерение
        
        // Создаем 3D тензоры правильно
        const X_train_tensor = this.create3DTensor(X_train_raw);
        const y_train_tensor = tf.tensor2d(y_train_raw, [y_train_raw.length, 1]);
        
        const X_val_tensor = this.create3DTensor(X_val_raw);
        const y_val_tensor = tf.tensor2d(y_val_raw, [y_val_raw.length, 1]);
        
        const X_test_tensor = this.create3DTensor(X_test_raw);
        const y_test_tensor = tf.tensor2d(y_test_raw, [y_test_raw.length, 1]);
        
        console.log('Tensor shapes:');
        console.log('X_train shape:', X_train_tensor.shape);
        console.log('y_train shape:', y_train_tensor.shape);
        console.log('X_val shape:', X_val_tensor.shape);
        console.log('X_test shape:', X_test_tensor.shape);
        
        return {
            X_train: X_train_tensor,
            y_train: y_train_tensor,
            X_val: X_val_tensor,
            y_val: y_val_tensor,
            X_test: X_test_tensor,
            y_test: y_test_tensor,
            returns: returns,
            normalizedReturns: normalizedReturns,
            rawData: {
                X_train: X_train_raw,
                X_val: X_val_raw,
                X_test: X_test_raw
            }
        };
    }
    
    /**
     * Создает 3D тензор из 2D массива правильно
     */
    create3DTensor(data2D) {
        // data2D имеет форму [samples, timesteps]
        // Нам нужно [samples, timesteps, features] где features = 1
        
        const samples = data2D.length;
        const timesteps = this.lookback;
        
        // Создаем плоский массив
        const flatArray = new Float32Array(samples * timesteps);
        
        for (let i = 0; i < samples; i++) {
            for (let j = 0; j < timesteps; j++) {
                flatArray[i * timesteps + j] = data2D[i][j];
            }
        }
        
        // Создаем тензор с правильной формой
        return tf.tensor3d(flatArray, [samples, timesteps, 1]);
    }

    /**
     * Альтернативный метод создания тензора (проще)
     */
    create3DTensorSimple(data2D) {
        // Преобразуем каждый sample в 3D: [timesteps] -> [timesteps, 1]
        const data3D = data2D.map(sample => 
            sample.map(value => [value]) // Превращаем каждый value в массив [value]
        );
        
        return tf.tensor3d(data3D, [data2D.length, this.lookback, 1]);
    }

    /**
     * Строит GRU модель для предсказания доходности
     */
    buildModel() {
        console.log('Building GRU regression model for returns...');
        
        if (this.model) {
            this.model.dispose();
        }
        
        this.model = tf.sequential();
        
        // Первый GRU слой
        this.model.add(tf.layers.gru({
            units: 64, // Уменьшил для скорости
            returnSequences: true,
            inputShape: [this.lookback, 1],
            kernelInitializer: 'glorotNormal'
        }));
        
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Второй GRU слой
        this.model.add(tf.layers.gru({
            units: 32
        }));
        
        this.model.add(tf.layers.dropout({rate: 0.2}));
        
        // Полносвязные слои
        this.model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Выходной слой
        this.model.add(tf.layers.dense({
            units: 1
        }));
        
        // Компиляция для регрессии
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
        });
        
        console.log('✅ Regression model for returns built');
        
        // Выводим информацию о модели
        console.log('Model summary:');
        console.log(`Input shape: [null, ${this.lookback}, 1]`);
        console.log('Layers:', this.model.layers.length);
        
        return this.model;
    }

    /**
     * Walk-forward cross-validation (упрощенная версия)
     */
    async walkForwardCV(X_train_val, y_train_val, n_folds = 3, epochs = 10, batch_size = 32) {
        console.log('Starting simplified walk-forward CV...');
        
        const fold_size = Math.floor(X_train_val.shape[0] / (n_folds + 1));
        const rmses = [];
        
        console.log(`Total samples: ${X_train_val.shape[0]}, Fold size: ${fold_size}`);
        
        for (let k = 0; k < n_folds; k++) {
            const train_end = fold_size * (k + 1);
            const val_end = Math.min(fold_size * (k + 2), X_train_val.shape[0]);
            
            if (val_end <= train_end) {
                console.log(`Skipping fold ${k+1}, not enough data`);
                continue;
            }
            
            console.log(`Fold ${k+1}: train [0:${train_end}], val [${train_end}:${val_end}]`);
            
            // Извлекаем fold'ы
            const X_tr = X_train_val.slice([0, 0, 0], [train_end, this.lookback, 1]);
            const y_tr = y_train_val.slice([0, 0], [train_end, 1]);
            
            const X_val_fold = X_train_val.slice([train_end, 0, 0], [val_end - train_end, this.lookback, 1]);
            const y_val_fold = y_train_val.slice([train_end, 0], [val_end - train_end, 1]);
            
            // Создаем и обучаем модель на этом fold'е
            const foldModel = this.createSimpleModel();
            
            let bestValLoss = Infinity;
            let patienceCounter = 0;
            const patience = 3;
            
            for (let epoch = 0; epoch < epochs; epoch++) {
                // Обучение
                const history = await foldModel.fit(X_tr, y_tr, {
                    epochs: 1,
                    batchSize: batch_size,
                    shuffle: true,
                    verbose: 0
                });
                
                const trainLoss = history.history.loss[0];
                
                // Валидация
                const valResults = foldModel.evaluate(X_val_fold, y_val_fold, {verbose: 0});
                const valLoss = valResults[0].dataSync()[0];
                
                // Ранняя остановка
                if (valLoss < bestValLoss) {
                    bestValLoss = valLoss;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                    if (patienceCounter >= patience) {
                        console.log(`  Early stopping at epoch ${epoch + 1}`);
                        break;
                    }
                }
                
                valResults.forEach(r => r.dispose());
                
                if ((epoch + 1) % 5 === 0) {
                    console.log(`  Fold ${k+1}, Epoch ${epoch + 1}: train=${trainLoss.toFixed(6)}, val=${valLoss.toFixed(6)}`);
                }
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
            
            console.log(`Fold ${k+1}/${n_folds} RMSE (normalized): ${rmse.toFixed(5)}`);
            
            // Очистка
            X_tr.dispose();
            y_tr.dispose();
            X_val_fold.dispose();
            y_val_fold.dispose();
            y_pred.dispose();
            foldModel.dispose();
            
            // Освобождаем память TensorFlow
            await tf.nextFrame();
        }
        
        if (rmses.length > 0) {
            const meanRMSE = rmses.reduce((a, b) => a + b, 0) / rmses.length;
            console.log(`Mean RMSE across folds: ${meanRMSE.toFixed(5)}`);
        } else {
            console.log('No valid folds completed');
        }
        
        return rmses;
    }
    
    createSimpleModel() {
        const model = tf.sequential();
        model.add(tf.layers.gru({
            units: 32, 
            inputShape: [this.lookback, 1]
        }));
        model.add(tf.layers.dense({units: 16, activation: 'relu'}));
        model.add(tf.layers.dense({units: 1}));
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });
        return model;
    }

    /**
     * Обучает модель с ранней остановкой
     */
    async train(X_train_val, y_train_val, X_test, y_test, onEpochEnd = null) {
        console.log('Starting final model training...');
        
        if (!this.model) {
            this.buildModel();
        }
        
        this.trainingLosses = [];
        this.validationLosses = [];
        
        let bestValLoss = Infinity;
        let patienceCounter = 0;
        const patience = 5;
        const epochs = 30; // Уменьшил для скорости
        const batchSize = 32;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Одна эпоха обучения
            const history = await this.model.fit(X_train_val, y_train_val, {
                epochs: 1,
                batchSize: batchSize,
                shuffle: true,
                verbose: 0
            });
            
            const trainLoss = history.history.loss[0];
            
            // Валидация на тесте
            const valResults = this.model.evaluate(X_test, y_test, {verbose: 0});
            const valLoss = valResults[0].dataSync()[0];
            
            // Сохраняем метрики
            this.trainingLosses.push(trainLoss);
            this.validationLosses.push(valLoss);
            
            // Ранняя остановка
            if (valLoss < bestValLoss) {
                bestValLoss = valLoss;
                patienceCounter = 0;
            } else {
                patienceCounter++;
                if (patienceCounter >= patience) {
                    console.log(`Early stopping at epoch ${epoch + 1}`);
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
            
            if ((epoch + 1) % 5 === 0) {
                console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${trainLoss.toFixed(6)}, Val Loss: ${valLoss.toFixed(6)}`);
            }
            
            // Освобождаем память между эпохами
            await tf.nextFrame();
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
        
        try {
            // Получаем предсказания
            const predictions = this.model.predict(X_test);
            const yPredNorm = predictions.dataSync();
            const yTrueNorm = y_test.dataSync();
            
            console.log(`Evaluating ${yTrueNorm.length} test samples`);
            
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
            const r2 = totalSumSquares > 0 ? 1 - (sumSquaredError / totalSumSquares) : 0;
            
            // Восстанавливаем цены для визуализации
            const startIdx = prices.length - yTrue.length - this.lookback - this.forecastHorizon;
            const spxTest = [];
            const spxTestPred = [];
            const spxTestTrue = [];
            
            for (let i = 0; i < Math.min(yTrue.length, 50); i++) { // Берем только первые 50 для производительности
                const idx = Math.max(0, startIdx + i + this.lookback);
                const basePrice = prices[idx];
                spxTest.push(basePrice);
                spxTestTrue.push(basePrice * Math.exp(yTrue[i]));
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
                    trueReturns: yTrue.slice(0, 50), // Ограничиваем для производительности
                    predReturns: yPred.slice(0, 50),
                    truePrices: spxTestTrue,
                    predPrices: spxTestPred,
                    basePrices: spxTest
                }
            };
            
        } catch (error) {
            console.error('Evaluation error:', error);
            return {
                rmseReturns: 'Error',
                rmsePrice: 'Error',
                mse: 'Error',
                directionAccuracy: 'Error',
                r2: 'Error',
                samples: 0,
                predictions: null
            };
        }
    }

    /**
     * Делает предсказание для последней доступной последовательности
     */
    predictLatestSequence(prices) {
        if (!this.isTrained) {
            throw new Error('Train model first');
        }
        
        try {
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
            
            if (lastSequence.length < this.lookback) {
                throw new Error(`Not enough data for prediction. Need ${this.lookback} returns, got ${lastSequence.length}`);
            }
            
            // Создаем 3D тензор правильно
            const inputArray = lastSequence.map(value => [value]); // [value] -> [[value]]
            const input = tf.tensor3d([inputArray], [1, this.lookback, 1]);
            
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
                annualizedReturn: predictedReturn * (252 / this.forecastHorizon),
                direction: predictedReturn > 0 ? 'UP' : 'DOWN',
                confidence: Math.min(Math.abs(predictedReturn) * 100, 95).toFixed(1) + '%'
            };
            
        } catch (error) {
            console.error('Prediction error:', error);
            return {
                predictedReturn: 0,
                annualizedReturn: 0,
                direction: 'UNKNOWN',
                confidence: '0%',
                error: error.message
            };
        }
    }

    /**
     * Делает предсказания на несколько дней вперед
     */
    predictSequence(prices, steps = 5) {
        const predictions = [];
        
        // Копируем цены чтобы не изменять оригинал
        const priceCopy = [...prices];
        
        for (let i = 0; i < steps; i++) {
            try {
                const pred = this.predictLatestSequence(priceCopy);
                
                predictions.push({
                    day: i + 1,
                    predictedReturn: pred.predictedReturn,
                    annualizedReturn: pred.annualizedReturn,
                    direction: pred.direction,
                    confidence: pred.confidence
                });
                
                // Для симуляции: обновляем цены с прогнозируемой доходностью
                const lastPrice = priceCopy[priceCopy.length - 1];
                const simulatedPrice = lastPrice * Math.exp(pred.predictedReturn / this.forecastHorizon);
                priceCopy.push(simulatedPrice);
                
            } catch (error) {
                predictions.push({
                    day: i + 1,
                    predictedReturn: 0,
                    annualizedReturn: 0,
                    direction: 'ERROR',
                    confidence: '0%',
                    error: error.message
                });
            }
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
            this.model = null;
        }
        this.trainingLosses = [];
        this.validationLosses = [];
        console.log('GRUModel memory cleared');
    }
}
