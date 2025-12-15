// app.js - ОСНОВНОЙ ФАЙЛ С ТРЕНИРОВКОЙ GRU
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('📈 Stock Predictor App starting...');
        
        this.dataLoader = new DataLoader();
        this.gruModel = new GRUModel();
        this.charts = {};
        this.isProcessing = false;
        this.trainingHistory = [];
        
        this.init();
    }
    
    init() {
        this.setupCharts();
        this.setupEventListeners();
        this.showStatus('✅ Ready to load data from GitHub', 'info');
    }
    
    setupCharts() {
        // График цен
        const historyCtx = document.getElementById('historyChart').getContext('2d');
        this.charts.history = new Chart(historyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'S&P 500 Price',
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: 'rgba(255, 0, 122, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                }
            }
        });
        
        // График обучения
        const trainingCtx = document.getElementById('trainingChart').getContext('2d');
        this.charts.training = new Chart(trainingCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Training Loss',
                        data: [],
                        borderColor: '#ff007a',
                        backgroundColor: 'rgba(255, 0, 122, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Validation Loss',
                        data: [],
                        borderColor: '#00aaff',
                        backgroundColor: 'rgba(0, 170, 255, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                }
            }
        });
        
        // График предсказаний
        const predictionCtx = document.getElementById('predictionChart').getContext('2d');
        this.charts.prediction = new Chart(predictionCtx, {
            type: 'bar',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                datasets: [{
                    label: 'Predicted Return (%)',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#ff007a',
                        '#ff3399',
                        '#ff66b3',
                        '#ff99cc',
                        '#ffcce6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Return (%)'
                        }
                    }
                }
            }
        });
    }
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Основная кнопка загрузки
        document.getElementById('refreshDataBtn').addEventListener('click', () => this.loadData());
        
        // Кнопка предобработки
        document.getElementById('preprocessBtn').addEventListener('click', () => this.preprocessData());
        
        // Кнопка тренировки
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        
        // Кнопка предсказаний
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
        
        console.log('✅ Event listeners установлены');
    }
    
    async loadData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('refreshLoader', true);
        this.showStatus('⏳ Loading data from GitHub...', 'info');
        this.updateProgress(10, 'Connecting to GitHub...');
        
        try {
            this.updateProgress(30, 'Downloading CSV...');
            await this.dataLoader.fetchYahooFinanceData();
            
            this.updateProgress(60, 'Calculating returns...');
            const stats = this.dataLoader.getStatistics();
            
            // Обновляем информацию
            this.updateFileInfo(stats);
            
            // Обновляем график цен
            this.updateHistoryChart();
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ Data loaded successfully!', 'success');
            
            // Активируем кнопку предобработки
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '⚙️ Prepare for Training';
            
            console.log('📊 Statistics:', stats);
            
        } catch (error) {
            console.error('💥 Load error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('refreshLoader', false);
        }
    }
    
    async preprocessData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('preprocessLoader', true);
        this.showStatus('⚙️ Preparing data for GRU training...', 'info');
        this.updateProgress(0, 'Creating sequences...');
        
        try {
            this.updateProgress(50, 'Creating training sequences...');
            
            // Подготавливаем данные для предсказания доходности
            const dataset = this.dataLoader.prepareDatasetForReturnsPrediction(60, 5);
            
            this.updateProgress(100, '✅ Data ready for training!');
            this.showStatus('✅ Data prepared for GRU training!', 'success');
            
            // Активируем кнопку тренировки
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Train GRU Model';
            
            console.log('📐 Dataset prepared:', dataset);
            
        } catch (error) {
            console.error('💥 Preprocessing error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('preprocessLoader', false);
        }
    }
    
    async trainModel() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('trainLoader', true);
        this.showStatus('🧠 Training GRU model...', 'info');
        this.updateProgress(0, 'Building model...');
        
        try {
            // Строим модель
            this.updateProgress(10, 'Building GRU architecture...');
            this.gruModel.buildModel([1, 60]);
            
            // Получаем данные
            const X_train = this.dataLoader.X_train;
            const y_train = this.dataLoader.y_train;
            const X_val = this.dataLoader.X_val;
            const y_val = this.dataLoader.y_val;
            const X_test = this.dataLoader.X_test;
            const y_test = this.dataLoader.y_test;
            
            if (!X_train || !y_train) {
                throw new Error('Data not prepared. Click "Prepare for Training" first.');
            }
            
            // Обучаем модель
            this.updateProgress(20, 'Starting training...');
            
            const trainingEpochs = 50;
            let currentEpoch = 0;
            
            const history = await this.gruModel.train(
                X_train, y_train, X_val, y_val, trainingEpochs, 32,
                (epoch, logs, totalEpochs) => {
                    currentEpoch = epoch;
                    const progress = 20 + (epoch / totalEpochs) * 70;
                    this.updateProgress(progress, `Epoch ${epoch}/${totalEpochs} - Loss: ${logs.loss.toFixed(6)}`);
                    
                    // Обновляем график обучения
                    this.updateTrainingChart(epoch, logs.loss, logs.val_loss);
                    
                    // Обновляем метрики в реальном времени
                    if (epoch % 5 === 0) {
                        this.updateTrainingMetrics(logs);
                    }
                }
            );
            
            // Оцениваем модель
            this.updateProgress(95, 'Evaluating model...');
            const evaluation = this.gruModel.evaluate(X_test, y_test);
            
            // Обновляем финальные метрики
            this.updateFinalMetrics(evaluation);
            
            this.updateProgress(100, '✅ Training complete!');
            this.showStatus('✅ GRU model trained successfully!', 'success');
            
            // Активируем кнопку предсказаний
            document.getElementById('predictBtn').disabled = false;
            document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
            
            console.log('🏆 Model evaluation:', evaluation);
            
        } catch (error) {
            console.error('💥 Training error:', error);
            this.showStatus(`❌ Training error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('trainLoader', false);
        }
    }
    
    async makePredictions() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('🔮 Making predictions for next 5 days...', 'info');
        
        try {
            // Получаем последнюю последовательность
            const latestSequence = this.dataLoader.getLatestSequence(60);
            
            // Делаем предсказания на 5 дней вперед
            const predictions = this.gruModel.predictSequence(latestSequence, 5);
            
            // Обновляем интерфейс
            this.updatePredictionsDisplay(predictions);
            
            // Обновляем график предсказаний
            this.updatePredictionChart(predictions);
            
            this.showStatus('✅ Predictions generated!', 'success');
            
            console.log('📈 Predictions:', predictions);
            
            // Очищаем память
            latestSequence.dispose();
            
        } catch (error) {
            console.error('💥 Prediction error:', error);
            this.showStatus(`❌ Prediction error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    updateTrainingChart(epoch, loss, valLoss) {
        if (!this.charts.training) return;
        
        // Добавляем данные
        this.charts.training.data.labels.push(`Epoch ${epoch}`);
        this.charts.training.data.datasets[0].data.push(loss);
        this.charts.training.data.datasets[1].data.push(valLoss);
        
        // Ограничиваем количество точек на графике
        if (this.charts.training.data.labels.length > 50) {
            this.charts.training.data.labels.shift();
            this.charts.training.data.datasets[0].data.shift();
            this.charts.training.data.datasets[1].data.shift();
        }
        
        this.charts.training.update();
    }
    
    updateTrainingMetrics(logs) {
        // Обновляем метрики в реальном времени
        const trainLossElem = document.getElementById('trainLoss');
        const valLossElem = document.getElementById('valLoss');
        
        if (trainLossElem) trainLossElem.textContent = logs.loss.toFixed(6);
        if (valLossElem) valLossElem.textContent = logs.val_loss.toFixed(6);
    }
    
    updateFinalMetrics(evaluation) {
        document.getElementById('trainLoss').textContent = this.gruModel.trainingLosses.slice(-1)[0].toFixed(6) || '0.0000';
        document.getElementById('valLoss').textContent = this.gruModel.validationLosses.slice(-1)[0].toFixed(6) || '0.0000';
        document.getElementById('rmse').textContent = evaluation.rmse;
        document.getElementById('accuracy').textContent = evaluation.directionAccuracy;
    }
    
    updateHistoryChart() {
        const priceData = this.dataLoader.getPriceData(100);
        
        if (priceData && priceData.length > 0) {
            const labels = priceData.map(d => d.date);
            const prices = priceData.map(d => d.price);
            
            this.charts.history.data.labels = labels;
            this.charts.history.data.datasets[0].data = prices;
            this.charts.history.update();
            
            console.log('📊 History chart updated with', prices.length, 'points');
        }
    }
    
    updatePredictionChart(predictions) {
        if (!this.charts.prediction) return;
        
        // Конвертируем доходности в проценты для лучшей визуализации
        const returnsPercent = predictions.map(p => p.predictedReturn * 100);
        
        this.charts.prediction.data.datasets[0].data = returnsPercent;
        this.charts.prediction.update();
    }
    
    updatePredictionsDisplay(predictions) {
        const grid = document.getElementById('predictionGrid');
        
        predictions.forEach(pred => {
            const dayElement = grid.querySelector(`.prediction-day:nth-child(${pred.day})`);
            if (dayElement) {
                const returnPercent = (pred.predictedReturn * 100).toFixed(3);
                
                dayElement.querySelector('.prediction-value').textContent = 
                    `${pred.direction} (${returnPercent}%)`;
                
                dayElement.querySelector('.prediction-value').className = 
                    `prediction-value ${pred.direction.toLowerCase()}`;
                
                dayElement.querySelector('.prediction-confidence').textContent = 
                    `Confidence: ${pred.confidence}`;
            }
        });
    }
    
    updateFileInfo(stats) {
        const fileInfo = document.getElementById('fileInfo');
        if (!fileInfo) return;
        
        fileInfo.classList.add('active');
        
        let returnsHTML = '';
        if (stats.returns) {
            returnsHTML = `
                <div class="info-grid" style="margin-top: 15px;">
                    <div class="info-item">
                        <strong>Positive Days</strong>
                        <div>${stats.returns.positiveDays}</div>
                    </div>
                    <div class="info-item">
                        <strong>Avg Daily Return</strong>
                        <div>${stats.returns.avgDailyReturn}</div>
                    </div>
                    <div class="info-item">
                        <strong>Volatility</strong>
                        <div>${stats.returns.dailyVolatility}</div>
                    </div>
                    <div class="info-item">
                        <strong>Sharpe Ratio</strong>
                        <div>${stats.returns.sharpeRatio}</div>
                    </div>
                </div>
            `;
        }
        
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
            </div>
            ${returnsHTML}
        `;
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElem = document.getElementById('progressText');
        
        if (fill) fill.style.width = `${percent}%`;
        if (textElem) textElem.textContent = text;
    }
    
    showLoader(loaderId, show) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.style.display = show ? 'inline-block' : 'none';
        }
    }
    
    showStatus(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        const container = document.getElementById('statusContainer');
        if (!container) {
            // Создаем контейнер если его нет
            const newContainer = document.createElement('div');
            newContainer.id = 'statusContainer';
            document.querySelector('.card').appendChild(newContainer);
            this.showStatus(message, type);
            return;
        }
        
        const status = document.createElement('div');
        status.className = `status ${type} active`;
        status.textContent = message;
        
        // Удаляем старые статусы
        const oldStatuses = container.querySelectorAll('.status');
        oldStatuses.forEach(s => s.remove());
        
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Stock Predictor App...');
    
    try {
        window.app = new StockPredictorApp();
        console.log('✅ App initialized successfully');
        
        // Глобальная функция для отлад
