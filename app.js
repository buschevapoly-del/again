// app.js - MAIN APPLICATION (FIXED VERSION)
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('Starting Stock Predictor App...');
        
        this.dataLoader = new DataLoader();
        this.model = new GRUModel();
        this.charts = {};
        this.isProcessing = false;
        
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        this.setupCharts();
        this.setupEventListeners();
        this.showStatus('Ready to load data from GitHub', 'info');
    }

    /**
     * Настройка графиков
     */
    setupCharts() {
        // График обучения
        const trainingCtx = document.getElementById('trainingChart').getContext('2d');
        this.charts.training = new Chart(trainingCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: 'rgba(255, 0, 122, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Исторический график
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
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // График предсказаний
        const predictionCtx = document.getElementById('predictionChart').getContext('2d');
        this.charts.prediction = new Chart(predictionCtx, {
            type: 'bar',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                datasets: [{
                    label: 'Probability',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#ff007a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
        });
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Основная кнопка загрузки данных
        document.getElementById('refreshDataBtn').addEventListener('click', () => this.loadData());
        
        // Остальные кнопки (будут активированы после загрузки данных)
        document.getElementById('preprocessBtn').addEventListener('click', () => this.preprocessData());
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
        
        console.log('Event listeners set up');
    }

    /**
     * Загружает данные из GitHub
     */
    async loadData() {
        if (this.isProcessing) return;
        
        console.log('=== LOAD DATA BUTTON CLICKED ===');
        
        this.isProcessing = true;
        this.showLoader('refreshLoader', true);
        this.showStatus('Loading data from GitHub...', 'info');
        this.setProgress(0, 'Starting');
        
        try {
            this.setProgress(30, 'Downloading CSV from GitHub');
            await this.dataLoader.fetchYahooFinanceData();
            
            this.setProgress(70, 'Processing data');
            const stats = this.dataLoader.getStatistics();
            
            // Обновляем информацию о данных
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.classList.add('active');
            fileInfo.innerHTML = `
                <div style="text-align: center;">
                    <h4 style="color: #ff007a;">${stats.symbol || 'S&P 500'}</h4>
                    <p>${stats.dateRange || 'Date range not available'}</p>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Data Points</strong>
                        <div>${stats.numDays || stats.dataPoints || 0}</div>
                    </div>
                    <div class="info-item">
                        <strong>Current Price</strong>
                        <div>${stats.currentPrice || '$0.00'}</div>
                    </div>
                    <div class="info-item">
                        <strong>Price Range</strong>
                        <div>${stats.priceRange || '$0.00 - $0.00'}</div>
                    </div>
                    <div class="info-item">
                        <strong>Total Return</strong>
                        <div>${stats.totalReturn || '0%'}</div>
                    </div>
                </div>
            `;
            
            // Обновляем исторический график
            this.updateHistoryChart();
            
            this.setProgress(100, 'Data loaded successfully');
            this.showStatus('✅ Data loaded successfully!', 'success');
            
            // Активируем кнопку предобработки
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '⚙️ Preprocess Data';
            
            // Показываем статистику в консоли
            console.log('Data statistics:', stats);
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.setProgress(0, `Error: ${error.message}`);
            
            // Показываем подробную ошибку пользователю
            alert(`Failed to load data:\n\n${error.message}\n\nPlease check:\n1. Internet connection\n2. GitHub link is accessible\n3. CSV file format is correct`);
        } finally {
            this.isProcessing = false;
            this.showLoader('refreshLoader', false);
        }
    }

    /**
     * Предобработка данных
     */
    async preprocessData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('preprocessLoader', true);
        this.showStatus('Preprocessing data...', 'info');
        this.setProgress(0, 'Normalizing data');
        
        try {
            this.setProgress(50, 'Normalizing data');
            this.dataLoader.normalizeData();
            
            this.setProgress(80, 'Preparing dataset');
            this.dataLoader.prepareDataset(60, 5, 0.8);
            
            this.setProgress(100, 'Data ready for training');
            this.showStatus('✅ Data preprocessed successfully!', 'success');
            
            // Активируем кнопку тренировки
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Train GRU Model';
            
            console.log('Data preprocessed, ready for training');
            
        } catch (error) {
            console.error('Failed to preprocess data:', error);
            this.showStatus(`❌ Preprocessing error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('preprocessLoader', false);
        }
    }

    /**
     * Тренировка модели
     */
    async trainModel() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('trainLoader', true);
        this.showStatus('Training GRU model...', 'info');
        this.setProgress(0, 'Building model');
        
        try {
            this.setProgress(20, 'Building GRU model');
            this.model.buildModel();
            
            this.setProgress(40, 'Starting training');
            
            // Подготавливаем данные для графика обучения
            const lossHistory = [];
            const epochLabels = [];
            
            const history = await this.model.train(
                this.dataLoader.X_train, 
                this.dataLoader.y_train,
                (epoch, logs, totalEpochs) => {
                    const progress = 40 + (epoch / totalEpochs) * 50;
                    this.setProgress(progress, `Training epoch ${epoch}/${totalEpochs}`);
                    
                    // Сохраняем данные для графика
                    lossHistory.push(logs.loss);
                    epochLabels.push(`Epoch ${epoch}`);
                    
                    // Обновляем график обучения
                    this.updateTrainingChart(epochLabels, lossHistory);
                }
            );
            
            this.setProgress(90, 'Evaluating model');
            
            // Оцениваем модель
            const evaluation = this.model.evaluate(
                this.dataLoader.X_test, 
                this.dataLoader.y_test
            );
            
            // Обновляем метрики
            document.getElementById('trainLoss').textContent = evaluation.loss;
            document.getElementById('valLoss').textContent = evaluation.loss;
            document.getElementById('rmse').textContent = evaluation.rmse;
            document.getElementById('accuracy').textContent = evaluation.accuracy;
            
            this.setProgress(100, 'Training complete');
            this.showStatus('✅ Model trained successfully!', 'success');
            
            // Активируем кнопку предсказаний
            document.getElementById('predictBtn').disabled = false;
            document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
            
            console.log('Model training complete:', evaluation);
            
        } catch (error) {
            console.error('Failed to train model:', error);
            this.showStatus(`❌ Training error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('trainLoader', false);
        }
    }

    /**
     * Создание предсказаний
     */
    async makePredictions() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Making predictions...', 'info');
        
        try {
            // Получаем последнюю последовательность для предсказания
            const latestSequence = this.dataLoader.getLatestSequence();
            
            // Делаем предсказание
            const predictions = this.model.predict(latestSequence);
            
            // Обновляем интерфейс предсказаний
            this.updatePredictionsDisplay(predictions);
            
            // Обновляем график предсказаний
            this.updatePredictionChart(predictions);
            
            this.showStatus('✅ Predictions generated!', 'success');
            
            console.log('Predictions:', predictions);
            
            // Очищаем память
            latestSequence.dispose();
            
        } catch (error) {
            console.error('Failed to make predictions:', error);
            this.showStatus(`❌ Prediction error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Обновляет график обучения
     */
    updateTrainingChart(labels, data) {
        this.charts.training.data.labels = labels;
        this.charts.training.data.datasets[0].data = data;
        this.charts.training.update();
    }

    /**
     * Обновляет исторический график
     */
    updateHistoryChart() {
        const priceData = this.dataLoader.getPriceData();
        
        if (priceData && priceData.length > 0) {
            const labels = priceData.map(item => item.date);
            const prices = priceData.map(item => item.price);
            
            this.charts.history.data.labels = labels;
            this.charts.history.data.datasets[0].data = prices;
            this.charts.history.update();
        }
    }

    /**
     * Обновляет график предсказаний
     */
    updatePredictionChart(predictions) {
        const probabilities = predictions.map(p => p.probability);
        
        this.charts.prediction.data.datasets[0].data = probabilities;
        this.charts.prediction.update();
    }

    /**
     * Обновляет отображение предсказаний
     */
    updatePredictionsDisplay(predictions) {
        const grid = document.getElementById('predictionGrid');
        grid.innerHTML = '';
        
        predictions.forEach(pred => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'prediction-day';
            
            const probabilityPercent = (pred.probability * 100).toFixed(1);
            const confidenceClass = pred.probability > 0.7 ? 'up' : 
                                  pred.probability < 0.3 ? 'down' : '';
            
            dayDiv.innerHTML = `
                <div class="day-label">Day ${pred.day}</div>
                <div class="prediction-value ${confidenceClass}">${pred.direction}</div>
                <div class="prediction-confidence">Probability: ${probabilityPercent}%</div>
            `;
            
            grid.appendChild(dayDiv);
        });
    }

    /**
     * Показывает/скрывает лоадер
     */
    showLoader(loaderId, show) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.style.display = show ? 'inline-block' : 'none';
        }
    }

    /**
     * Устанавливает прогресс
     */
    setProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }

    /**
     * Показывает статусное сообщение
     */
    showStatus(message, type = 'info') {
        // Создаем новый элемент статуса
        const statusDiv = document.createElement('div');
        statusDiv.className = `status ${type} active`;
        statusDiv.textContent = message;
        
        // Добавляем в контейнер
        const container = document.getElementById('statusContainer');
        if (container) {
            // Удаляем старые статусы
            const oldStatuses = container.querySelectorAll('.status');
            oldStatuses.forEach(status => {
                if (status !== statusDiv) {
                    status.remove();
                }
            });
            
            container.appendChild(statusDiv);
            
            // Автоматически скрываем через 5 секунд
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.classList.remove('active');
                    setTimeout(() => statusDiv.remove(), 300);
                }
            }, 5000);
        }
    }

    /**
     * Обновляет отображение статистики
     */
    updateStatsDisplay(stats) {
        const statsDiv = document.getElementById('data-stats');
        if (!statsDiv) return;
        
        statsDiv.innerHTML = `
            <h3>Data Statistics</h3>
            <p><strong>Status:</strong> ${stats.status || 'Unknown'}</p>
            <p><strong>Symbol:</strong> ${stats.symbol || 'Unknown'}</p>
            <p><strong>Data Points:</strong> ${stats.numDays || stats.dataPoints || 0} days</p>
            <p><strong>Date Range:</strong> ${stats.dateRange || 'N/A'}</p>
            <p><strong>Current Price:</strong> ${stats.currentPrice || '$0.00'}</p>
            <p><strong>Price Range:</strong> ${stats.priceRange || '$0.00 - $0.00'}</p>
            <p><strong>Total Return:</strong> ${stats.totalReturn || '0%'}</p>
            ${stats.returns ? `
            <h4>Daily Returns</h4>
            <p><strong>Positive Days:</strong> ${stats.returns.positiveDays || 'N/A'}</p>
            <p><strong>Positive Rate:</strong> ${stats.returns.positiveRate || 'N/A'}</p>
            <p><strong>Avg Daily Return:</strong> ${stats.returns.avgDailyReturn || stats.returns.avgDaily || 'N/A'}</p>
            <p><strong>Volatility:</strong> ${stats.returns.volatility || 'N/A'}</p>
            ` : ''}
        `;
    }

    /**
     * Обновляет график цен
     */
    updatePriceChart(data) {
        if (!data || data.length === 0) return;
        
        const labels = data.map(item => item.date);
        const prices = data.map(item => item.price);
        
        this.charts.history.data.labels = labels;
        this.charts.history.data.datasets[0].data = prices;
        this.charts.history.update();
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, starting app...');
    
    try {
        // Создаем экземпляр приложения
        window.app = new StockPredictorApp();
        
        // Добавляем обработчик ошибок для отладки
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (window.app) {
                window.app.showStatus(`⚠️ Error: ${event.error.message}`, 'error');
            }
        });
        
        // Обработчик для Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise rejection:', event.reason);
            if (window.app) {
                window.app.showStatus(`⚠️ Promise error: ${event.reason.message}`, 'error');
            }
        });
        
        console.log('✅ App initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        
        // Показываем сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.className = 'status error active';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            max-width: 600px;
            padding: 20px;
            border-radius: 10px;
            background: rgba(220, 53, 69, 0.9);
            color: white;
            font-family: monospace;
        `;
        errorDiv.innerHTML = `
            <h3>⚠️ Application Error</h3>
            <p>${error.message}</p>
            <p>Check console for details (F12)</p>
            <button onclick="location.reload()" style="
                margin-top: 10px;
                padding: 10px 20px;
                background: white;
                color: #dc3545;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Reload Page</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
});

// Экспортируем класс для возможного использования из консоли
export { StockPredictorApp };
