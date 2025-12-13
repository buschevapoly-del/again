// app.js - MAIN APPLICATION
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
        document.getElementById('refreshDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('preprocessBtn').addEventListener('click', () => this.preprocessData());
        document.getElementById('trainBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
    }

    /**
     * Загружает данные из GitHub
     */
    async loadData() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoader('refreshLoader', true);
        this.showStatus('Loading data from GitHub...', 'info');
        this.setProgress(0, 'Starting');
        
        try {
            this.setProgress(30, 'Downloading CSV');
            await this.dataLoader.fetchYahooFinanceData();
            
            this.setProgress(70, 'Processing data');
            const stats = this.dataLoader.getStatistics();
            
            // Обновляем информацию о данных
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.classList.add('active');
            fileInfo.innerHTML = `
                <div style="text-align: center;">
                    <h4 style="color: #ff007a;">${stats.symbol}</h4>
                    <p>${stats.dateRange}</p>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Data Points</strong>
                        <div>${stats.numDays}</div>
                    </div>
                    <div class="info-item">
                        <strong>Current Price</strong>
                        <div>${stats.currentPrice}</div>
                    </div>
                    <div class="info-item">
                        <strong>Price Range</strong>
                        <div>${stats.priceRange}</div>
                    </div>
                    <div class="info-item">
                        <strong>Avg Daily Return</strong>
                        <div>${stats.returns.avgDaily}</div>
                    </
