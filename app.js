// app.js - MAIN APPLICATION
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

console.log('🚀 Starting Stock Predictor App...');

// Глобальные переменные
let app = null;
let priceChart = null;
let trainingChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing app...');
    
    app = new StockPredictorApp();
    
    // Глобальная функция для отладки
    window.debugApp = function() {
        console.log('=== DEBUG ===');
        console.log('App:', app);
        console.log('DataLoader:', app.dataLoader);
        console.log('GRU Model:', app.gruModel);
        console.log('=== END DEBUG ===');
    };
    
    console.log('✅ App initialized successfully');
});

class StockPredictorApp {
    constructor() {
        console.log('📱 Creating StockPredictorApp...');
        
        this.dataLoader = new DataLoader();
        this.gruModel = new GRUModel();
        this.isProcessing = false;
        
        this.setupCharts();
        this.setupEventListeners();
        this.showStatus('✅ App ready! Click "Load Data from GitHub"', 'info');
    }
    
    setupCharts() {
        console.log('📊 Setting up charts...');
        
        // Price Chart
        const priceCtx = document.getElementById('priceChart');
        if (!priceCtx) {
            console.error('❌ priceChart canvas not found!');
            return;
        }
        
        priceChart = new Chart(priceCtx.getContext('2d'), {
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
        
        // Training Chart
        const trainingCtx = document.getElementById('trainingChart');
        if (!trainingCtx) {
            console.error('❌ trainingChart canvas not found!');
            return;
        }
        
        trainingChart = new Chart(trainingCtx.getContext('2d'), {
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
                maintainAspectRatio: false
            }
        });
        
        console.log('✅ Charts setup complete');
    }
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        const loadBtn = document.getElementById('loadBtn');
        const preprocessBtn = document.getElementById('preprocessBtn');
        const trainBtn = document.getElementById('trainBtn');
        const predictBtn = document.getElementById('predictBtn');
        
        if (!loadBtn) {
            console.error('❌ loadBtn not found!');
            return;
        }
        
        // Load Button
        loadBtn.addEventListener('click', () => {
            console.log('🎯 Load button clicked!');
            this.loadData();
        });
        
        // Preprocess Button
        preprocessBtn.addEventListener('click', () => {
            console.log('⚙️ Preprocess button clicked!');
            this.prepareData();
        });
        
        // Train Button
        trainBtn.addEventListener('click', () => {
            console.log('🧠 Train button clicked!');
            this.trainModel();
        });
        
        // Predict Button
        predictBtn.addEventListener('click', () => {
            console.log('🔮 Predict button clicked!');
            this.makePredictions();
        });
        
        console.log('✅ Event listeners setup complete');
    }
    
    async loadData() {
        if (this.isProcessing) {
            console.log('⚠️ Already processing');
            return;
        }
        
        this.isProcessing = true;
        this.showLoader('loadLoader', true);
        this.showStatus('⏳ Loading data from GitHub...', 'info');
        this.updateProgress(10, 'Connecting...');
        
        const loadBtn = document.getElementById('loadBtn');
        loadBtn.disabled = true;
        loadBtn.innerHTML = '⏳ Loading...';
        
        try {
            this.updateProgress(30, 'Downloading CSV...');
            
            // Load data
            const data = await this.dataLoader.loadData();
            
            this.updateProgress(70, 'Processing data...');
            
            // Update stats
            this.updateStats();
            
            // Update chart
            this.updatePriceChart();
            
            this.updateProgress(100, '✅ Data loaded!');
            this.showStatus('✅ Data loaded successfully!', 'success');
            
            // Enable preprocess button
            const preprocessBtn = document.getElementById('preprocessBtn');
            preprocessBtn.disabled = false;
            preprocessBtn.innerHTML = '⚙️ 2. Prepare Data';
            
            console.log('🎉 Data load complete');
            
        } catch (error) {
            console.error('💥 Load error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showLoader('loadLoader', false);
            loadBtn.disabled = false;
            loadBtn.innerHTML = '📥 1. Load Data from GitHub';
        }
    }
    
    async prepareData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('preprocessLoader', true);
        this.showStatus('⚙️ Preparing data for training...', 'info');
        this.updateProgress(0, 'Creating sequences...');
        
        try {
            this.updateProgress(50, 'Creating training sequences...');
            
            // Prepare data for GRU
            const dataset = this.dataLoader.prepareForTraining(60, 5);
            
            this.updateProgress(100, '✅ Data ready!');
            this.showStatus('✅ Data prepared for GRU training!', 'success');
            
            // Enable train button
            const trainBtn = document.getElementById('trainBtn');
            trainBtn.disabled = false;
            trainBtn.innerHTML = '🧠 3. Train GRU Model';
            
            console.log('📊 Dataset prepared');
            
        } catch (error) {
            console.error('💥 Prep error:', error);
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
        this.showStatus('🧠 Training GRU model... This may take 30-60 seconds', 'info');
        this.updateProgress(0, 'Building model...');
        
        try {
            this.updateProgress(10, 'Building GRU model...');
            
            // Build model
            this.gruModel.buildModel([1, 60]);
            
            // Get data
            const X_train = this.dataLoader.X_train;
            const y_train = this.dataLoader.y_train;
            const X_test = this.dataLoader.X_test;
            const y_test = this.dataLoader.y_test;
            
            if (!X_train || !y_train) {
                throw new Error('Data not prepared. Click "Prepare Data" first.');
            }
            
            // Split test data for validation
            const valSplit = Math.floor(X_train.shape[0] * 0.8);
            const X_val = X_train.slice([valSplit, 0, 0], [X_train.shape[0] - valSplit, 1, 60]);
            const y_val = y_train.slice([valSplit, 0], [y_train.shape[0] - valSplit, 1]);
            const X_train_sub = X_train.slice([0, 0, 0], [valSplit, 1, 60]);
            const y_train_sub = y_train.slice([0, 0], [valSplit, 1]);
            
            this.updateProgress(20, 'Starting training...');
            
            // Train model
            const history = await this.gruModel.train(
                X_train_sub, y_train_sub, X_val, y_val,
                (epoch, totalEpochs, trainLoss, valLoss) => {
                    const progress = 20 + (epoch / totalEpochs) * 70;
                    this.updateProgress(progress, `Epoch ${epoch}/${totalEpochs} - Loss: ${trainLoss.toFixed(6)}`);
                    
                    // Update training chart
                    this.updateTrainingChart(epoch, trainLoss, valLoss);
                    
                    // Update metrics
                    if (epoch % 5 === 0) {
                        this.updateMetrics(trainLoss, valLoss);
                    }
                }
            );
            
            // Evaluate on test set
            this.updateProgress(95, 'Evaluating model...');
            const evalResult = this.gruModel.evaluate(X_test, y_test);
            
            // Update final metrics
            this.updateFinalMetrics(evalResult);
            
            this.updateProgress(100, '✅ Training complete!');
            this.showStatus('✅ GRU model trained successfully!', 'success');
            
            // Enable predict button
            const predictBtn = document.getElementById('predictBtn');
            predictBtn.disabled = false;
            predictBtn.innerHTML = '🔮 4. Predict Next 5 Days';
            
            console.log('🏆 Training complete:', evalResult);
            
        } catch (error) {
            console.error('💥 Train error:', error);
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
            // Get latest sequence
            const latest = this.dataLoader.getLatestSequence(60);
            
            // Make predictions
            const predictions = this.gruModel.predictSequence(latest, 5);
            
            // Update UI
            this.updatePredictions(predictions);
            
            this.showStatus('✅ Predictions generated!', 'success');
            
            console.log('📈 Predictions:', predictions);
            
            // Cleanup
            latest.dispose();
            
        } catch (error) {
            console.error('💥 Predict error:', error);
            this.showStatus(`❌ Prediction error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    updatePriceChart() {
        if (!priceChart) return;
        
        const chartData = this.dataLoader.getChartData(100);
        
        const labels = chartData.map(d => d.date);
        const prices = chartData.map(d => d.price);
        
        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = prices;
        priceChart.update();
        
        console.log('📊 Price chart updated');
    }
    
    updateTrainingChart(epoch, trainLoss, valLoss) {
        if (!trainingChart) return;
        
        trainingChart.data.labels.push(`E${epoch}`);
        trainingChart.data.datasets[0].data.push(trainLoss);
        trainingChart.data.datasets[1].data.push(valLoss);
        
        // Limit to 50 points
        if (trainingChart.data.labels.length > 50) {
            trainingChart.data.labels.shift();
            trainingChart.data.datasets[0].data.shift();
            trainingChart.data.datasets[1].data.shift();
        }
        
        trainingChart.update();
    }
    
    updateMetrics(trainLoss, valLoss) {
        const trainElem = document.getElementById('trainLoss');
        const valElem = document.getElementById('valLoss');
        
        if (trainElem) trainElem.textContent = trainLoss.toFixed(6);
        if (valElem) valElem.textContent = valLoss.toFixed(6);
    }
    
    updateFinalMetrics(evalResult) {
        const rmseElem = document.getElementById('rmse');
        const accElem = document.getElementById('accuracy');
        
        if (rmseElem) rmseElem.textContent = evalResult.rmse;
        if (accElem) accElem.textContent = evalResult.accuracy;
    }
    
    updateStats() {
        const stats = this.dataLoader.getStats();
        const statsText = document.getElementById('statsText');
        const fileInfo = document.getElementById('fileInfo');
        
        if (statsText) {
            statsText.innerHTML = `
                <div style="margin: 10px 0;">
                    <strong>${stats.symbol}</strong><br>
                    ${stats.points} data points<br>
                    Current: ${stats.current}<br>
                    Range: ${stats.min} - ${stats.max}<br>
                    ${stats.dateRange}
                </div>
                ${stats.returns ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <strong>Returns:</strong><br>
                    Positive: ${stats.returns.positive} (${stats.returns.rate})<br>
                    Avg Daily: ${stats.returns.avg}
                </div>
                ` : ''}
            `;
        }
        
        if (fileInfo) {
            fileInfo.style.display = 'block';
        }
    }
    
    updatePredictions(predictions) {
        const grid = document.getElementById('predictionGrid');
        if (!grid) return;
        
        predictions.forEach((pred, i) => {
            const dayElement = grid.querySelector(`.prediction-day:nth-child(${i + 1})`);
            if (dayElement) {
                const returnPercent = (pred.value * 100).toFixed(3);
                
                dayElement.querySelector('.prediction-value').textContent = 
                    `${pred.direction}`;
                
                dayElement.querySelector('.prediction-value').className = 
                    `prediction-value ${pred.direction.toLowerCase()}`;
                
                dayElement.querySelector('.prediction-confidence').textContent = 
                    `Return: ${returnPercent}%`;
            }
        });
    }
    
    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElem = document.getElementById('progressText');
        
        if (fill) fill.style.width = `${percent}%`;
        if (textElem) textElem.textContent = text;
        
        console.log(`📊 Progress: ${percent}% - ${text}`);
    }
    
    showLoader(loaderId, show) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.style.display = show ? 'inline-block' : 'none';
        }
    }
    
    showStatus(message, type = 'info') {
        console.log(`📢 Status: ${message}`);
        
        const container = document.getElementById('statusContainer');
        if (!container) {
            console.warn('statusContainer not found');
            return;
        }
        
        const status = document.createElement('div');
        status.className = `status ${type} active`;
        status.textContent = message;
        
        // Remove old statuses
        const oldStatuses = container.querySelectorAll('.status');
        oldStatuses.forEach(s => s.remove());
        
        container.appendChild(status);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (status.parentNode) {
                status.classList.remove('active');
                setTimeout(() => status.remove(), 300);
            }
        }, 5000);
    }
}
