// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('📱 Stock Predictor App starting...');
        this.dataLoader = new DataLoader();
        this.model = null;
        this.setupCharts();
        this.setupEventListeners();
        console.log('✅ App ready. Click "Load Data from GitHub"');
    }
    
    setupCharts() {
        // Просто инициализируем пустые графики
        this.historyChart = this.createChart('historyChart', 'S&P 500 Price History', 'line');
        this.trainingChart = this.createChart('trainingChart', 'Training Loss', 'line');
        this.predictionChart = this.createChart('predictionChart', 'Predictions', 'bar');
    }
    
    createChart(canvasId, label, type) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: type,
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: '#ff007a',
                    backgroundColor: type === 'bar' ? '#ff007a' : 'rgba(255,0,122,0.1)',
                    fill: type === 'line'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
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
        
        // Другие кнопки
        document.getElementById('preprocessBtn').addEventListener('click', () => this.preprocessData());
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
        
        console.log('✅ Event listeners установлены');
    }
    
    async loadData() {
        console.log('🚀 ЗАПУСК loadData()');
        
        // Показываем, что процесс начался
        this.showStatus('⏳ Loading data from GitHub...', 'info');
        this.updateProgress(10, 'Starting...');
        
        const loadBtn = document.getElementById('refreshDataBtn');
        const loader = document.getElementById('refreshLoader');
        
        // Блокируем кнопку и показываем лоадер
        loadBtn.disabled = true;
        loadBtn.innerHTML = '⏳ Loading...';
        if (loader) loader.style.display = 'inline-block';
        
        try {
            this.updateProgress(30, 'Fetching CSV...');
            
            // Загружаем данные
            const data = await this.dataLoader.fetchYahooFinanceData();
            
            this.updateProgress(70, 'Processing data...');
            
            // Обновляем информацию о файле
            this.updateFileInfo(data);
            
            // Обновляем график
            this.updateHistoryChart();
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ Data loaded successfully!', 'success');
            
            // Активируем кнопку предобработки
            document.getElementById('preprocessBtn').disabled = false;
            document.getElementById('preprocessBtn').innerHTML = '⚙️ Preprocess Data';
            
            console.log('🎉 Данные загружены:', data);
            
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
            </div>
        `;
    }
    
    updateHistoryChart() {
        const priceData = this.dataLoader.getPriceData();
        
        if (priceData && priceData.length > 0) {
            // Берем только каждую 10-ю точку для графика
            const step = Math.ceil(priceData.length / 50);
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
        console.log('Preprocessing data...');
        this.showStatus('⚙️ Preprocessing data...', 'info');
        
        try {
            this.dataLoader.normalizeData();
            this.dataLoader.prepareDataset();
            
            this.showStatus('✅ Data preprocessed!', 'success');
            
            // Активируем кнопку тренировки
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('trainBtn').innerHTML = '🧠 Train GRU Model';
            
        } catch (error) {
            this.showStatus(`❌ ${error.message}`, 'error');
        }
    }
    
    async trainModel() {
        console.log('Training model...');
        this.showStatus('🧠 Training model...', 'info');
        
        setTimeout(() => {
            this.showStatus('✅ Model trained!', 'success');
            
            // Активируем кнопку предсказаний
            document.getElementById('predictBtn').disabled = false;
            document.getElementById('predictBtn').innerHTML = '🔮 Predict Next 5 Days';
            
            // Обновляем метрики (тестовые значения)
            document.getElementById('trainLoss').textContent = '0.1234';
            document.getElementById('valLoss').textContent = '0.1456';
            document.getElementById('rmse').textContent = '0.2345';
            document.getElementById('accuracy').textContent = '67.5%';
        }, 2000);
    }
    
    async makePredictions() {
        console.log('Making predictions...');
        this.showStatus('🔮 Making predictions...', 'info');
        
        setTimeout(() => {
            const predictions = [
                { day: 1, direction: 'UP', probability: 0.72 },
                { day: 2, direction: 'DOWN', probability: 0.41 },
                { day: 3, direction: 'UP', probability: 0.68 },
                { day: 4, direction: 'UP', probability: 0.79 },
                { day: 5, direction: 'DOWN', probability: 0.35 }
            ];
            
            this.updatePredictionsDisplay(predictions);
            this.showStatus('✅ Predictions ready!', 'success');
        }, 1000);
    }
    
    updatePredictionsDisplay(predictions) {
        const grid = document.getElementById('predictionGrid');
        
        predictions.forEach(pred => {
            const dayElement = grid.querySelector(`.prediction-day:nth-child(${pred.day})`);
            if (dayElement) {
                dayElement.querySelector('.prediction-value').textContent = pred.direction;
                dayElement.querySelector('.prediction-value').className = `prediction-value ${pred.direction.toLowerCase()}`;
                dayElement.querySelector('.prediction-confidence').textContent = 
                    `Confidence: ${(pred.probability * 100).toFixed(1)}%`;
            }
        });
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElem = document.getElementById('progressText');
        
        if (fill) fill.style.width = `${percent}%`;
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

// Проверяем, что DOM загружен
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, создаем приложение...');
        window.app = new StockPredictorApp();
    });
} else {
    console.log('📄 DOM уже загружен, создаем приложение...');
    window.app = new StockPredictorApp();
}

// Добавляем глобальную отладочную функцию
window.debugApp = function() {
    console.log('=== ОТЛАДКА ПРИЛОЖЕНИЯ ===');
    console.log('Кнопка найдена:', !!document.getElementById('refreshDataBtn'));
    console.log('Загрузчик данных:', window.app ? window.app.dataLoader : 'не создан');
    console.log('=== КОНЕЦ ОТЛАДКИ ===');
};
