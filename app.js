// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('📱 S&P 500 Returns Predictor App starting...');
        this.dataLoader = new DataLoader();
        this.gruModel = new GRUModel();
        this.trainingData = null;
        this.rawPrices = []; // Храним сырые цены
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
                borderWidth: 1
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
                    fill: true
                },
                {
                    label: 'Validation Loss',
                    data: [],
                    borderColor: '#00aaff',
                    backgroundColor: 'rgba(0,170,255,0.1)',
                    fill: true
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
                    fill: true
                },
                {
                    label: 'Predicted Returns',
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: 'rgba(255,0,122,0.1)',
                    fill: true
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
                borderWidth: 1
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
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
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
        
        // Кнопка предобработки - теперь "Calculate Returns"
        const preprocessBtn = document.getElementById('preprocessBtn');
        preprocessBtn.addEventListener('click', () => this.calculateReturns());
        
        // Кнопка тренировки модели
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        
        // Кнопка предсказаний
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
        
        console.log('✅ Event listeners установлены');
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
            
            // Сохраняем сырые цены
            this.rawPrices = data.prices;
            
            // Обновляем информацию о файле
            this.updateFileInfo(data);
            
            // Обновляем график цен
            this.updateHistoryChart();
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ S&P 500 data loaded successfully!', 'success');
            
            // Меняем текст кнопки на "Calculate Returns"
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '📊 Calculate Returns';
            
            console.log('🎉 Данные загружены:', this.rawPrices.length, 'price points');
            
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
        console.log('Calculating returns...');
        this.showStatus('📊 Calculating S&P 500 returns...', 'info');
        
        const preprocessBtn = document.getElementById('preprocessBtn');
        const loader = document.getElementById('preprocessLoader');
        
        preprocessBtn.disabled = true;
        preprocessBtn.innerHTML = '⏳ Calculating...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            // 1. Рассчитываем доходности
            const returnsData = this.dataLoader.calculateReturns();
            
            // 2. Обновляем график доходностей
            this.updateReturnsChart(returnsData);
            
            // 3. Нормализуем данные
            this.dataLoader.normalizeData();
            
            // 4. Получаем нормализованные данные для информации
            const normalizedData = this.dataLoader.normalizedData;
            
            this.showStatus('✅ Returns calculated successfully!', 'success');
            this.showStatus(
                `📈 Mean daily return: ${(normalizedData.mean * 100).toFixed(4)}%, ` +
                `Std: ${(normalizedData.std * 100).toFixed(4)}%`, 
                'info'
            );
            
            // 5. Активируем кнопку подготовки данных для GRU
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Prepare & Train GRU Model';
            
            // Меняем текст кнопки
            preprocessBtn.innerHTML = '✅ Returns Calculated';
            
            console.log('🎉 Returns calculated:', returnsData.length, 'data points');
            
        } catch (error) {
            console.error('💥 Ошибка при расчете доходностей:', error);
            this.showStatus(`❌ Error calculating returns: ${error.message}`, 'error');
            preprocessBtn.innerHTML = '📊 Calculate Returns';
        } finally {
            preprocessBtn.disabled = false;
            if (loader) loader.style.display = 'none';
        }
    }
    
    async trainModel() {
        console.log('Preparing data and training GRU model...');
        this.showStatus('🧠 Preparing data for GRU model...', 'info');
        
        const trainBtn = document.getElementById('trainBtn');
        const loader = document.getElementById('trainLoader');
        
        trainBtn.disabled = true;
        trainBtn.innerHTML = '⏳ Preparing Data...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            this.updateProgress(10, 'Getting price data...');
            
            // ВАЖНО: Получаем СЫРЫЕ ЦЕНЫ как массив чисел
            const prices = this.dataLoader.getPricesArray();
            
            if (!prices || prices.length < 100) {
                throw new Error(`Not enough data. Need at least 100 price points, got ${prices?.length || 0}`);
            }
            
            this.updateProgress(30, 'Preparing sequences for GRU...');
            
            // Подготавливаем данные для GRU модели
            // Передаем МАССИВ ЧИСЕЛ, а не объект
            this.trainingData = this.gruModel.prepareData(prices);
            
            this.updateProgress(50, 'Building GRU model...');
            
            // Строим модель
            this.gruModel.buildModel();
            
            this.updateProgress(70, 'Running walk-forward validation...');
            
            // Walk-forward CV
            const X_train_val = tf.concat([this.trainingData.X_train, this.trainingData.X_val], 0);
            const y_train_val = tf.concat([this.trainingData.y_train, this.trainingData.y_val], 0);
            
            const cvResults = await this.gruModel.walkForwardCV(
                X_train_val, 
                y_train_val, 
                3,  // n_folds (меньше для скорости)
                10  // epochs per fold
            );
            
            this.updateProgress(85, 'Final model training...');
            
            // Финальное обучение
            const history = await this.gruModel.train(
                X_train_val,
                y_train_val,
                this.trainingData.X_test,
                this.trainingData.y_test,
                (epoch, metrics, totalEpochs) => {
                    this.updateTrainingChart(epoch, metrics, totalEpochs);
                    this.updateProgress(
                        85 + (epoch / totalEpochs) * 10,
                        `Epoch ${epoch}/${totalEpochs} - Loss: ${metrics.loss.toFixed(6)}`
                    );
                }
            );
            
            this.updateProgress(95, 'Evaluating model...');
            
            // Оценка модели
            const evaluation = this.gruModel.evaluate(
                this.trainingData.X_test,
                this.trainingData.y_test,
                prices,
                this.dataLoader.getDatesArray()
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
            
        } catch (error) {
            console.error('💥 Ошибка при обучении модели:', error);
            this.showStatus(`❌ Training error: ${error.message}`, 'error');
            trainBtn.innerHTML = '🧠 Prepare & Train GRU Model';
        } finally {
            trainBtn.disabled = false;
            if (loader) loader.style.display = 'none';
            this.updateProgress(100, '✅ Training complete!');
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
        if (!evaluation.predictions) return;
        
        const { trueReturns, predReturns } = evaluation.predictions;
        
        // Берем только последние 30 точек для графика
        const startIdx = Math.max(0, trueReturns.length - 30);
        const labels = Array.from({length: Math.min(30, trueReturns.length)}, (_, i) => `Test ${i + 1}`);
        
        this.predictionChart.data.labels = labels;
        this.predictionChart.data.datasets[0].data = trueReturns.slice(startIdx);
        this.predictionChart.data.datasets[1].data = predReturns.slice(startIdx);
        
        this.predictionChart.update();
    }
    
    async makePredictions() {
        console.log('Making 5-day returns predictions...');
        this.showStatus('🔮 Predicting next 5-day returns...', 'info');
        
        const predictBtn = document.getElementById('predictBtn');
        
        predictBtn.disabled = true;
        predictBtn.innerHTML = '⏳ Predicting...';
        
        try {
            const prices = this.dataLoader.getPricesArray();
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data available');
            }
            
            // Получаем предсказания на 5 дней
            const predictions = this.gruModel.predictSequence(prices, 5);
            
            // Обновляем отображение
            this.updatePredictionsDisplay(predictions, prices[prices.length - 1]);
            
            this.showStatus('✅ 5-day returns predictions ready!', 'success');
            
        } catch (error) {
            console.error('💥 Ошибка при предсказании:', error);
            this.showStatus(`❌ Prediction error: ${error.message}`, 'error');
        } finally {
            predictBtn.disabled = false;
            predictBtn.innerHTML = '🔮 Predict Next 5 Days';
        }
    }
    
    updatePredictionsDisplay(predictions, currentPrice) {
        const grid = document.getElementById('predictionGrid');
        
        predictions.forEach(pred => {
            const dayElement = grid.querySelector(`.prediction-day:nth-child(${pred.day})`);
            if (dayElement) {
                // Рассчитываем прогнозируемую цену
                const predictedPrice = currentPrice * Math.exp(pred.predictedReturn);
                const returnPercent = (pred.predictedReturn * 100).toFixed(2);
                
                dayElement.querySelector('.prediction-value').textContent = 
                    `${pred.direction === 'UP' ? '+' : ''}${returnPercent}%`;
                dayElement.querySelector('.prediction-value').className = `prediction-value ${pred.direction.toLowerCase()}`;
                
                dayElement.querySelector('.prediction-confidence').innerHTML = 
                    `Confidence: ${pred.confidence}<br>` +
                    `Price: $${predictedPrice.toFixed(2)}<br>` +
                    `Annualized: ${(pred.annualizedReturn * 100).toFixed(2)}%`;
            }
        });
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElem = document.getElementById('progressText');
        
        if (fill) fill.style.width = `${Math.min(100, percent)}%`;
        if (textElem) textElem.textContent = text;
        
        console.log(`📊 Прогресс: ${percent}% - ${text}`);
    }
    
    showStatus(message, type = 'info') {
        console.log(`📢 Статус: ${message}`);
        
        const container = document.getElementById('statusContainer');
        if (!container) {
            console.warn('statusContainer не найден');
            return;
        }
        
        const status = document.createElement('div');
        status.className = `status ${type} active`;
        status.textContent = message;
        
        // Удаляем старые статусы
        const oldStatuses = container.querySelectorAll('.status');
        oldStatuses.forEach(s => {
            if (s !== status) s.remove();
        });
        
        container.appendChild(status);
        
        // Автоудаление через 5 секунд
        setTimeout(() => {
            if (status.parentNode) {
                status.classList.remove('active');
                setTimeout(() => status.remove(), 300);
            }
        }, 5000);
    }
}

// Запускаем приложение
console.log('🚀 Запускаем приложение...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, создаем приложение...');
        window.app = new StockPredictorApp();
    });
} else {
    console.log('📄 DOM уже загружен, создаем приложение...');
    window.app = new StockPredictorApp();
}
