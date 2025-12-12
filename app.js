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
            prediction: null
        };
        this.isProcessing = false;
        
        this.initializeUI();
        this.initializeCharts();
        this.checkForSavedModel();
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        // File upload
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('csvFile').click();
        });

        document.getElementById('csvFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        document.getElementById('uploadArea').addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.style.background = 'rgba(255, 0, 122, 0.2)';
        });

        document.getElementById('uploadArea').addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.currentTarget.style.background = '';
        });

        document.getElementById('uploadArea').addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.style.background = '';
            if (e.dataTransfer.files.length) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
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
    }

    /**
     * Initialize Chart.js charts
     */
    initializeCharts() {
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
                        fill: true
                    },
                    {
                        label: 'Validation Loss',
                        data: [],
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        tension: 0.4,
                        fill: true
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
                        }
                    }
                }
            }
        });

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
                        borderColor: [
                            '#ff007a',
                            '#ff007a',
                            '#ff007a',
                            '#ff007a',
                            '#ff007a'
                        ],
                        borderWidth: 2
                    },
                    {
                        label: 'Confidence',
                        data: [0, 0, 0, 0, 0],
                        type: 'line',
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        fill: true,
                        tension: 0.4
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
                        beginAtZero: true,
                        max: 1,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
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
        this.showStatus('Checking for saved model...', 'info');
        // We'll implement model loading later
        this.hideStatus();
    }

    /**
     * Handle CSV file upload
     * @param {File} file - Uploaded CSV file
     */
    async handleFileUpload(file) {
        if (!file || !file.name.endsWith('.csv')) {
            this.showStatus('Please upload a valid CSV file', 'error');
            return;
        }

        this.showStatus('Loading CSV file...', 'info');
        this.setProgress(10, 'Loading data');
        this.disableButtons(true);

        try {
            await this.dataLoader.loadCSV(file);
            
            // Update file info display
           
