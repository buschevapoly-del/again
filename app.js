// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('📱 S&P 500 Returns Predictor App starting...');
        this.dataLoader = new DataLoader();
        this.gruModel = new GRUModel();
        this.trainingData = null;
        this.isDataLoaded = false;
        this.isReturnsCalculated = false;
        this.isModelTrained = false;
        this.setupCharts();
        this.setupEventListeners();
        console.log('✅ App ready. Click "Load Data from GitHub"');
    }
    
    setupCharts() {
        // График исторических данных
        this.historyChart = this.createChart('historyChart', 'S&P 500 Price History', 'line');
        
        // График доходностей
        this.returnsChart = this.createChart('returnsChart', 'S&P 500 Daily Returns', 'line', {
            datasets: [{
                label: 'Daily Returns (%)',
                data: [],
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0,255,136,0.1)',
                fill: true,
                borderWidth: 1,
                tension: 0.1
            }]
        });
        
        // График обучения
        this.trainingChart = this.createChart('trainingChart', 'Training Loss', 'line', {
            datasets: [
                {
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: 'rgba(255,0,122,0.1)',
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Validation Loss',
                    data: [],
                    borderColor: '#00aaff',
                    backgroundColor: 'rgba(0,170,255,0.1)',
                    fill: true,
                    borderWidth: 2
                }
            ]
        });
        
        // График предсказаний
        this.predictionChart = this.createChart('predictionChart', 'True vs Predicted Returns', 'line', {
            datasets: [
                {
                    label: 'True Returns',
                    data: [],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0,255,136,0.1)',
                    fill: false,
                    borderWidth: 2
                },
                {
                    label: 'Predicted Returns',
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: 'rgba(255,0,122,0.1)',
                    fill: false,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        });
    }
    
    createChart(canvasId, label, type, customData = null) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const data = customData || {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: '#ff007a',
                backgroundColor: type === 'bar' ? '#ff007a' : 'rgba(255,0,122,0.1)',
                fill: type === 'line',
                borderWidth: 1,
                tension: 0.1
            }]
        };
        
        return new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        },
                        beginAtZero: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Основная кнопка загрузки
        const loadBtn = document.getElementById('refreshDataBtn');
        if (!loadBtn) {
            console.error('❌ Кнопка refreshDataBtn не найдена!');
            return;
        }
        
        loadBtn.addEventListener('click', () => {
            console.log('🎯 Кнопка нажата! Запускаем loadData()');
            this.loadData();
        });
        
        // Кнопка расчета доходностей
        const preprocessBtn = document.getElementById('preprocessBtn');
        preprocessBtn.addEventListener('click', () => this.calculateReturns());
        
        // Кнопка тренировки модели
        const trainBtn = document.getElementById('trainBtn');
        trainBtn.addEventListener('click', () => this.trainModel());
        
        // Кнопка предсказаний
        const predictBtn = document.getElementById('predictBtn');
        predictBtn.addEventListener('click', () => this.makePredictions());
        
        // Кнопка сброса
        this.setupResetButton();
        
        console.log('✅ Event listeners установлены');
    }
    
    setupResetButton() {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-secondary';
        resetBtn.innerHTML = '🔄 Reset App';
        resetBtn.style.marginTop = '10px';
        resetBtn.addEventListener('click', () => this.resetApp());
        
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(resetBtn);
        }
    }
    
    resetApp() {
        if (confirm('Reset the application? This will clear all data and trained models.')) {
            console.log('Resetting application...');
            
            // Сброс состояния
            this.isDataLoaded = false;
            this.isReturnsCalculated = false;
            this.isModelTrained = false;
            this.trainingData = null;
            
            // Очистка модели
            if (this.gruModel) {
                this.gruModel.dispose();
            }
            this.gruModel = new GRUModel();
            
            // Очистка загрузчика данных
            this.dataLoader.dispose();
            this.dataLoader = new DataLoader();
            
            // Сброс кнопок
            this.resetButtons();
            
            // Сброс графиков
            this.resetCharts();
            
            // Сброс метрик
            this.resetMetrics();
            
            // Сброс прогнозов
            this.resetPredictions();
            
            // Сброс прогресса
            this.updateProgress(0, 'Click "Load Data from GitHub" to begin');
            
            this.showStatus('🔄 Application reset successfully!', 'info');
            
            console.log('✅ Application reset');
        }
    }
    
    resetButtons() {
        document.getElementById('preprocessBtn').disabled = true;
        document.getElementById('preprocessBtn').innerHTML = '📊 Calculate Returns';
        
        document.getElementById('trainBtn').disabled = true;
        document.getElementById('trainBtn').innerHTML = '🧠 Prepare & Train GRU Model';
        
        document.getElementById('predictBtn').disabled = true;
        document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
    }
    
    resetCharts() {
        // Сброс графика цен
        this.historyChart.data.labels = [];
        this.historyChart.data.datasets[0].data = [];
        this.historyChart.update();
        
        // Сброс графика доходностей
        this.returnsChart.data.labels = [];
        this.returnsChart.data.datasets[0].data = [];
        this.returnsChart.update();
        
        // Сброс графика обучения
        this.trainingChart.data.labels = [];
        this.trainingChart.data.datasets[0].data = [];
        this.trainingChart.data.datasets[1].data = [];
        this.trainingChart.update();
        
        // Сброс графика предсказаний
        this.predictionChart.data.labels = [];
        this.predictionChart.data.datasets[0].data = [];
        this.predictionChart.data.datasets[1].data = [];
        this.predictionChart.update();
    }
    
    resetMetrics() {
        document.getElementById('trainLoss').textContent = '-';
        document.getElementById('valLoss').textContent = '-';
        document.getElementById('rmse').textContent = '-';
        document.getElementById('accuracy').textContent = '-';
    }
    
    resetPredictions() {
        const grid = document.getElementById('predictionGrid');
        const dayElements = grid.querySelectorAll('.prediction-day');
        
        dayElements.forEach((dayElement, index) => {
            dayElement.querySelector('.prediction-value').textContent = '-';
            dayElement.querySelector('.prediction-value').className = 'prediction-value';
            dayElement.querySelector('.prediction-confidence').textContent = 'Confidence: -';
        });
    }
    
    async loadData() {
        console.log('🚀 ЗАПУСК loadData()');
        
        this.showStatus('⏳ Loading S&P 500 data from GitHub...', 'info');
        this.updateProgress(10, 'Starting...');
        
        const loadBtn = document.getElementById('refreshDataBtn');
        const loader = document.getElementById('refreshLoader');
        
        loadBtn.disabled = true;
        loadBtn.innerHTML = '⏳ Loading...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            this.updateProgress(30, 'Fetching CSV from GitHub...');
            
            // Загружаем данные
            const data = await this.dataLoader.fetchYahooFinanceData();
            
            this.updateProgress(70, 'Processing price data...');
            
            // Обновляем информацию о файле
            this.updateFileInfo(data);
            
            // Обновляем график цен
            this.updateHistoryChart();
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ S&P 500 data loaded successfully!', 'success');
            
            // Валидация данных
            const validation = this.dataLoader.validateData();
            if (validation.valid) {
                this.showStatus(`📊 Data validated: ${validation.dataPoints} points`, 'info');
            } else {
                this.showStatus(`⚠️ Data issues: ${validation.issues.join(', ')}`, 'warning');
            }
            
            // Активируем кнопку расчета доходностей
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '📊 Calculate Returns';
            
            this.isDataLoaded = true;
            
            console.log('🎉 Данные загружены:', data.prices?.length || 0, 'price points');
            
        } catch (error) {
            console.error('💥 Ошибка при загрузке:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.updateProgress(0, `Error: ${error.message}`);
        } finally {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '📥 Load Data from GitHub';
            if (loader) loader.style.display = 'none';
        }
    }
    
    updateFileInfo(data) {
        const fileInfo = document.getElementById('fileInfo');
        if (!fileInfo) return;
        
        const stats = this.dataLoader.getStatistics();
        
        fileInfo.classList.add('active');
        fileInfo.innerHTML = `
            <div style="text-align: center;">
                <h4 style="color: #ff007a;">${stats.symbol}</h4>
                <p>${stats.dateRange}</p>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Data Points</strong>
                    <div>${stats.rows}</div>
                </div>
                <div class="info-item">
                    <strong>Current Price</strong>
                    <div>${stats.currentPrice}</div>
                </div>
                <div class="info-item">
                    <strong>Price Range</strong>
                    <div>${stats.priceRange}</div>
                </div>
                <div class="info-item">
                    <strong>Annual Volatility</strong>
                    <div>${stats.volatility}</div>
                </div>
                <div class="info-item">
                    <strong>Mean Return</strong>
                    <div>${stats.meanReturn}</div>
                </div>
                <div class="info-item">
                    <strong>Sharpe Ratio</strong>
                    <div>${stats.sharpeRatio || 'N/A'}</div>
                </div>
            </div>
        `;
    }
    
    updateHistoryChart() {
        const priceData = this.dataLoader.getPriceData();
        
        if (priceData && priceData.length > 0) {
            // Берем только последние 200 точек для графика
            const startIdx = Math.max(0, priceData.length - 200);
            const displayData = priceData.slice(startIdx);
            
            const labels = displayData.map(d => d.date);
            const prices = displayData.map(d => d.price);
            
            this.historyChart.data.labels = labels;
            this.historyChart.data.datasets[0].data = prices;
            this.historyChart.update();
            
            console.log('📊 График цен обновлен с', prices.length, 'точками');
        }
    }
    
    updateReturnsChart(returnsData) {
        if (!returnsData || returnsData.length === 0) return;
        
        // Берем только последние 200 точек для графика
        const startIdx = Math.max(0, returnsData.length - 200);
        const displayData = returnsData.slice(startIdx);
        
        const labels = displayData.map(r => r.date);
        const returns = displayData.map(r => r.simpleReturnPercent);
        
        this.returnsChart.data.labels = labels;
        this.returnsChart.data.datasets[0].data = returns;
        this.returnsChart.update();
        
        console.log('📊 График доходностей обновлен с', returns.length, 'точками');
    }
    
    async calculateReturns() {
        if (!this.isDataLoaded) {
            this.showStatus('❌ Please load data first!', 'error');
            return;
        }
        
        console.log('Calculating returns...');
        this.showStatus('📊 Calculating S&P 500 returns...', 'info');
        
        const preprocessBtn = document.getElementById('preprocessBtn');
        const loader = document.getElementById('preprocessLoader');
        
        preprocessBtn.disabled = true;
        preprocessBtn.innerHTML = '⏳ Calculating...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            this.updateProgress(20, 'Calculating daily returns...');
            
            // 1. Рассчитываем доходности
            const returnsData = this.dataLoader.calculateReturns();
            
            this.updateProgress(50, 'Updating returns chart...');
            
            // 2. Обновляем график доходностей
            this.updateReturnsChart(returnsData);
            
            this.updateProgress(70, 'Normalizing data...');
            
            // 3. Нормализуем данные
            const normalizedData = this.dataLoader.normalizeData();
            
            // 4. Показываем статистику нормализованных данных
            const stats = this.dataLoader.getStatistics();
            
            this.updateProgress(90, 'Preparing for GRU model...');
            
            this.showStatus('✅ Returns calculated successfully!', 'success');
            this.showStatus(
                `📈 Mean daily return: ${stats.meanReturn}, ` +
                `Volatility: ${stats.volatility}`, 
                'info'
            );
            
            // 5. Активируем кнопку подготовки данных для GRU
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Prepare & Train GRU Model';
            
            // Меняем текст кнопки
            preprocessBtn.innerHTML = '✅ Returns Calculated';
            
            this.isReturnsCalculated = true;
            
            console.log('🎉 Returns calculated:', returnsData.length, 'data points');
            console.log('Normalization stats:', normalizedData);
            
            this.updateProgress(100, '✅ Returns calculation complete!');
            
        } catch (error) {
            console.error('💥 Ошибка при расчете доходностей:', error);
            this.showStatus(`❌ Error calculating returns: ${error.message}`, 'error');
            preprocessBtn.innerHTML = '📊 Calculate Returns';
            preprocessBtn.disabled = false;
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    
    async trainModel() {
        if (!this.isReturnsCalculated) {
            this.showStatus('❌ Please calculate returns first!', 'error');
            return;
        }
        
        console.log('Preparing data and training GRU model...');
        this.showStatus('🧠 Preparing data for GRU model...', 'info');
        
        const trainBtn = document.getElementById('trainBtn');
        const loader = document.getElementById('trainLoader');
        
        trainBtn.disabled = true;
        trainBtn.innerHTML = '⏳ Preparing Data...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            this.updateProgress(10, 'Getting price data...');
            
            // Получаем сырые цены как массив чисел
            const prices = this.dataLoader.getPricesArray();
            const dates = this.dataLoader.getDatesArray();
            
            console.log('🔍 Debug: Raw prices data');
            console.log('Prices length:', prices?.length);
            console.log('Prices type:', typeof prices);
            console.log('Is array:', Array.isArray(prices));
            console.log('First 5 prices:', prices?.slice(0, 5));
            console.log('Dates length:', dates?.length);
            
            if (!prices || !Array.isArray(prices)) {
                throw new Error('Invalid price data format');
            }
            
            if (prices.length < 100) {
                throw new Error(`Need at least 100 price points, got ${prices.length}`);
            }
            
            this.updateProgress(30, 'Preparing sequences for GRU...');
            
            // Подготавливаем данные для GRU модели
            console.log('Calling gruModel.prepareData with', prices.length, 'price points');
            this.trainingData = this.gruModel.prepareData(prices);
            console.log('Training data prepared successfully');
            console.log('Training data keys:', Object.keys(this.trainingData));
            
            if (!this.trainingData.X_train || !this.trainingData.y_train) {
                throw new Error('Failed to prepare training data');
            }
            
            this.updateProgress(50, 'Building GRU model...');
            
            // Строим модель
            this.gruModel.buildModel();
            
            this.updateProgress(60, 'Running walk-forward validation...');
            
            // Walk-forward CV
            const X_train_val = tf.concat([this.trainingData.X_train, this.trainingData.X_val], 0);
            const y_train_val = tf.concat([this.trainingData.y_train, this.trainingData.y_val], 0);
            
            this.showStatus('📊 Running walk-forward cross-validation...', 'info');
            
            const cvResults = await this.gruModel.walkForwardCV(
                X_train_val, 
                y_train_val, 
                3,  // n_folds (меньше для скорости)
                10  // epochs per fold
            );
            
            // Освобождаем память
            X_train_val.dispose();
            y_train_val.dispose();
            
            if (cvResults && cvResults.length > 0) {
                const meanRMSE = cvResults.reduce((a, b) => a + b, 0) / cvResults.length;
                this.showStatus(`📊 CV Mean RMSE: ${meanRMSE.toFixed(5)}`, 'info');
            }
            
            this.updateProgress(75, 'Final model training...');
            
            // Финальное обучение
            this.showStatus('🎯 Final model training...', 'info');
            
            const history = await this.gruModel.train(
                tf.concat([this.trainingData.X_train, this.trainingData.X_val], 0),
                tf.concat([this.trainingData.y_train, this.trainingData.y_val], 0),
                this.trainingData.X_test,
                this.trainingData.y_test,
                (epoch, metrics, totalEpochs) => {
                    this.updateTrainingChart(epoch, metrics, totalEpochs);
                    this.updateProgress(
                        75 + (epoch / totalEpochs) * 15,
                        `Epoch ${epoch}/${totalEpochs} - Loss: ${metrics.loss.toFixed(6)}`
                    );
                }
            );
            
            this.updateProgress(95, 'Evaluating model...');
            
            // Оценка модели
            this.showStatus('📈 Evaluating model on test set...', 'info');
            
            const evaluation = this.gruModel.evaluate(
                this.trainingData.X_test,
                this.trainingData.y_test,
                prices,
                dates
            );
            
            // Обновляем метрики
            this.updateMetrics(evaluation);
            
            // Обновляем график предсказаний
            this.updatePredictionChart(evaluation);
            
            this.showStatus('✅ GRU model trained successfully!', 'success');
            this.showStatus(
                `📊 Test RMSE (returns): ${evaluation.rmseReturns}, ` +
                `Direction Accuracy: ${evaluation.directionAccuracy}`, 
                'info'
            );
            
            // Активируем кнопку предсказаний
            document.getElementById('predictBtn').disabled = false;
            document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
            
            trainBtn.innerHTML = '✅ Model Trained';
            
            this.isModelTrained = true;
            
            this.updateProgress(100, '✅ Training complete!');
            
        } catch (error) {
            console.error('💥 Ошибка при обучении модели:', error);
            console.error('Stack trace:', error.stack);
            this.showStatus(`❌ Training error: ${error.message}`, 'error');
            trainBtn.innerHTML = '🧠 Prepare & Train GRU Model';
            trainBtn.disabled = false;
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }
    
    updateTrainingChart(epoch, metrics, totalEpochs) {
        if (!this.trainingChart) return;
        
        if (epoch === 1) {
            this.trainingChart.data.labels = [1];
            this.trainingChart.data.datasets[0].data = [metrics.loss];
            this.trainingChart.data.datasets[1].data = [metrics.val_loss];
        } else {
            this.trainingChart.data.labels.push(epoch);
            this.trainingChart.data.datasets[0].data.push(metrics.loss);
            this.trainingChart.data.datasets[1].data.push(metrics.val_loss);
        }
        
        this.trainingChart.update();
    }
    
    updateMetrics(evaluation) {
        if (evaluation.rmseReturns === 'Error') {
            document.getElementById('trainLoss').textContent = 'Error';
            document.getElementById('valLoss').textContent = 'Error';
            document.getElementById('rmse').textContent = 'Error';
            document.getElementById('accuracy').textContent = 'Error';
            return;
        }
        
        document.getElementById('trainLoss').textContent = 
            this.gruModel.trainingLosses.length > 0 
                ? this.gruModel.trainingLosses[this.gruModel.trainingLosses.length - 1].toFixed(6)
                : '-';
        
        document.getElementById('valLoss').textContent = 
            this.gruModel.validationLosses.length > 0 
                ? this.gruModel.validationLosses[this.gruModel.validationLosses.length - 1].toFixed(6)
                : '-';
        
        document.getElementById('rmse').textContent = evaluation.rmseReturns;
        document.getElementById('accuracy').textContent = evaluation.directionAccuracy;
    }
    
    updatePredictionChart(evaluation) {
        if (!evaluation.predictions) {
            console.warn('No prediction data available for chart');
            return;
        }
        
        const { trueReturns, predReturns } = evaluation.predictions;
        
        if (!trueReturns || !predReturns || trueReturns.length === 0) {
            console.warn('Empty prediction data');
            return;
        }
        
        // Берем только последние 30 точек для графика
        const displayCount = Math.min(30, trueReturns.length);
        const startIdx = Math.max(0, trueReturns.length - displayCount);
        const labels = Array.from({length: displayCount}, (_, i) => `Sample ${i + 1}`);
        
        this.predictionChart.data.labels = labels;
        this.predictionChart.data.datasets[0].data = trueReturns.slice(startIdx, startIdx + displayCount);
        this.predictionChart.data.datasets[1].data = predReturns.slice(startIdx, startIdx + displayCount);
        
        this.predictionChart.update();
        
        console.log('📊 Prediction chart updated with', displayCount, 'samples');
    }
    
    async makePredictions() {
        if (!this.isModelTrained) {
            this.showStatus('❌ Please train the model first!', 'error');
            return;
        }
        
        console.log('Making 5-day returns predictions...');
        this.showStatus('🔮 Predicting next 5-day returns...', 'info');
        
        const predictBtn = document.getElementById('predictBtn');
        
        predictBtn.disabled = true;
        predictBtn.innerHTML = '⏳ Predicting...';
        
        try {
            const prices = this.dataLoader.getPricesArray();
            const currentPrice = prices[prices.length - 1];
            const stats = this.dataLoader.getStatistics();
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data available');
            }
            
            console.log('Current price:', currentPrice);
            console.log('Total price points:', prices.length);
            
            // Получаем предсказания на 5 дней
            const predictions = this.gruModel.predictSequence(prices, 5);
            
            console.log('Predictions received:', predictions);
            
            // Обновляем отображение
            this.updatePredictionsDisplay(predictions, currentPrice, stats);
            
            this.showStatus('✅ 5-day returns predictions ready!', 'success');
            
            // Показываем сводку прогнозов
            this.showPredictionSummary(predictions, currentPrice);
            
        } catch (error) {
            console.error('💥 Ошибка при предсказании:', error);
            this.showStatus(`❌ Prediction error: ${error.message}`, 'error');
            
            // Показываем ошибки в прогнозах
            this.showPredictionErrors();
        } finally {
            predictBtn.disabled = false;
            predictBtn.innerHTML = '🔮 Predict Next 5 Days';
        }
    }
    
    updatePredictionsDisplay(predictions, currentPrice, stats) {
        const grid = document.getElementById('predictionGrid');
        
        predictions.forEach((pred, index) => {
            const dayElement = grid.querySelector(`.prediction-day:nth-child(${index + 1})`);
            if (dayElement) {
                // Рассчитываем прогнозируемую цену
                const predictedPrice = currentPrice * Math.exp(pred.predictedReturn);
                const returnPercent = (pred.predictedReturn * 100).toFixed(2);
                
                dayElement.querySelector('.prediction-value').textContent = 
                    `${pred.direction === 'UP' ? '+' : ''}${returnPercent}%`;
                dayElement.querySelector('.prediction-value').className = 
                    `prediction-value ${pred.direction.toLowerCase()}`;
                
                dayElement.querySelector('.prediction-confidence').innerHTML = 
                    `Confidence: ${pred.confidence}<br>` +
                    `Price: $${predictedPrice.toFixed(2)}<br>` +
                    `Annualized: ${(pred.annualizedReturn * 100).toFixed(2)}%`;
                
                // Добавляем класс для анимации
                dayElement.classList.add('updated');
                setTimeout(() => dayElement.classList.remove('updated'), 1000);
            }
        });
    }
    
    showPredictionSummary(predictions, currentPrice) {
        // Рассчитываем статистику прогнозов
        const avgReturn = predictions.reduce((sum, pred) => sum + pred.predictedReturn, 0) / predictions.length;
        const upDays = predictions.filter(p => p.direction === 'UP').length;
        const avgConfidence = predictions.reduce((sum, pred) => {
            const conf = parseFloat(pred.confidence);
            return sum + (isNaN(conf) ? 0 : conf);
        }, 0) / predictions.length;
        
        const summary = `
            <div style="margin-top: 10px; padding: 10px; background: rgba(0,170,255,0.1); border-radius: 8px;">
                <strong>📈 Prediction Summary:</strong><br>
                • Average 5-day return: ${(avgReturn * 100).toFixed(2)}%<br>
                • Up days: ${upDays}/5 (${(upDays/5*100).toFixed(0)}%)<br>
                • Average confidence: ${avgConfidence.toFixed(1)}%<br>
                • Current price: $${currentPrice.toFixed(2)}
            </div>
        `;
        
        this.showStatus(summary, 'info');
    }
    
    showPredictionErrors() {
        const grid = document.getElementById('predictionGrid');
        const dayElements = grid.querySelectorAll('.prediction-day');
        
        dayElements.forEach((dayElement, index) => {
            dayElement.querySelector('.prediction-value').textContent = 'ERROR';
            dayElement.querySelector('.prediction-value').className = 'prediction-value error';
            dayElement.querySelector('.prediction-confidence').textContent = 'Please try again';
        });
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElem = document.getElementById('progressText');
        
        if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        if (textElem) textElem.textContent = text;
        
        console.log(`📊 Прогресс: ${percent}% - ${text}`);
    }
    
    showStatus(message, type = 'info') {
        console.log(`📢 Статус (${type}): ${typeof message === 'string' ? message : 'HTML content'}`);
        
        const container = document.getElementById('statusContainer');
        if (!container) {
            console.warn('statusContainer не найден');
            return;
        }
        
        const status = document.createElement('div');
        status.className = `status ${type} active`;
        
        if (typeof message === 'string') {
            status.textContent = message;
        } else {
            status.innerHTML = message;
        }
        
        // Удаляем старые статусы (оставляем максимум 3)
        const oldStatuses = container.querySelectorAll('.status');
        if (oldStatuses.length >= 3) {
            for (let i = 0; i < oldStatuses.length - 2; i++) {
                oldStatuses[i].remove();
            }
        }
        
        container.appendChild(status);
        
        // Автоудаление через 8 секунд
        setTimeout(() => {
            if (status.parentNode) {
                status.classList.remove('active');
                setTimeout(() => status.remove(), 300);
            }
        }, 8000);
    }
    
    // Метод для отладки
    debugInfo() {
        console.log('=== DEBUG INFO ===');
        console.log('Data loaded:', this.isDataLoaded);
        console.log('Returns calculated:', this.isReturnsCalculated);
        console.log('Model trained:', this.isModelTrained);
        console.log('Training data:', this.trainingData ? 'Available' : 'None');
        console.log('GRU model:', this.gruModel ? 'Initialized' : 'None');
        console.log('Data loader:', this.dataLoader ? 'Initialized' : 'None');
        console.log('=== END DEBUG ===');
    }
}

// Запускаем приложение
console.log('🚀 Запускаем приложение...');

// Добавляем глобальные функции для отладки
window.debugApp = function() {
    if (window.app) {
        window.app.debugInfo();
    } else {
        console.error('App not initialized');
    }
};

window.testTensorFlow = async function() {
    console.log('Testing TensorFlow.js...');
    try {
        // Простой тест TensorFlow
        const a = tf.tensor2d([[1, 2], [3, 4]]);
        const b = tf.tensor2d([[5, 6], [7, 8]]);
        const result = a.add(b);
        console.log('TensorFlow test successful:', await result.data());
        a.dispose();
        b.dispose();
        result.dispose();
        return true;
    } catch (error) {
        console.error('TensorFlow test failed:', error);
        return false;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, создаем приложение...');
        window.app = new StockPredictorApp();
        console.log('ℹ️ Use debugApp() for debugging, testTensorFlow() to test TF.js');
    });
} else {
    console.log('📄 DOM уже загружен, создаем приложение...');
    window.app = new StockPredictorApp();
    console.log('ℹ️ Use debugApp() for debugging, testTensorFlow() to test TF.js');
}
