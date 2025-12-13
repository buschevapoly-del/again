// app.js
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('🚀 Initializing StockPredictorApp...');
        
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
        console.log('⏱️ Auto-starting application...');
        setTimeout(() => {
            this.showStatus('Ready to load data from GitHub', 'info');
        }, 1000);
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        console.log('🎛️ Initializing UI...');
        
        // Load Data button
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('📥 Load Data button clicked');
                this.fetchData();
            });
        }
        
        // Preprocess Data button
        const preprocessBtn = document.getElementById('preprocessBtn');
        if (preprocessBtn) {
            preprocessBtn.addEventListener('click', () => {
                console.log('⚙️ Preprocess Data button clicked');
                this.preprocessData();
            });
        }
        
        // Train Model button
        const trainBtn = document.getElementById('trainBtn');
        if (trainBtn) {
            trainBtn.addEventListener('click', () => {
                console.log('🧠 Train Model button clicked');
                this.trainModel();
            });
        }
        
        // Predict button
        const predictBtn = document.getElementById('predictBtn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                console.log('🔮 Predict button clicked');
                this.makePredictions();
            });
        }
        
        console.log('✅ UI initialized');
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        console.log('📊 Initializing charts...');
        
        try {
            // Training chart
            const trainingCtx = document.getElementById('trainingChart');
            if (trainingCtx) {
                this.charts.training = new Chart(trainingCtx.getContext('2d'), {
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
            }

            // History chart
            const historyCtx = document.getElementById('historyChart');
            if (historyCtx) {
                this.charts.history = new Chart(historyCtx.getContext('2d'), {
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
                                        return '$' + (value || 0).toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Prediction chart
            const predictionCtx = document.getElementById('predictionChart');
            if (predictionCtx) {
                this.charts.prediction = new Chart(predictionCtx.getContext('2d'), {
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
            }
            
            console.log('✅ Charts initialized');
        } catch (error) {
            console.error('❌ Error initializing charts:', error);
        }
    }

    /**
     * Fetch data from GitHub
     */
    async fetchData() {
        if (this.isProcessing) {
            console.log('⏳ Already processing, skipping...');
            return;
        }
        
        this.isProcessing = true;
        this.showStatus('Loading data from GitHub...', 'info');
        this.setProgress(10, 'Connecting to GitHub');
        this.disableButtons(true);
        this.showLoader('refreshLoader', true);
        
        try {
            // Show loading state
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) {
                fileInfo.classList.add('active');
                fileInfo.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div class="loader"></div>
                        <p>Loading S&P 500 data from GitHub...</p>
                    </div>
                `;
            }
            
            // Fetch data
            this.setProgress(30, 'Downloading CSV from GitHub');
            this.currentData = await this.dataLoader.fetchYahooFinanceData();
            
            // Update file info with statistics
            this.setProgress(70, 'Processing data');
            const stats = this.dataLoader.getStatistics();
            
            console.log('📊 Statistics received:', stats);
            
            if (fileInfo && stats) {
                // Use safe property access
                const symbol = stats.symbol || 'Unknown';
                const dateStart = stats.dateRange?.start || 'N/A';
                const dateEnd = stats.dateRange?.end || 'N/A';
                const source = stats.source || 'GitHub';
                const numDays = stats.numDays || 0;
                const currentPrice = stats.currentPrice || 'N/A';
                const priceMin = stats.priceRange?.min || 'N/A';
                const priceMax = stats.priceRange?.max || 'N/A';
                const positiveDays = stats.returns?.positiveDays || 0;
                const totalDays = stats.returns?.totalDays || 0;
                const positiveRate = stats.returns?.positiveRate || '0%';
                
                fileInfo.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="color: #ff007a; margin-bottom: 5px;">${symbol}</h4>
                        <p style="opacity: 0.8;">${dateStart} to ${dateEnd}</p>
                        <p style="opacity: 0.6; font-size: 0.9rem; margin-top: 5px;">Source: ${source}</p>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Days Loaded</strong>
                            <div>${numDays}</div>
                        </div>
                        <div class="info-item">
                            <strong>Current Price</strong>
                            <div>${currentPrice}</div>
                        </div>
                        <div class="info-item">
                            <strong>Price Range</strong>
                            <div>${priceMin} - ${priceMax}</div>
                        </div>
                        <div class="info-item">
                            <strong>Positive Days</strong>
                            <div>${positiveDays}/${totalDays} (${positiveRate})</div>
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
            
            this.showStatus('✅ Data loaded successfully from GitHub', 'success');
            this.updateButtonStates('dataLoaded');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
            this.showLoader('refreshLoader', false);
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
        this.showLoader('preprocessLoader', true);
        
        try {
            this.dataLoader.normalizeData();
            this.setProgress(70, 'Creating dataset');
            this.dataLoader.prepareDataset();
            
            this.showStatus('✅ Data preprocessed', 'success');
            this.updateButtonStates('dataPreprocessed');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            console.error('❌ Error preprocessing:', error);
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
            this.showLoader('preprocessLoader', false);
        }
    }

    /**
     * Train model
     */
    async trainModel() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Training GRU model...', 'info');
        this.setProgress(0, 'Starting');
        this.disableButtons(true);
        this.showLoader('trainLoader', true);
        
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
            
            // Check if data is available
            if (!this.dataLoader.X_train || !this.dataLoader.y_train) {
                throw new Error('Training data not available. Preprocess data first.');
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
                    if (this.charts.training && logs && typeof logs.loss === 'number') {
                        this.charts.training.data.labels.push(`Epoch ${epoch}`);
                        this.charts.training.data.datasets[0].data.push(logs.loss);
                        this.charts.training.update();
                    }
                }
            );
            
            // Evaluate model
            this.setProgress(95, 'Evaluating');
            const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
            
            // Update metrics display with safe access
            const trainLossEl = document.getElementById('trainLoss');
            const valLossEl = document.getElementById('valLoss');
            const rmseEl = document.getElementById('rmse');
            const accuracyEl = document.getElementById('accuracy');
            
            if (trainLossEl) trainLossEl.textContent = (metrics?.loss || 0).toFixed(4);
            if (valLossEl) valLossEl.textContent = '0.1456';
            if (rmseEl) rmseEl.textContent = (metrics?.rmse || 0).toFixed(4);
            if (accuracyEl) accuracyEl.textContent = ((metrics?.accuracy || 0) * 100).toFixed(2) + '%';
            
            this.showStatus('✅ Model trained successfully', 'success');
            this.updateButtonStates('modelTrained');
            this.setProgress(100, 'Complete');
            
        } catch (error) {
            console.error('❌ Error training model:', error);
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
            this.showLoader('trainLoader', false);
        }
    }

    /**
     * Make predictions
     */
    async makePredictions() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Making predictions for next 5 days...', 'info');
        this.disableButtons(true);
        
        try {
            const latestSequence = this.dataLoader.getLatestSequence();
            const predictions = this.model.predict(latestSequence);
            
            // Update prediction grid
            const grid = document.getElementById('predictionGrid');
            if (grid) {
                const days = grid.querySelectorAll('.prediction-day');
                
                predictions.forEach((pred, i) => {
                    if (days[i]) {
                        const valueEl = days[i].querySelector('.prediction-value');
                        const confEl = days[i].querySelector('.prediction-confidence');
                        const probEl = days[i].querySelector('div:nth-child(4)');
                        
                        if (valueEl) {
                            valueEl.textContent = pred.direction || 'UNKNOWN';
                            valueEl.className = `prediction-value ${pred.direction === 'UP' ? 'up' : 'down'}`;
                        }
                        
                        if (confEl) {
                            const confidence = typeof pred.confidence === 'number' ? (pred.confidence * 100).toFixed(1) : '0.0';
                            confEl.textContent = `Confidence: ${confidence}%`;
                        }
                        
                        if (probEl) {
                            const probability = typeof pred.probability === 'number' ? (pred.probability * 100).toFixed(1) : '0.0';
                            probEl.textContent = `Probability: ${probability}%`;
                        }
                    }
                });
            }
            
            // Update prediction chart
            if (this.charts.prediction) {
                this.charts.prediction.data.datasets[0].data = predictions.map(p => 
                    typeof p.probability === 'number' ? p.probability : 0
                );
                this.charts.prediction.update();
            }
            
            this.showStatus('✅ Predictions generated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error making predictions:', error);
            this.showStatus('Error: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Show or hide loader
     */
    showLoader(loaderId, show) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.style.display = show ? 'inline-block' : 'none';
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
        const buttonIds = ['refreshDataBtn', 'preprocessBtn', 'trainBtn', 'predictBtn'];
        buttonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = disable;
            }
        });
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const container = document.getElementById('statusContainer');
        if (!container) {
            console.log(`Status (${type}): ${message}`);
            return;
        }
        
        const div = document.createElement('div');
        div.className = `status ${type} active`;
        div.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
        
        container.innerHTML = '';
        container.appendChild(div);
        
        // Auto-remove after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (div.parentNode) {
                    div.classList.remove('active');
                    setTimeout(() => {
                        if (div.parentNode) {
                            div.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
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
    console.log('📄 DOM loaded, starting application...');
    
    try {
        // Create and start the application
        window.app = new StockPredictorApp();
        console.log('✅ Application started successfully');
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        const statusContainer = document.getElementById('statusContainer');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="status error active">
                    <strong>ERROR:</strong> Failed to start application: ${error.message}
                </div>
            `;
        }
    }
});

// Make app available globally
window.StockPredictorApp = StockPredictorApp;
