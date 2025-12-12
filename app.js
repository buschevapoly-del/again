// app.js - ВЕРСИЯ ДЛЯ ОТДЕЛЬНОГО ФАЙЛА
/**
 * Main Application Module
 * Handles UI interactions, visualization, and orchestrates data/model flow
 */
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.model = null;
        this.charts = {
            training: null,
            prediction: null,
            history: null
        };
        this.isProcessing = false;
        this.currentData = null;
        this.trainingHistory = [];
        
        this.initializeUI();
        this.initializeCharts();
        this.autoStart();
    }

    /**
     * Auto-start data fetching
     */
    async autoStart() {
        // Start fetching data automatically after a short delay
        setTimeout(() => {
            this.showStatus('Auto-fetching S&P 500 data...', 'info');
            this.fetchData();
        }, 1000);
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        // Refresh data button
        document.getElementById('refreshDataBtn').addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Fetch button clicked');
            this.fetchData();
        });

        // Preprocess button
        document.getElementById('preprocessBtn').addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Preprocess button clicked');
            this.preprocessData();
        });

        // Train button
        document.getElementById('trainBtn').addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Train button clicked');
            this.trainModel();
        });

        // Predict button
        document.getElementById('predictBtn').addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Predict button clicked');
            this.makePredictions();
        });
    }

    /**
     * Initialize Chart.js charts
     */
    initializeCharts() {
        console.log('Initializing charts...');
        
        try {
            // Training chart
            const trainingCtx = document.getElementById('trainingChart');
            if (!trainingCtx) {
                console.error('Training chart canvas not found');
                return;
            }
            
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
                        },
                        {
                            label: 'Validation Loss',
                            data: [],
                            borderColor: '#00ff88',
                            backgroundColor: 'rgba(0, 255, 136, 0.1)',
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
                                color: '#ffffff',
                                font: {
                                    size: 12
                                }
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

            // Prediction chart
            const predictionCtx = document.getElementById('predictionChart');
            if (predictionCtx) {
                this.charts.prediction = new Chart(predictionCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                        datasets: [
                            {
                                label: 'Probability of Positive Return',
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
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#ffffff',
                                    font: {
                                        size: 12
                                    }
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
                                        return '$' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    /**
     * Check for previously saved model
     */
    async checkForSavedModel() {
        if (!this.model) {
            this.model = new GRUModel();
        }
        
        try {
            const hasSavedModel = await this.model.loadModel();
            if (hasSavedModel) {
                this.showStatus('Loaded previously trained model from browser storage', 'success');
                this.updateButtonStates('modelLoaded');
            }
        } catch (error) {
            console.log('No saved model found:', error.message);
        }
    }

    /**
     * Fetch S&P 500 data from Yahoo Finance
     */
    async fetchData() {
        if (this.isProcessing) {
            console.log('Already processing, skipping...');
            return;
        }
        
        this.isProcessing = true;
        console.log('Starting data fetch...');
        this.showStatus('Fetching S&P 500 data from Yahoo Finance...', 'info');
        this.setProgress(10, 'Connecting to data source');
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
                        <p>Loading S&P 500 data...</p>
                    </div>
                `;
            }

            // Fetch data
            this.currentData = await this.dataLoader.fetchYahooFinanceData(5);
            console.log('Data fetched successfully:', this.currentData);
            
            // Display data info
            const stats = this.dataLoader.getStatistics();
            if (stats && fileInfo) {
                fileInfo.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="color: #ff007a; margin-bottom: 5px;">${stats.symbol}</h4>
                        <p style="opacity: 0.8;">${stats.dateRange.start} to ${stats.dateRange.end}</p>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Days Loaded</strong>
                            <div>${stats.numDays.toLocaleString()}</div>
                        </div>
                        <div class="info-item">
                            <strong>Current Price</strong>
                            <div>$${stats.priceRange.current.toFixed(2)}</div>
                        </div>
                        <div class="info-item">
                            <strong>Price Range</strong>
                            <div>$${stats.priceRange.min.toFixed(0)} - $${stats.priceRange.max.toFixed(0)}</div>
                        </div>
                        <div class="info-item">
                            <strong>Avg Daily Return</strong>
                            <div>${(stats.returns.average * 100).toFixed(2)}%</div>
                        </div>
                        <div class="info-item">
                            <strong>Volatility</strong>
                            <div>${(stats.returns.volatility * 100).toFixed(2)}%</div>
                        </div>
                        <div class="info-item">
                            <strong>Positive Days</strong>
                            <div>${stats.returns.positiveDays} / ${stats.returns.totalDays}</div>
                        </div>
                    </div>
                `;
            }
            
            this.showStatus(`Successfully loaded ${stats?.numDays || 0} days of S&P 500 data`, 'success');
            this.updateButtonStates('dataLoaded');
            
            // Update history chart
            this.updateHistoryChart();
            
            // Check for saved model
            await this.checkForSavedModel();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.setProgress(100, 'Data loaded');
            this.disableButtons(false);
            this.showLoader('refreshLoader', false);
        }
    }

    /**
     * Update historical price chart
     */
    updateHistoryChart() {
        if (!this.dataLoader.data || !this.charts.history) {
            console.log('No data or chart for history update');
            return;
        }
        
        const { dates, prices } = this.dataLoader.data;
        console.log(`Updating history chart with ${dates.length} data points`);
        
        // Sample every 30 days for better performance
        const sampleStep = Math.max(1, Math.ceil(dates.length / 50));
        const sampledDates = [];
        const sampledPrices = [];
        
        for (let i = 0; i < dates.length; i += sampleStep) {
            sampledDates.push(dates[i]);
            sampledPrices.push(prices[i]);
        }
        
        // Add the last data point
        if (dates.length > 0 && sampledDates[sampledDates.length - 1] !== dates[dates.length - 1]) {
            sampledDates.push(dates[dates.length - 1]);
            sampledPrices.push(prices[prices.length - 1]);
        }
        
        // Update chart
        this.charts.history.data.labels = sampledDates;
        this.charts.history.data.datasets[0].data = sampledPrices;
        this.charts.history.update();
        
        console.log('History chart updated');
    }

    /**
     * Preprocess data for training
     */
    async preprocessData() {
        if (!this.dataLoader.data) {
            this.showStatus('Please load data first', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showStatus('Preprocessing data...', 'info');
        this.setProgress(30, 'Normalizing data');
        this.disableButtons(true);
        this.showLoader('preprocessLoader', true);
        
        try {
            // Normalize data
            this.dataLoader.normalizeData();
            this.setProgress(60, 'Creating sequences');
            
            // Prepare dataset
            this.dataLoader.prepareDataset(60, 5, 0.8);
            this.setProgress(100, 'Data preprocessed');
            
            this.showStatus('Data preprocessed successfully. Ready for training.', 'success');
            this.updateButtonStates('dataPreprocessed');
            
            // Display dataset info
            const stats = this.dataLoader.getStatistics();
            if (stats) {
                this.showStatus(`Dataset created: ${stats.trainSamples} training samples, ${stats.testSamples} test samples`, 'info');
            }
            
        } catch (error) {
            console.error('Error preprocessing data:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
            this.showLoader('preprocessLoader', false);
        }
    }

    /**
     * Train the GRU model
     */
    async trainModel() {
        if (!this.dataLoader.X_train || !this.dataLoader.y_train) {
            this.showStatus('Please preprocess data first', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showStatus('Training GRU model...', 'info');
        this.setProgress(0, 'Initializing model');
        this.disableButtons(true);
        this.showLoader('trainLoader', true);
        
        try {
            // Initialize model if needed
            if (!this.model) {
                this.model = new GRUModel(60, 1, 5);
            }
            
            // Build model
            this.setProgress(10, 'Building model');
            this.model.buildModel();
            
            // Train model
            this.setProgress(20, 'Starting training');
            
            const trainingHistory = await this.model.train(
                this.dataLoader.X_train,
                this.dataLoader.y_train,
                (epoch, logs, totalEpochs) => {
                    const progress = 20 + (epoch / totalEpochs) * 70;
                    this.setProgress(progress, `Training epoch ${epoch}/${totalEpochs}`);
                    
                    // Update training chart
                    if (this.charts.training) {
                        this.charts.training.data.labels.push(epoch);
                        this.charts.training.data.datasets[0].data.push(logs.loss);
                        this.charts.training.data.datasets[1].data.push(logs.val_loss || 0);
                        
                        if (epoch % 5 === 0) {
                            this.charts.training.update('none');
                        }
                    }
                }
            );
            
            this.setProgress(95, 'Evaluating model');
            
            // Evaluate model
            const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
            
            // Update metrics display
            document.getElementById('trainLoss').textContent = trainingHistory.history.loss[trainingHistory.history.loss.length - 1].toFixed(4);
            document.getElementById('valLoss').textContent = trainingHistory.history.val_loss[trainingHistory.history.val_loss.length - 1].toFixed(4);
            document.getElementById('rmse').textContent = metrics.rmse.toFixed(4);
            document.getElementById('accuracy').textContent = (metrics.accuracy * 100).toFixed(2) + '%';
            
            // Final chart update
            if (this.charts.training) {
                this.charts.training.update();
            }
            
            this.setProgress(100, 'Training complete');
            this.showStatus(`Model trained successfully! Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`, 'success');
            this.updateButtonStates('modelTrained');
            
            // Save model
            await this.model.saveModel();
            
        } catch (error) {
            console.error('Error training model:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
            this.showLoader('trainLoader', false);
        }
    }

    /**
     * Make predictions for next 5 days
     */
    async makePredictions() {
        if (!this.model || !this.model.isTrained) {
            this.showStatus('Please train the model first', 'error');
            return;
        }
        
        if (!this.dataLoader.normalizedData) {
            this.showStatus('Please preprocess data first', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showStatus('Making predictions...', 'info');
        this.setProgress(0, 'Preparing input');
        this.disableButtons(true);
        
        try {
            // Get latest sequence for prediction
            const latestSequence = this.dataLoader.getLatestSequence(60);
            this.setProgress(30, 'Running model');
            
            // Make prediction
            const predictions = this.model.predict(latestSequence);
            
            // Clean up
            latestSequence.dispose();
            
            this.setProgress(80, 'Updating display');
            
            // Update prediction grid
            const predictionGrid = document.getElementById('predictionGrid');
            if (predictionGrid) {
                const dayElements = predictionGrid.querySelectorAll('.prediction-day');
                
                predictions.forEach((pred, index) => {
                    if (dayElements[index]) {
                        const valueElement = dayElements[index].querySelector('.prediction-value');
                        const confidenceElement = dayElements[index].querySelector('.prediction-confidence');
                        const directionElement = dayElements[index].querySelector('div:nth-child(4)');
                        
                        if (valueElement) {
                            valueElement.textContent = pred.prediction === 1 ? '↑ UP' : '↓ DOWN';
                            valueElement.className = `prediction-value ${pred.prediction === 1 ? 'up' : 'down'}`;
                        }
                        
                        if (confidenceElement) {
                            confidenceElement.textContent = `Confidence: ${(pred.confidence * 100).toFixed(1)}%`;
                        }
                        
                        if (directionElement) {
                            directionElement.textContent = `Probability: ${(pred.probability * 100).toFixed(1)}%`;
                        }
                        
                        // Add visual feedback
                        dayElements[index].style.borderColor = pred.prediction === 1 ? 
                            'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)';
                    }
                });
            }
            
            // Update prediction chart
            if (this.charts.prediction) {
                this.charts.prediction.data.datasets[0].data = predictions.map(p => p.probability);
                this.charts.prediction.update();
            }
            
            this.setProgress(100, 'Predictions ready');
            this.showStatus('Predictions generated successfully!', 'success');
            
            // Display summary
            const upDays = predictions.filter(p => p.prediction === 1).length;
            const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
            
            this.showStatus(
                `Summary: ${upDays}/5 days predicted UP | Average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
                'info'
            );
            
        } catch (error) {
            console.error('Error making predictions:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.disableButtons(false);
        }
    }

    /**
     * Show or hide loader
     * @param {string} loaderId - Loader element ID
     * @param {boolean} show - Whether to show or hide
     */
    showLoader(loaderId, show) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.style.display = show ? 'inline-block' : 'none';
        }
    }

    /**
     * Update button states based on app state
     * @param {string} state - Current state
     */
    updateButtonStates(state) {
        const preprocessBtn = document.getElementById('preprocessBtn');
        const trainBtn = document.getElementById('trainBtn');
        const predictBtn = document.getElementById('predictBtn');
        
        switch (state) {
            case 'dataLoaded':
                preprocessBtn.disabled = false;
                trainBtn.disabled = true;
                predictBtn.disabled = true;
                break;
                
            case 'dataPreprocessed':
                preprocessBtn.disabled = true;
                trainBtn.disabled = false;
                predictBtn.disabled = true;
                break;
                
            case 'modelLoaded':
            case 'modelTrained':
                preprocessBtn.disabled = true;
                trainBtn.disabled = false;
                predictBtn.disabled = false;
                break;
                
            default:
                preprocessBtn.disabled = true;
                trainBtn.disabled = true;
                predictBtn.disabled = true;
        }
    }

    /**
     * Disable or enable all buttons
     * @param {boolean} disable - Whether to disable buttons
     */
    disableButtons(disable) {
        const buttons = ['refreshDataBtn', 'preprocessBtn', 'trainBtn', 'predictBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = disable;
            }
        });
    }

    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Message type (info, success, error, warning)
     */
    showStatus(message, type = 'info') {
        const statusContainer = document.getElementById('statusContainer');
        if (!statusContainer) return;
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `status ${type} active`;
        statusDiv.innerHTML = `
            <strong>${type.toUpperCase()}:</strong> ${message}
        `;
        
        // Remove old status messages
        while (statusContainer.firstChild) {
            statusContainer.removeChild(statusContainer.firstChild);
        }
        
        statusContainer.appendChild(statusDiv);
        
        // Auto-remove after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.classList.remove('active');
                    setTimeout(() => {
                        if (statusDiv.parentNode) {
                            statusDiv.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }

    /**
     * Update progress bar
     * @param {number} percentage - Progress percentage
     * @param {string} text - Progress text
     */
    setProgress(percentage, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new StockPredictorApp();
    console.log('App initialized');
});

// Make class available globally
window.StockPredictorApp = StockPredictorApp;
