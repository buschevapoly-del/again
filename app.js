// app.js
/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

import { dataLoader } from './data-loader.js';
import { gruModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        this.isDataLoaded = false;
        this.isModelTrained = false;
        this.priceChart = null;
        this.performanceChart = null;
        
        this.initEventListeners();
        this.updateUI();
        
        // Initialize TensorFlow.js
        tf.setBackend('webgl').then(() => {
            console.log('TensorFlow.js WebGL backend initialized');
        }).catch(() => {
            tf.setBackend('cpu');
            console.log('TensorFlow.js CPU backend initialized');
        });
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Data source buttons
        document.getElementById('useDemoDataBtn').addEventListener('click', () => {
            this.showFileUploadSection(false);
            this.showYahooControls(false);
            this.useDemoData();
        });
        
        document.getElementById('fetchYahooBtn').addEventListener('click', () => {
            this.showFileUploadSection(false);
            this.showYahooControls(true);
        });
        
        document.getElementById('quickStartBtn').addEventListener('click', () => {
            this.quickStart();
        });
        
        // Yahoo Finance controls
        document.getElementById('fetchDataBtn').addEventListener('click', () => {
            this.fetchYahooData();
        });
        
        // File upload
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        
        dropArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.onFileSelected(e));
        
        // Training controls
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadAndPrepareData());
        document.getElementById('viewDataBtn').addEventListener('click', () => this.showDataStats());
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('stopTrainBtn').addEventListener('click', () => this.stopTraining());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
    }

    /**
     * Quick start with demo data
     */
    async quickStart() {
        const quickStartBtn = document.getElementById('quickStartBtn');
        quickStartBtn.disabled = true;
        quickStartBtn.innerHTML = '<div class="loading"></div> Starting...';
        
        try {
            // Generate demo data
            await dataLoader.generateDemoData(500);
            
            // Show success message
            this.showStatus('success', '✅ Demo data generated successfully!');
            
            // Enable training
            this.isDataLoaded = true;
            this.updateUI();
            
            // Show stats
            this.showDataStats();
            
            // Create initial chart
            this.createInitialChart();
            
        } catch (error) {
            console.error('Quick start error:', error);
            this.showStatus('error', `Quick start failed: ${error.message}`);
        } finally {
            quickStartBtn.disabled = false;
            quickStartBtn.innerHTML = '<i class="fas fa-rocket"></i> Quick Start with Demo Data';
        }
    }

    /**
     * Use demo data
     */
    async useDemoData() {
        this.showStatus('info', 'Generating demo data...');
        
        try {
            await dataLoader.generateDemoData(1000);
            this.isDataLoaded = true;
            this.updateUI();
            this.showStatus('success', '✅ Demo data ready! Click "Load & Prepare Data" to continue.');
        } catch (error) {
            this.showStatus('error', `Failed to generate demo data: ${error.message}`);
        }
    }

    /**
     * Fetch data from Yahoo Finance
     */
    async fetchYahooData() {
        const fetchBtn = document.getElementById('fetchDataBtn');
        const ticker = document.getElementById('tickerSelect').value;
        const period = document.getElementById('periodSelect').value;
        const interval = document.getElementById('intervalSelect').value;
        
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<div class="loading"></div> Fetching...';
        
        try {
            this.showStatus('info', `Fetching ${ticker} data from Yahoo Finance...`);
            
            await dataLoader.fetchYahooFinanceData(ticker, period, interval);
            
            this.isDataLoaded = true;
            this.updateUI();
            
            this.showStatus('success', `✅ ${ticker} data fetched successfully!`);
            
            // Show stats
            this.showDataStats();
            
        } catch (error) {
            console.error('Yahoo Finance fetch error:', error);
            this.showStatus('error', `Failed to fetch data: ${error.message}`);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<i class="fas fa-download"></i> Fetch Data';
        }
    }

    /**
     * Handle file selection
     */
    onFileSelected(e) {
        const file = e.target.files[0];
        if (file) {
            this.currentFile = file;
            
            // Update UI
            const dropArea = document.getElementById('dropArea');
            dropArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: #48bb78;"></i>
                <h3>File Selected</h3>
                <p><strong>${file.name}</strong></p>
                <p>${Math.round(file.size / 1024)} KB</p>
            `;
            
            // Enable load button
            document.getElementById('loadDataBtn').disabled = false;
            
            this.showStatus('info', `File selected: ${file.name}`);
        }
    }

    /**
     * Show/hide file upload section
     */
    showFileUploadSection(show) {
        document.getElementById('fileUploadSection').style.display = show ? 'block' : 'none';
    }

    /**
     * Show/hide Yahoo Finance controls
     */
    showYahooControls(show) {
        document.getElementById('yfinanceControls').style.display = show ? 'block' : 'none';
    }

    /**
     * Load and prepare data
     */
    async loadAndPrepareData() {
        const loadBtn = document.getElementById('loadDataBtn');
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<div class="loading"></div> Processing...';
        
        const progress = document.getElementById('dataProgressContainer');
        const progressFill = document.getElementById('dataProgressFill');
        const progressText = document.getElementById('dataProgressText');
        const statusText = document.getElementById('dataStatusText');
        
        progress.style.display = 'block';
        progressFill.style.width = '10%';
        progressText.textContent = '10%';
        statusText.textContent = 'Starting...';
        
        try {
            // Preprocess data
            progressFill.style.width = '30%';
            progressText.textContent = '30%';
            statusText.textContent = 'Preprocessing...';
            
            this.datasets = dataLoader.preprocessData();
            
            progressFill.style.width = '70%';
            progressText.textContent = '70%';
            statusText.textContent = 'Creating datasets...';
            
            // Enable training
            this.isDataLoaded = true;
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('viewDataBtn').disabled = false;
            
            progressFill.style.width = '100%';
            progressText.textContent = '100%';
            statusText.textContent = 'Complete!';
            
            this.showStatus('success', '✅ Data prepared successfully! Ready for training.');
            
            // Create chart
            this.createInitialChart();
            
        } catch (error) {
            console.error('Data preparation error:', error);
            this.showStatus('error', `Data preparation failed: ${error.message}`);
        } finally {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<i class="fas fa-file-import"></i> Load & Prepare Data';
            setTimeout(() => {
                progress.style.display = 'none';
            }, 1000);
        }
    }

    /**
     * Show data statistics
     */
    showDataStats() {
        const stats = dataLoader.getStats();
        if (!stats) {
            this.showStatus('error', 'No data available');
            return;
        }
        
        alert(`
📊 DATA STATISTICS 📊

Total Days: ${stats.totalDays}
Price Range: $${stats.minPrice} - $${stats.maxPrice}
Last Price: $${stats.lastPrice}
Data Source: ${stats.dataSource}

${stats.meanReturn ? `
📈 Average Daily Return: ${stats.meanReturn}%
📉 Volatility: ${stats.volatility}%
` : ''}

Click "Train Model" to start training the AI.
        `);
    }

    /**
     * Train the model
     */
    async trainModel() {
        if (!this.datasets) {
            this.showStatus('error', 'No data prepared. Please load data first.');
            return;
        }
        
        const trainBtn = document.getElementById('trainBtn');
        const stopBtn = document.getElementById('stopTrainBtn');
        const predictBtn = document.getElementById('predictBtn');
        
        trainBtn.disabled = true;
        trainBtn.innerHTML = '<div class="loading"></div> Training...';
        stopBtn.disabled = false;
        predictBtn.disabled = true;
        
        const progress = document.getElementById('trainProgressContainer');
        const progressFill = document.getElementById('trainProgressFill');
        const progressText = document.getElementById('trainProgressText');
        const statusText = document.getElementById('trainStatusText');
        
        progress.style.display = 'block';
        progressFill.style.width = '5%';
        progressText.textContent = '5%';
        statusText.textContent = 'Building model...';
        
        try {
            // Build model
            gruModel.buildModel();
            
            progressFill.style.width = '10%';
            progressText.textContent = '10%';
            statusText.textContent = 'Starting training...';
            
            // Train model
            await gruModel.train(
                this.datasets.X_train,
                this.datasets.y_train,
                this.datasets.X_test,
                this.datasets.y_test,
                {
                    onEpochEnd: (epoch, logs) => {
                        const progressValue = 10 + (epoch / 100) * 90;
                        progressFill.style.width = `${progressValue}%`;
                        progressText.textContent = `${Math.round(progressValue)}%`;
                        statusText.textContent = `Epoch ${epoch + 1}/100`;
                        
                        // Update metrics
                        document.getElementById('trainLoss').textContent = logs.loss.toFixed(4);
                        document.getElementById('valLoss').textContent = logs.val_loss.toFixed(4);
                        document.getElementById('trainAcc').textContent = (1 - logs.mae).toFixed(4);
                        document.getElementById('valAcc').textContent = (1 - logs.val_mae).toFixed(4);
                    },
                    onTrainEnd: () => {
                        this.isModelTrained = true;
                        predictBtn.disabled = false;
                        trainBtn.disabled = true;
                        trainBtn.innerHTML = '<i class="fas fa-check-circle"></i> Training Complete';
                        stopBtn.disabled = true;
                        
                        this.showStatus('success', '✅ Model training completed!');
                        this.createPerformanceChart();
                    }
                }
            );
            
        } catch (error) {
            console.error('Training error:', error);
            this.showStatus('error', `Training failed: ${error.message}`);
            
            trainBtn.disabled = false;
            trainBtn.innerHTML = '<i class="fas fa-play-circle"></i> Train Model';
            stopBtn.disabled = true;
            predictBtn.disabled = true;
        } finally {
            progress.style.display = 'none';
        }
    }

    /**
     * Stop training
     */
    stopTraining() {
        gruModel.stopTraining();
        this.showStatus('info', 'Training stopped');
        
        document.getElementById('trainBtn').disabled = false;
        document.getElementById('trainBtn').innerHTML = '<i class="fas fa-play-circle"></i> Train Model';
        document.getElementById('stopTrainBtn').disabled = true;
    }

    /**
     * Make predictions
     */
    async makePredictions() {
        if (!this.isModelTrained) {
            this.showStatus('error', 'Model not trained. Please train the model first.');
            return;
        }
        
        const predictBtn = document.getElementById('predictBtn');
        predictBtn.disabled = true;
        predictBtn.innerHTML = '<div class="loading"></div> Predicting...';
        
        try {
            // Get latest window and make predictions
            const latestWindow = dataLoader.getLatestWindow();
            const normalizedPredictions = gruModel.forecast(latestWindow);
            const denormalized = dataLoader.denormalizeArray(normalizedPredictions, 'target');
            
            // Get last actual price
            const stats = dataLoader.getStats();
            const lastPrice = parseFloat(stats.lastPrice);
            
            // Update UI
            this.updatePredictionCards(denormalized, lastPrice);
            
            // Update chart
            this.updateChartWithPredictions(denormalized);
            
            predictBtn.disabled = false;
            predictBtn.innerHTML = '<i class="fas fa-crystal-ball"></i> Make Predictions';
            
            this.showStatus('success', '✅ Predictions generated for next 5 days!');
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.showStatus('error', `Prediction failed: ${error.message}`);
            
            predictBtn.disabled = false;
            predictBtn.innerHTML = '<i class="fas fa-crystal-ball"></i> Make Predictions';
        }
    }

    /**
     * Update prediction cards
     */
    updatePredictionCards(predictions, lastPrice) {
        const cards = document.querySelectorAll('.prediction-card');
        
        predictions.forEach((prediction, index) => {
            if (cards[index]) {
                const changePercent = ((prediction - lastPrice) / lastPrice * 100);
                
                cards[index].querySelector('.prediction-value').textContent = `$${prediction.toFixed(2)}`;
                
                const direction = cards[index].querySelector('.prediction-direction');
                direction.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
                direction.className = `prediction-direction ${changePercent >= 0 ? 'direction-up' : 'direction-down'}`;
                
                cards[index].querySelector('.prediction-day').textContent = `Day +${index + 1}`;
            }
        });
    }

    /**
     * Create initial chart
     */
    createInitialChart() {
        const stats = dataLoader.getStats();
        if (!stats || !dataLoader.data) return;
        
        const prices = dataLoader.data.map(row => row.Close);
        const labels = dataLoader.data.map(row => row.Date);
        
        if (this.priceChart) {
            this.priceChart.destroy();
        }
        
        const ctx = document.getElementById('priceChart').getContext('2d');
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.slice(-100),
                datasets: [{
                    label: 'S&P 500 Price',
                    data: prices.slice(-100),
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#fda4af' }
                    }
                },
                scales: {
                    x: { ticks: { color: '#fda4af' } },
                    y: { 
                        ticks: { 
                            color: '#fda4af',
                            callback: value => '$' + value.toFixed(0)
                        }
                    }
                }
            }
        });
    }

    /**
     * Update chart with predictions
     */
    updateChartWithPredictions(predictions) {
        if (!this.priceChart) return;
        
        const lastPrice = dataLoader.data[dataLoader.data.length - 1].Close;
        const predictionData = [lastPrice, ...predictions];
        const predictionLabels = ['Today', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
        
        // Add prediction dataset
        if (this.priceChart.data.datasets.length > 1) {
            this.priceChart.data.datasets[1].data = predictionData;
        } else {
            this.priceChart.data.datasets.push({
                label: '5-Day Forecast',
                data: predictionData,
                borderColor: '#48bb78',
                backgroundColor: 'rgba(72, 187, 120, 0.1)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false,
                tension: 0.1,
                pointRadius: 6
            });
        }
        
        this.priceChart.update();
    }

    /**
     * Create performance chart
     */
    createPerformanceChart() {
        const history = gruModel.trainingHistory;
        
        if (history.loss.length === 0) return;
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }
        
        const ctx = document.getElementById('performanceChart').getContext('2d');
        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.loss.map((_, i) => i + 1),
                datasets: [
                    {
                        label: 'Training Loss',
                        data: history.loss,
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'Validation Loss',
                        data: history.valLoss,
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#fda4af' }
                    }
                },
                scales: {
                    x: { ticks: { color: '#fda4af' } },
                    y: { 
                        ticks: { color: '#fda4af' },
                        type: 'logarithmic'
                    }
                }
            }
        });
    }

    /**
     * Show status message
     */
    showStatus(type, message) {
        const element = document.getElementById('dataStatus');
        element.textContent = message;
        element.className = `status-message status-${type}`;
        
        if (type === 'success') {
            setTimeout(() => element.style.display = 'none', 5000);
        }
    }

    /**
     * Update UI state
     */
    updateUI() {
        // Update button states based on current state
        document.getElementById('trainBtn').disabled = !this.isDataLoaded;
        document.getElementById('predictBtn').disabled = !this.isModelTrained;
        document.getElementById('viewDataBtn').disabled = !this.isDataLoaded;
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.priceChart) this.priceChart.destroy();
        if (this.performanceChart) this.performanceChart.destroy();
        if (this.datasets) {
            this.datasets.X_train.dispose();
            this.datasets.y_train.dispose();
            this.datasets.X_test.dispose();
            this.datasets.y_test.dispose();
        }
        gruModel.dispose();
        dataLoader.dispose();
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StockPredictorApp();
    console.log('Stock Predictor App initialized');
});
