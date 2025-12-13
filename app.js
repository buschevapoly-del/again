// app.js
/**
 * Main Application Module - FIXED VERSION
 * All buttons now work correctly
 */

import { dataLoader } from './data-loader.js';
import { gruModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        this.isDataLoaded = false;
        this.isModelTrained = false;
        this.currentFile = null;
        this.priceChart = null;
        this.performanceChart = null;
        this.datasets = null;
        
        this.initEventListeners();
        this.updateUI();
        
        console.log('Stock Predictor App initialized');
    }

    /**
     * Initialize event listeners - FIXED VERSION
     */
    initEventListeners() {
        console.log('Initializing event listeners...');
        
        // Demo Data Button - FIXED
        const demoBtn = document.getElementById('useDemoDataBtn');
        if (demoBtn) {
            console.log('Found demo button');
            demoBtn.addEventListener('click', () => {
                console.log('Demo button clicked');
                this.useDemoData();
            });
        } else {
            console.error('Demo button not found!');
        }

        // Yahoo Finance Button - FIXED
        const yahooBtn = document.getElementById('fetchYahooBtn');
        if (yahooBtn) {
            console.log('Found Yahoo button');
            yahooBtn.addEventListener('click', () => {
                console.log('Yahoo button clicked');
                this.showYahooControls();
            });
        }

        // Quick Start Button - FIXED
        const quickStartBtn = document.getElementById('quickStartBtn');
        if (quickStartBtn) {
            console.log('Found quick start button');
            quickStartBtn.addEventListener('click', async () => {
                console.log('Quick start button clicked');
                await this.quickStart();
            });
        }

        // Fetch Yahoo Data Button - FIXED
        const fetchDataBtn = document.getElementById('fetchDataBtn');
        if (fetchDataBtn) {
            console.log('Found fetch data button');
            fetchDataBtn.addEventListener('click', async () => {
                console.log('Fetch data button clicked');
                await this.fetchYahooData();
            });
        }

        // File upload - FIXED
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        
        if (dropArea && fileInput) {
            console.log('Found file upload elements');
            dropArea.addEventListener('click', () => {
                console.log('File area clicked');
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                console.log('File selected');
                this.onFileSelected(e);
            });
        }

        // Training buttons - FIXED
        const buttons = [
            { id: 'loadDataBtn', handler: () => this.loadAndPrepareData() },
            { id: 'viewDataBtn', handler: () => this.showDataStats() },
            { id: 'trainBtn', handler: () => this.trainModel() },
            { id: 'stopTrainBtn', handler: () => this.stopTraining() },
            { id: 'predictBtn', handler: () => this.makePredictions() }
        ];
        
        buttons.forEach(({ id, handler }) => {
            const btn = document.getElementById(id);
            if (btn) {
                console.log(`Found button: ${id}`);
                btn.addEventListener('click', handler);
            } else {
                console.error(`Button not found: ${id}`);
            }
        });
        
        console.log('All event listeners initialized');
    }

    /**
     * Quick start with demo data - FIXED
     */
    async quickStart() {
        console.log('=== QUICK START ===');
        const quickStartBtn = document.getElementById('quickStartBtn');
        
        try {
            // Update button state
            quickStartBtn.disabled = true;
            quickStartBtn.innerHTML = '<div class="loading"></div> Starting...';
            
            this.showStatus('info', 'Generating demo data...');
            
            // Generate demo data
            await dataLoader.generateDemoData(500);
            
            // Prepare data
            this.showStatus('info', 'Preparing data for training...');
            this.datasets = dataLoader.preprocessData();
            
            // Build and train model
            this.showStatus('info', 'Building and training model...');
            
            // Build model
            gruModel.buildModel();
            
            // Enable training button
            this.isDataLoaded = true;
            document.getElementById('trainBtn').disabled = false;
            
            // Create chart
            this.createInitialChart();
            
            this.showStatus('success', '✅ Quick start complete! Click "Train Model" to begin training.');
            
            // Show stats
            setTimeout(() => this.showDataStats(), 1000);
            
        } catch (error) {
            console.error('Quick start error:', error);
            this.showStatus('error', `Quick start failed: ${error.message}`);
        } finally {
            quickStartBtn.disabled = false;
            quickStartBtn.innerHTML = '<i class="fas fa-rocket"></i> Quick Start with Demo Data';
        }
    }

    /**
     * Use demo data - FIXED
     */
    async useDemoData() {
        console.log('=== USE DEMO DATA ===');
        
        try {
            this.showStatus('info', 'Generating demo data...');
            
            // Hide other sections
            this.showYahooControls(false);
            this.showFileUploadSection(true);
            
            // Generate data
            await dataLoader.generateDemoData(1000);
            
            // Show success
            this.showStatus('success', '✅ Demo data generated!');
            
            // Show file upload section with loaded data
            const dropArea = document.getElementById('dropArea');
            dropArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: #48bb78;"></i>
                <h3>Demo Data Ready</h3>
                <p><strong>1,000 days of S&P 500 data</strong></p>
                <p>Click "Load & Prepare Data" to continue</p>
            `;
            
            // Enable load button
            document.getElementById('loadDataBtn').disabled = false;
            
        } catch (error) {
            console.error('Demo data error:', error);
            this.showStatus('error', `Failed to generate demo data: ${error.message}`);
        }
    }

    /**
     * Show Yahoo Finance controls - FIXED
     */
    showYahooControls(show = true) {
        console.log('Showing Yahoo controls:', show);
        const yahooSection = document.getElementById('yfinanceControls');
        const fileSection = document.getElementById('fileUploadSection');
        
        if (yahooSection) {
            yahooSection.style.display = show ? 'block' : 'none';
        }
        
        if (fileSection) {
            fileSection.style.display = !show ? 'block' : 'none';
        }
        
        if (show) {
            this.showStatus('info', 'Select ticker and click "Fetch Data"');
        }
    }

    /**
     * Fetch data from Yahoo Finance - FIXED
     */
    async fetchYahooData() {
        console.log('=== FETCH YAHOO DATA ===');
        
        const fetchBtn = document.getElementById('fetchDataBtn');
        if (!fetchBtn) {
            console.error('Fetch button not found');
            return;
        }
        
        const ticker = document.getElementById('tickerSelect')?.value || '^GSPC';
        const period = document.getElementById('periodSelect')?.value || '1y';
        const interval = document.getElementById('intervalSelect')?.value || '1d';
        
        console.log(`Fetching: ${ticker}, ${period}, ${interval}`);
        
        try {
            // Update button state
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<div class="loading"></div> Fetching...';
            
            this.showStatus('info', `Fetching ${ticker} data from Yahoo Finance...`);
            
            // Fetch data
            await dataLoader.fetchYahooFinanceData(ticker, period, interval);
            
            // Update UI
            const dropArea = document.getElementById('dropArea');
            if (dropArea) {
                dropArea.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #48bb78;"></i>
                    <h3>Data Fetched</h3>
                    <p><strong>${ticker} - ${period}</strong></p>
                    <p>Click "Load & Prepare Data" to continue</p>
                `;
            }
            
            // Enable load button
            document.getElementById('loadDataBtn').disabled = false;
            
            this.showStatus('success', `✅ ${ticker} data fetched successfully!`);
            
        } catch (error) {
            console.error('Yahoo fetch error:', error);
            this.showStatus('error', `Failed to fetch data: ${error.message}`);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<i class="fas fa-download"></i> Fetch Data';
        }
    }

    /**
     * Handle file selection - FIXED
     */
    onFileSelected(e) {
        console.log('=== FILE SELECTED ===');
        const file = e.target.files[0];
        
        if (file) {
            console.log('File selected:', file.name, file.size, 'bytes');
            this.currentFile = file;
            
            // Update UI
            const dropArea = document.getElementById('dropArea');
            if (dropArea) {
                dropArea.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #48bb78;"></i>
                    <h3>File Selected</h3>
                    <p><strong>${file.name}</strong></p>
                    <p>${Math.round(file.size / 1024)} KB</p>
                    <p>Click "Load & Prepare Data" to continue</p>
                `;
            }
            
            // Enable load button
            const loadBtn = document.getElementById('loadDataBtn');
            if (loadBtn) {
                loadBtn.disabled = false;
            }
            
            this.showStatus('info', `File selected: ${file.name}`);
        }
    }

    /**
     * Show/hide file upload section
     */
    showFileUploadSection(show) {
        const section = document.getElementById('fileUploadSection');
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Load and prepare data - FIXED
     */
    async loadAndPrepareData() {
        console.log('=== LOAD AND PREPARE DATA ===');
        
        const loadBtn = document.getElementById('loadDataBtn');
        if (!loadBtn) {
            console.error('Load button not found');
            return;
        }
        
        try {
            // Update button state
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<div class="loading"></div> Processing...';
            
            // Show progress
            const progress = document.getElementById('dataProgressContainer');
            const progressFill = document.getElementById('dataProgressFill');
            const progressText = document.getElementById('dataProgressText');
            const statusText = document.getElementById('dataStatusText');
            
            if (progress) progress.style.display = 'block';
            if (progressFill) progressFill.style.width = '10%';
            if (progressText) progressText.textContent = '10%';
            if (statusText) statusText.textContent = 'Starting...';
            
            this.showStatus('info', 'Preparing data...');
            
            // Load data if file was selected
            if (this.currentFile) {
                await dataLoader.loadCSV(this.currentFile);
            }
            
            // Preprocess data
            if (progressFill) progressFill.style.width = '30%';
            if (progressText) progressText.textContent = '30%';
            if (statusText) statusText.textContent = 'Preprocessing...';
            
            this.datasets = dataLoader.preprocessData();
            
            // Update progress
            if (progressFill) progressFill.style.width = '70%';
            if (progressText) progressText.textContent = '70%';
            if (statusText) statusText.textContent = 'Creating datasets...';
            
            // Enable training
            this.isDataLoaded = true;
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('viewDataBtn').disabled = false;
            
            // Complete progress
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            if (statusText) statusText.textContent = 'Complete!';
            
            this.showStatus('success', '✅ Data prepared successfully! Ready for training.');
            
            // Create chart
            this.createInitialChart();
            
            // Show stats
            setTimeout(() => this.showDataStats(), 500);
            
        } catch (error) {
            console.error('Data preparation error:', error);
            this.showStatus('error', `Data preparation failed: ${error.message}`);
        } finally {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<i class="fas fa-file-import"></i> Load & Prepare Data';
            
            // Hide progress
            setTimeout(() => {
                const progress = document.getElementById('dataProgressContainer');
                if (progress) progress.style.display = 'none';
            }, 1000);
        }
    }

    /**
     * Show data statistics - FIXED
     */
    showDataStats() {
        console.log('=== SHOW DATA STATS ===');
        const stats = dataLoader.getStats();
        
        if (!stats) {
            this.showStatus('error', 'No data available');
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
                border-radius: 16px;
                padding: 30px;
                border: 2px solid #f43f5e;
                max-width: 500px;
                width: 100%;
                color: white;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #f43f5e; margin: 0;">
                        <i class="fas fa-chart-bar"></i> Data Statistics
                    </h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: #fda4af; font-size: 1.5rem; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                        <div style="color: #fda4af; font-size: 0.9rem;">Total Days</div>
                        <div style="color: white; font-size: 2rem; font-weight: bold;">${stats.totalDays}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
                            <div style="color: #fda4af; font-size: 0.9rem;">Min Price</div>
                            <div style="color: white; font-size: 1.5rem; font-weight: bold;">$${stats.minPrice}</div>
                        </div>
                        
                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
                            <div style="color: #fda4af; font-size: 0.9rem;">Max Price</div>
                            <div style="color: white; font-size: 1.5rem; font-weight: bold;">$${stats.maxPrice}</div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                        <div style="color: #fda4af; font-size: 0.9rem;">Last Price</div>
                        <div style="color: white; font-size: 2rem; font-weight: bold;">$${stats.lastPrice}</div>
                    </div>
                    
                    ${stats.meanReturn ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
                            <div style="color: #fda4af; font-size: 0.9rem;">Avg Return</div>
                            <div style="color: white; font-size: 1.5rem; font-weight: bold;">${stats.meanReturn}%</div>
                        </div>
                        
                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
                            <div style="color: #fda4af; font-size: 0.9rem;">Volatility</div>
                            <div style="color: white; font-size: 1.5rem; font-weight: bold;">${stats.volatility}%</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="text-align: center;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: #f43f5e; color: white; border: none; padding: 12px 30px; 
                                   border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: bold;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Train the model - FIXED
     */
    async trainModel() {
        console.log('=== TRAIN MODEL ===');
        
        if (!this.datasets) {
            this.showStatus('error', 'No data prepared. Please load data first.');
            return;
        }
        
        const trainBtn = document.getElementById('trainBtn');
        const stopBtn = document.getElementById('stopTrainBtn');
        const predictBtn = document.getElementById('predictBtn');
        
        if (!trainBtn || !stopBtn || !predictBtn) {
            console.error('Training buttons not found');
            return;
        }
        
        try {
            // Update button states
            trainBtn.disabled = true;
            trainBtn.innerHTML = '<div class="loading"></div> Training...';
            stopBtn.disabled = false;
            predictBtn.disabled = true;
            
            // Show progress
            const progress = document.getElementById('trainProgressContainer');
            const progressFill = document.getElementById('trainProgressFill');
            const progressText = document.getElementById('trainProgressText');
            const statusText = document.getElementById('trainStatusText');
            
            if (progress) progress.style.display = 'block';
            if (progressFill) progressFill.style.width = '5%';
            if (progressText) progressText.textContent = '5%';
            if (statusText) statusText.textContent = 'Building model...';
            
            // Build model
            gruModel.buildModel();
            
            if (progressFill) progressFill.style.width = '10%';
            if (progressText) progressText.textContent = '10%';
            if (statusText) statusText.textContent = 'Starting training...';
            
            // Train model
            await gruModel.train(
                this.datasets.X_train,
                this.datasets.y_train,
                this.datasets.X_test,
                this.datasets.y_test,
                {
                    onEpochEnd: (epoch, logs) => {
                        const progressValue = 10 + (epoch / 100) * 90;
                        if (progressFill) progressFill.style.width = `${progressValue}%`;
                        if (progressText) progressText.textContent = `${Math.round(progressValue)}%`;
                        if (statusText) statusText.textContent = `Epoch ${epoch + 1}/100`;
                        
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
            // Hide progress
            setTimeout(() => {
                const progress = document.getElementById('trainProgressContainer');
                if (progress) progress.style.display = 'none';
            }, 1000);
        }
    }

    /**
     * Stop training
     */
    stopTraining() {
        console.log('=== STOP TRAINING ===');
        gruModel.stopTraining();
        this.showStatus('info', 'Training stopped');
        
        document.getElementById('trainBtn').disabled = false;
        document.getElementById('trainBtn').innerHTML = '<i class="fas fa-play-circle"></i> Train Model';
        document.getElementById('stopTrainBtn').disabled = true;
    }

    /**
     * Make predictions - FIXED
     */
    async makePredictions() {
        console.log('=== MAKE PREDICTIONS ===');
        
        if (!this.isModelTrained) {
            this.showStatus('error', 'Model not trained. Please train the model first.');
            return;
        }
        
        const predictBtn = document.getElementById('predictBtn');
        if (!predictBtn) {
            console.error('Predict button not found');
            return;
        }
        
        try {
            predictBtn.disabled = true;
            predictBtn.innerHTML = '<div class="loading"></div> Predicting...';
            
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
        const labels = dataLoader.data.map((row, i) => `Day ${i + 1}`);
        
        // Destroy existing chart
        if (this.priceChart) {
            this.priceChart.destroy();
        }
        
        const ctx = document.getElementById('priceChart');
        if (!ctx) {
            console.error('Price chart canvas not found');
            return;
        }
        
        this.priceChart = new Chart(ctx.getContext('2d'), {
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
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fda4af' }
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            color: '#fda4af',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(253, 164, 175, 0.1)'
                        }
                    },
                    y: { 
                        ticks: { 
                            color: '#fda4af',
                            callback: value => '$' + value.toFixed(0)
                        },
                        grid: {
                            color: 'rgba(253, 164, 175, 0.1)'
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
        
        const stats = dataLoader.getStats();
        if (!stats) return;
        
        const lastPrice = parseFloat(stats.lastPrice);
        const predictionData = [lastPrice, ...predictions];
        
        // Add or update prediction dataset
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
        
        const ctx = document.getElementById('performanceChart');
        if (!ctx) {
            console.error('Performance chart canvas not found');
            return;
        }
        
        // Destroy existing chart
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }
        
        this.performanceChart = new Chart(ctx.getContext('2d'), {
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
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Validation Loss',
                        data: history.valLoss,
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fda4af' }
                    }
                },
                scales: {
                    x: { 
                        title: {
                            display: true,
                            text: 'Epoch',
                            color: '#fda4af'
                        },
                        ticks: { color: '#fda4af' },
                        grid: {
                            color: 'rgba(253, 164, 175, 0.1)'
                        }
                    },
                    y: { 
                        title: {
                            display: true,
                            text: 'Loss (MSE)',
                            color: '#fda4af'
                        },
                        ticks: { color: '#fda4af' },
                        grid: {
                            color: 'rgba(253, 164, 175, 0.1)'
                        }
                    }
                }
            }
        });
    }

    /**
     * Show status message
     */
    showStatus(type, message) {
        console.log(`Status [${type}]: ${message}`);
        const element = document.getElementById('dataStatus');
        
        if (element) {
            element.textContent = message;
            element.className = `status-message status-${type}`;
            
            if (type === 'success') {
                setTimeout(() => {
                    element.style.display = 'none';
                }, 5000);
            }
        } else {
            console.error('Status element not found');
        }
    }

    /**
     * Update UI state
     */
    updateUI() {
        // Update button states based on current state
        const trainBtn = document.getElementById('trainBtn');
        const predictBtn = document.getElementById('predictBtn');
        const viewBtn = document.getElementById('viewDataBtn');
        
        if (trainBtn) trainBtn.disabled = !this.isDataLoaded;
        if (predictBtn) predictBtn.disabled = !this.isModelTrained;
        if (viewBtn) viewBtn.disabled = !this.isDataLoaded;
    }
}

// Initialize app - FIXED
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new StockPredictorApp();
});
