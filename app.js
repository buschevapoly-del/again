// app.js
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
        this.checkForSavedModel();
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        // Auto-fetch data on load
        document.addEventListener('DOMContentLoaded', () => {
            this.fetchData();
        });

        // Button event listeners
        document.getElementById('preprocessBtn').addEventListener('click', () => {
            this.preprocessData();
        });

        document.getElementById('trainBtn').addEventListener('click', () => {
            this.trainModel();
        });

        document.getElementById('predictBtn').addEventListener('click', () => {
            this.makePredictions();
        });

        // Add refresh data button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn';
        refreshBtn.innerHTML = '<span class="icon">🔄</span> Refresh Data';
        refreshBtn.addEventListener('click', () => this.fetchData());
        document.querySelector('.controls').prepend(refreshBtn);
    }

    /**
     * Initialize Chart.js charts
     */
    initializeCharts() {
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
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff',
                            maxTicksLimit: 10
                        },
                        title: {
                            display: true,
                            text: 'Epoch',
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
                        title: {
                            display: true,
                            text: 'Loss',
                            color: '#ffffff'
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });

        // Prediction chart
        const predictionCtx = document.getElementById('predictionChart').getContext('2d');
        this.charts.prediction = new Chart(predictionCtx, {
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
                    },
                    {
                        label: 'Confidence',
                        data: [0, 0, 0, 0, 0],
                        type: 'line',
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#00ff88'
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
                    },
                    annotation: {
                        annotations: {
                            threshold: {
                                type: 'line',
                                yMin: 0.5,
                                yMax: 0.5,
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                borderWidth: 2,
                                borderDash: [5, 5]
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
                        },
                        title: {
                            display: true,
                            text: 'Probability',
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    /**
     * Check for previously saved model
     */
    async checkForSavedModel() {
        if (!this.model) {
            this.model = new GRUModel();
        }
        
        const hasSavedModel = await this.model.loadModel();
        if (hasSavedModel) {
            this.showStatus('Loaded previously trained model', 'success');
            this.updateButtonStates('modelLoaded');
        } else {
            this.showStatus('No saved model found. Fetch data to begin.', 'info');
        }
    }

    /**
     * Fetch S&P 500 data from Yahoo Finance
     */
    async fetchData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showStatus('Fetching S&P 500 data from Yahoo Finance...', 'info');
        this.setProgress(10, 'Connecting to data source');
        this.disableButtons(true);
        
        try {
            // Update UI to show fetching
            document.getElementById('fileInfo').style.display = 'block';
            document.getElementById('fileInfo').innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="loader"></div>
                    <span>Loading S&P 500 data...</span>
                </div>
            `;
            
            // Fetch data
            this.currentData = await this.dataLoader.fetchYahooFinanceData(5);
            
            // Display data info
            const stats = this.dataLoader.getStatistics();
            document.getElementById('fileInfo').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong>Symbol:</strong> ${stats.symbol}
                    </div>
                    <div>
                        <strong>Period:</strong> ${stats.dateRange.start} to ${stats.dateRange.end}
                    </div>
                    <div>
                        <strong>Days:</strong> ${stats.numDays}
                    </div>
                    <div>
                        <strong>Current Price:</strong> $${stats.priceRange.current.toFixed(2)}
                    </div>
                    <div>
                        <strong>Price Range:</strong> $${stats.priceRange.min.toFixed(2)} - $${stats.priceRange.max.toFixed(2)}
                    </div>
                    <div>
                        <strong>Avg Daily Return:</strong> ${(stats.returns.average * 100).toFixed(2)}%
                    </div>
                </div>
            `;
            
            this.showStatus(`Successfully loaded ${stats.numDays} days of S&P 500 data`, 'success');
            this.updateButtonStates('dataLoaded');
            
            // Create history chart
            this.createHistoryChart();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.setProgress(100, 'Data loaded');
            this.disableButtons(false);
        }
    }

    /**
     * Create historical price chart
     */
    createHistoryChart() {
        const stats = this.dataLoader.getStatistics();
        if (!stats) return;
        
        // Add history chart container if not exists
        if (!document.getElementById('historyChartContainer')) {
            const historyCard = document.createElement('div');
            historyCard.className = 'card';
            historyCard.innerHTML = `
                <div class="card-title">
                    <span class="icon">📈</span>
                    <span>Historical S&P 500 Prices</span>
                </div>
                <div class="chart-container">
                    <canvas id="historyChart"></canvas>
                </div>
            `;
            document.querySelector('.dashboard').appendChild(historyCard);
        }
        
        const ctx = document.getElementById('historyChart').getContext('2d');
        
        if (this.charts.history) {
            this.charts.history.destroy();
        }
        
        // Sample dates for display (show every 30th date)
        const displayDates = this.dataLoader.data.dates.filter((_, i) => i % 30 === 0);
        const displayPrices = this.dataLoader.data.prices.filter((_, i) => i % 30 === 0);
        
        this.charts.history = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayDates,
                datasets: [{
                    label: 'S&P 500 Price',
                    data: displayPrices,
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
                            color: '#ffffff',
                            maxTicksLimit: 10
                        }
                    },
                    y:
