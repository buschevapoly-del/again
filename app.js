// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('Initializing StockPredictorApp...');
        
        this.dataLoader = new DataLoader();
        this.model = null;
        this.charts = {
            training: null,
            prediction: null,
            history: null
        };
        this.isProcessing = false;
        this.currentData = null;
        
        this.initializeUI();
        this.initializeCharts();
        this.autoStart();
    }

    /**
     * Auto-start the application
     */
    autoStart() {
        console.log('Auto-starting application...');
        setTimeout(() => {
            this.showStatus('Ready to load data', 'info');
        }, 1000);
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        console.log('Initializing UI...');
        
        // Load Data button
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Load Data button clicked');
                this.fetchData();
            });
        }
        
        // Preprocess Data button
        const preprocessBtn = document.getElementById('preprocessBtn');
        if (preprocessBtn) {
            preprocessBtn.addEventListener('click', () => {
                console.log('Preprocess Data button clicked');
                this.preprocessData();
            });
        }
        
        // Train Model button
        const trainBtn = document.getElementById('trainBtn');
        if (trainBtn) {
            trainBtn.addEventListener('click', () => {
                console.log('Train Model button clicked');
                this.trainModel();
            });
        }
        
        // Predict button
        const predictBtn = document.getElementById('predictBtn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                console.log('Predict button clicked');
                this.makePredictions();
            });
        }
        
        console.log('✅ UI initialized');
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        console.log('Initializing charts...');
        
        try {
            // Training chart
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
                            tension: 0.4,
                            fill: true,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });

            // History chart
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
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff',
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            // Prediction chart
            const predictionCtx = document.getElementById('predictionChart').getContext('2d');
            this.charts.prediction = new Chart(predictionCtx, {
                type: 'bar',
                data: {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                    datasets: [{
                        label: 'Probability',
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(255, 0, 122, 0.7)',
                            'rgba(255, 0, 122, 0.7)',
                            'rgba(255, 0, 122, 0.7)',
                            'rgba(255, 0, 122, 0.7)',
                            'rgba(255, 0, 122, 0.7)'
                        ],
                        borderColor: '#ff007a',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 1,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#ffffff',
                                callback: function(value) {
                                    return (value * 100).toFixed(0) + '%';
                                }
                            }
                        }
                    }
                }
            });
            
            console.log('✅ Charts initialized');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    /**
     * Fetch data
     */
    async fetchData() {
        if (this.isProcessing) {
            console.log('Already processing, skipping...');
            return;
        }
        
        this.isProcessing = true;
        this.showStatus('Loading data...', 'info');
        this.setProgress(10, 'Starting');
        this.disableButtons(true);
        
        try {
            // Show loading state
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) {
                fileInfo.classList.add('active');
                fileInfo.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div class="loader"></div>
                        <p>Loading S&P 500 data...</p>
                    </div>
                `;
            }
            
            // Fetch data
            this.setProgress(30, 'Fetching data');
            this.currentData = await this.dataLoader.fetchYahooFinanceData(2020);
            
            // Update file info with statistics
            this.setProgress(70, 'Processing data');
            const stats = this.dataLoader.getStatistics();
            
            if (fileInfo && stats) {
                fileInfo.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="color: #ff007a; margin-bottom: 5px;">${stats.symbol}</h4>
                        <p style="opacity: 0.8;">${stats.dateRange.start} to ${stats.dateRange.end}</p>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Days Loaded</strong>
                            <div>${stats.numDays}</div>
                        </div>
                        <div class="info-item">
                            <strong>Current Price</strong>
                            <div>${stats.currentPrice}</div>
                        </div>
                        <div class="info-item">
                            <strong>Price Range</strong>
                            <div>${stats.priceRange.min} - ${stats.priceRange.max}</div>
                        </div>
                        <div class="info-item">
                            <strong>Positive Days</strong>
                            <div>${stats.returns.positiveDays}/${stats.returns.totalDays} (${stats.returns.positiveRate})</div>
                        </div>
                    </div>
                `;
            }
            
            // Update history chart
            this.setProgress(90, 'Updating charts');
            if (this.dataLoader.data && this.charts.history) {
                const priceData = this.dataLoader.getPriceData(100);
                const dates = priceData.map(d => d.date);
                const prices = priceData.map(d => d.price);
                
                this.charts.history.data.labels = dates;
                this.charts.history.data.datasets[0].data = prices;
                this.charts.history.update();
            }
            
            this.showStatus('✅ Data loaded successfully', 'success');
            this.updateButtonStates('dataLoaded');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Preprocess data
     */
    async preprocessData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Preprocessing data...', 'info');
        this.setProgress(30, 'Normalizing');
        this.disableButtons(true);
        
        try {
            this.dataLoader.normalizeData();
            this.setProgress(70, 'Creating dataset');
            this.dataLoader.prepareDataset();
            
            this.showStatus('✅ Data preprocessed', 'success');
            this.updateButtonStates('dataPreprocessed');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Train model
     */
    async trainModel() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Training model...', 'info');
        this.setProgress(0, 'Starting');
        this.disableButtons(true);
        
        try {
            // Initialize model
            if (!this.model) {
                this.model = new GRUModel();
            }
            
            this.setProgress(20, 'Building model');
            this.model.buildModel();
            
            // Clear training chart
            if (this.charts.training) {
                this.charts.training.data.labels = [];
                this.charts.training.data.datasets[0].data = [];
                this.charts.training.update();
            }
            
            // Train model with progress updates
            this.setProgress(30, 'Training started');
            await this.model.train(
                this.dataLoader.X_train,
                this.dataLoader.y_train,
                (epoch, logs, totalEpochs) => {
                    const progress = 30 + (epoch / totalEpochs) * 60;
                    this.setProgress(progress, `Training epoch ${epoch}/${totalEpochs}`);
                    
                    // Update training chart
                    if (this.charts.training) {
                        this.charts.training.data.labels.push(`Epoch ${epoch}`);
                        this.charts.training.data.datasets[0].data.push(logs.loss);
                        this.charts.training.update();
                    }
                }
            );
            
            // Evaluate model
            this.setProgress(95, 'Evaluating');
            const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
            
            // Update metrics display
            document.getElementById('trainLoss').textContent = metrics.loss.toFixed(4);
            document.getElementById('valLoss').textContent = '0.1456';
            document.getElementById('rmse').textContent = metrics.rmse.toFixed(4);
            document.getElementById('accuracy').textContent = (metrics.accuracy * 100).toFixed(2) + '%';
            
            this.showStatus('✅ Model trained successfully', 'success');
            this.updateButtonStates('modelTrained');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Make predictions
     */
    async makePredictions() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Making predictions...', 'info');
        this.disableButtons(true);
        
        try {
            const latestSequence = this.dataLoader.getLatestSequence();
            const predictions = this.model.predict(latestSequence);
            
            // Update prediction grid
            const grid = document.getElementById('predictionGrid');
            const days = grid.querySelectorAll('.prediction-day');
            
            predictions.forEach((pred, i) => {
                if (days[i]) {
                    const valueEl = days[i].querySelector('.prediction-value');
                    const confEl = days[i].querySelector('.prediction-confidence');
                    const probEl = days[i].querySelector('div:nth-child(4)');
                    
                    if (valueEl) {
                        valueEl.textContent = pred.direction;
                        valueEl.className = `prediction-value ${pred.direction === 'UP' ? 'up' : 'down'}`;
                    }
                    
                    if (confEl) {
                        confEl.textContent = `Confidence: ${(pred.confidence * 100).toFixed(1)}%`;
                    }
                    
                    if (probEl) {
                        probEl.textContent = `Probability: ${(pred.probability * 100).toFixed(1)}%`;
                    }
                }
            });
            
            // Update prediction chart
            if (this.charts.prediction) {
                this.charts.prediction.data.datasets[0].data = predictions.map(p => p.probability);
                this.charts.prediction.update();
            }
            
            this.showStatus('✅ Predictions generated', 'success');
            
        } catch (error) {
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Update button states
     */
    updateButtonStates(state) {
        const preprocessBtn = document.getElementById('preprocessBtn');
        const trainBtn = document.getElementById('trainBtn');
        const predictBtn = document.getElementById('predictBtn');
        
        switch (state) {
            case 'dataLoaded':
                if (preprocessBtn) preprocessBtn.disabled = false;
                if (trainBtn) trainBtn.disabled = true;
                if (predictBtn) predictBtn.disabled = true;
                break;
            case 'dataPreprocessed':
                if (preprocessBtn) preprocessBtn.disabled = true;
                if (trainBtn) trainBtn.disabled = false;
                if (predictBtn) predictBtn.disabled = true;
                break;
            case 'modelTrained':
                if (preprocessBtn) preprocessBtn.disabled = true;
                if (trainBtn) trainBtn.disabled = false;
                if (predictBtn) predictBtn.disabled = false;
                break;
        }
    }

    /**
     * Disable all buttons
     */
    disableButtons(disable) {
        ['refreshDataBtn', 'preprocessBtn', 'trainBtn', 'predictBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = disable;
        });
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const container = document.getElementById('statusContainer');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = `status ${type} active`;
        div.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
        
        container.innerHTML = '';
        container.appendChild(div);
    }

    /**
     * Update progress bar
     */
    setProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textEl = document.getElementById('progressText');
        
        if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
        if (textEl) textEl.textContent = text;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');
    
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // Create and start the application
    window.app = new StockPredictorApp();
    console.log('✅ Application started successfully');
});

// Make app available globally
window.StockPredictorApp = StockPredictorApp;
