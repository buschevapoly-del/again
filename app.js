// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('📱 S&P 500 Returns Predictor App starting...');
        this.dataLoader = new DataLoader();
        this.gruModel = new GRUModel();
        this.trainingData = null;
        this.setupCharts();
        this.setupEventListeners();
        console.log('✅ App ready. Click "Load Data from GitHub"');
    }
    
    setupCharts() {
        // График исторических данных
        this.historyChart = this.createChart('historyChart', 'S&P 500 Price History', 'line');
        
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
                fill: type === 'line'
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
        
        // Кнопка предобработки
        document.getElementById('preprocessBtn').addEventListener('click', () => this.preprocessData());
        
        // Кнопка тренировки модели (главная задача)
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        
        // Кнопка предсказаний
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
        
        console.log('✅ Event listeners установлены');
    }
    
    async loadData() {
        console.log('🚀 ЗАПУСК loadData()');
        
        // Показываем, что процесс начался
        this.showStatus('⏳ Loading S&P 500 data from GitHub...', 'info');
        this.updateProgress(10, 'Starting...');
        
        const loadBtn = document.getElementById('refreshDataBtn');
        const loader = document.getElementById('refreshLoader');
        
        // Блокируем кнопку и показываем лоадер
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
            
            // Обновляем график
            this.updateHistoryChart(data);
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ S&P 500 data loaded successfully!', 'success');
            
            // Активируем кнопку предобработки
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '⚙️ Calculate Returns';
            
            console.log('🎉 Данные загружены:', data.prices.length, 'price points');
            
        } catch (error) {
            console.error('💥 Ошибка при загрузке:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.updateProgress(0, `Error: ${error.message}`);
        } finally {
            // Восстанавливаем кнопку
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
                    <strong>Volatility</strong>
                    <div>${this.calculateVolatility(data.prices)}%</div>
                </div>
            </div>
        `;
    }
    
    calculateVolatility(prices) {
        if (!prices || prices.length < 2) return '0.00';
        
        let returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.log(prices[i] / prices[i-1]));
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const annualVolatility = Math.sqrt(variance * 252) * 100;
        
        return annualVolatility.toFixed(2);
    }
    
    updateHistoryChart(data) {
        const priceData = this.dataLoader.getPriceData();
        
        if (priceData && priceData.length > 0) {
            // Берем только каждую 10-ю точку для графика
            const step = Math.ceil(priceData.length / 100);
            const displayData = [];
            
            for (let i = 0; i < priceData.length; i += step) {
                displayData.push(priceData[i]);
            }
            
            const labels = displayData.map(d => d.date);
            const prices = displayData.map(d => d.price);
            
            this.historyChart.data.labels = labels;
            this.historyChart.data.datasets[0].data = prices;
            this.historyChart.update();
            
            console.log('📊 График обновлен с', prices.length, 'точками');
        }
    }
    
    async preprocessData() {
        console.log('Calculating returns and preparing dataset...');
        this.showStatus('⚙️ Calculating S&P 500 returns...', 'info');
        
        const preprocessBtn = document.getElementById('preprocessBtn');
        const loader = document.getElementById('preprocessLoader');
        
        preprocessBtn.disabled = true;
        preprocessBtn.innerHTML = '⏳ Calculating...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            const data = this.dataLoader.getPriceData();
            const prices = data.map(d => d.price);
            
            // Подготавливаем данные для модели
            this.trainingData = this.gruModel.prepareData(prices);
            
            // Строим модель
            this.gruModel.buildModel();
            
            this.showStatus('✅ Returns calculated and model built!', 'success');
            this.showStatus(`📊 Lookback: ${this.gruModel.lookback} days, Horizon: ${this.gruModel.forecastHorizon} days`, 'info');
            
            // Активируем кнопку тренировки
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Train GRU Model';
            
        } catch (error) {
            this.showStatus(`❌ ${error.message}`, 'error');
        } finally {
            preprocessBtn.disabled = false;
            preprocessBtn.innerHTML = '⚙️ Calculate Returns';
            if (loader) loader.style.display = 'none';
        }
    }
    
    async trainModel() {
        console.log('Training GRU model for returns prediction...');
        this.showStatus('🧠 Training GRU model on S&P 500 returns...', 'info');
        
        const trainBtn = document.getElementById('trainBtn');
        const loader = document.getElementById('trainLoader');
        
        trainBtn.disabled = true;
        trainBtn.innerHTML = '⏳ Training...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            // 1. Walk-forward CV (как в коллабе)
            this.showStatus('📊 Running walk-forward cross-validation...', 'info');
            
            const X_train_val = tf.concat([this.trainingData.X_train, this.trainingData.X_val], 0);
            const y_train_val = tf.concat([this.trainingData.y_train, this.trainingData.y_val], 0);
            
            const cvResults = await this.gruModel.walkForwardCV(
                X_train_val, 
                y_train_val, 
                4,  // n_folds
                15  // epochs
            );
            
            // 2. Финальное обучение (как в коллабе)
            this.showStatus('🎯 Final model training...', 'info');
            
            const history = await this.gruModel.train(
                X_train_val,
                y_train_val,
                this.trainingData.X_test,
                this.trainingData.y_test,
                (epoch, metrics, totalEpochs) => {
                    this.updateTrainingChart(epoch, metrics, totalEpochs);
                    this.updateProgress(
                        Math.min(95, (epoch / totalEpochs) * 100),
                        `Epoch ${epoch}/${totalEpochs} - Loss: ${metrics.loss.toFixed(6)}`
                    );
                }
            );
            
            // 3. Оценка модели
            this.showStatus('📈 Evaluating model on test set...', 'info');
            
            const data = this.dataLoader.getPriceData();
            const prices = data.map(d => d.price);
            const dates = data.map(d => d.date);
            
            const evaluation = this.gruModel.evaluate(
                this.trainingData.X_test,
                this.trainingData.y_test,
                prices,
                dates
            );
            
            // 4. Обновляем метрики
            this.updateMetrics(evaluation);
            
            // 5. Обновляем график предсказаний
            this.updatePredictionChart(evaluation);
            
            this.showStatus('✅ GRU model trained successfully!', 'success');
            this.showStatus(`📊 Test RMSE (returns): ${evaluation.rmseReturns}, Direction Accuracy: ${evaluation.directionAccuracy}`, 'info');
            
            // Активируем кнопку предсказаний
            document.getElementById('predictBtn').disabled = false;
            document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
            
        } catch (error) {
            console.error('💥 Ошибка при обучении:', error);
            this.showStatus(`❌ Training error: ${error.message}`, 'error');
        } finally {
            trainBtn.disabled = false;
            trainBtn.innerHTML = '🧠 Train GRU Model';
            if (loader) loader.style.display = 'none';
            this.updateProgress(100, '✅ Training complete!');
        }
    }
    
    updateTrainingChart(epoch, metrics, totalEpochs) {
        if (!this.trainingChart) return;
        
        // Добавляем данные
        const labels = Array.from({length: epoch}, (_, i) => i + 1);
        
        // Если это первый epoch, инициализируем
        if (epoch === 1) {
            this.trainingChart.data.labels = labels;
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
        
        // Берем только последние 50 точек для графика
        const startIdx = Math.max(0, trueReturns.length - 50);
        const labels = Array.from({length: Math.min(50, trueReturns.length)}, (_, i) => i + 1);
        
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
            const data = this.dataLoader.getPriceData();
            const prices = data.map(d => d.price);
            
            // Получаем предсказания на 5 дней
            const predictions = this.gruModel.predictSequence(prices, 5);
            
            // Обновляем отображение
            this.updatePredictionsDisplay(predictions);
            
            this.showStatus('✅ 5-day
