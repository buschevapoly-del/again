// app.js - MAIN APPLICATION
console.log('🚀 App.js loaded');

// Создаем глобальные переменные для загрузчиков
let dataLoader = null;
let gruModel = null;
let priceChart = null;
let trainingChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing application...');
    
    // Проверяем, что TensorFlow загружен
    if (typeof tf === 'undefined') {
        console.error('❌ TensorFlow.js not loaded!');
        return;
    }
    
    initApp();
});

function initApp() {
    console.log('📱 Initializing app...');
    
    // Создаем объекты
    dataLoader = new DataLoader();
    gruModel = new GRUModel();
    
    // Настраиваем графики
    setupCharts();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Показываем статус
    showStatus('✅ Ready to load data from GitHub', 'info');
    
    console.log('✅ App initialized successfully');
}

function setupCharts() {
    console.log('📊 Setting up charts...');
    
    // График цен
    const priceCanvas = document.getElementById('priceChart');
    if (!priceCanvas) {
        console.error('❌ priceChart canvas not found');
        return;
    }
    
    priceChart = new Chart(priceCanvas.getContext('2d'), {
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
                legend: {
                    display: true
                }
            }
        }
    });
    
    // График обучения
    const trainingCanvas = document.getElementById('trainingChart');
    if (!trainingCanvas) {
        console.error('❌ trainingChart canvas not found');
        return;
    }
    
    trainingChart = new Chart(trainingCanvas.getContext('2d'), {
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

function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Кнопка загрузки данных
    const loadBtn = document.getElementById('loadBtn');
    if (!loadBtn) {
        console.error('❌ loadBtn not found!');
        return;
    }
    
    loadBtn.addEventListener('click', function() {
        console.log('🎯 Load Data button clicked!');
        loadData();
    });
    
    // Кнопка подготовки данных
    const preprocessBtn = document.getElementById('preprocessBtn');
    if (preprocessBtn) {
        preprocessBtn.addEventListener('click', function() {
            console.log('⚙️ Prepare Data button clicked!');
            prepareData();
        });
    }
    
    // Кнопка тренировки модели
    const trainBtn = document.getElementById('trainBtn');
    if (trainBtn) {
        trainBtn.addEventListener('click', function() {
            console.log('🧠 Train Model button clicked!');
            trainModel();
        });
    }
    
    // Кнопка предсказаний
    const predictBtn = document.getElementById('predictBtn');
    if (predictBtn) {
        predictBtn.addEventListener('click', function() {
            console.log('🔮 Predict button clicked!');
            makePredictions();
        });
    }
    
    console.log('✅ Event listeners setup complete');
}

async function loadData() {
    if (!dataLoader) {
        showStatus('❌ DataLoader not initialized', 'error');
        return;
    }
    
    // Блокируем кнопку
    const loadBtn = document.getElementById('loadBtn');
    const originalText = loadBtn.innerHTML;
    loadBtn.disabled = true;
    loadBtn.innerHTML = '⏳ Loading...';
    
    showStatus('⏳ Loading data from GitHub...', 'info');
    updateProgress(10, 'Connecting to GitHub...');
    
    try {
        updateProgress(30, 'Downloading CSV file...');
        
        // Загружаем данные
        const data = await dataLoader.loadData();
        
        updateProgress(70, 'Processing data...');
        
        // Обновляем статистику
        updateStats();
        
        // Обновляем график
        updatePriceChart();
        
        updateProgress(100, '✅ Data loaded!');
        showStatus('✅ Data loaded successfully!', 'success');
        
        // Активируем кнопку подготовки данных
        const preprocessBtn = document.getElementById('preprocessBtn');
        if (preprocessBtn) {
            preprocessBtn.disabled = false;
            preprocessBtn.innerHTML = '⚙️ 2. Prepare Data';
        }
        
        console.log('🎉 Data load complete:', data);
        
    } catch (error) {
        console.error('💥 Error loading data:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        updateProgress(0, `Error: ${error.message}`);
    } finally {
        // Разблокируем кнопку
        loadBtn.disabled = false;
        loadBtn.innerHTML = originalText;
    }
}

function updateStats() {
    if (!dataLoader) return;
    
    const stats = dataLoader.getStats();
    const statsText = document.getElementById('statsText');
    const fileInfo = document.getElementById('fileInfo');
    
    if (statsText) {
        let html = `<strong>${stats.symbol}</strong><br>`;
        html += `${stats.points} data points<br>`;
        html += `Current: ${stats.current}<br>`;
        html += `Range: ${stats.min} - ${stats.max}<br>`;
        html += `${stats.dateRange}`;
        
        if (stats.returns) {
            html += `<br><br><strong>Returns:</strong><br>`;
            html += `Positive: ${stats.returns.positive} (${stats.returns.rate})<br>`;
            html += `Avg Daily: ${stats.returns.avg}`;
        }
        
        statsText.innerHTML = html;
    }
    
    if (fileInfo) {
        fileInfo.style.display = 'block';
    }
}

function updatePriceChart() {
    if (!priceChart || !dataLoader) return;
    
    const chartData = dataLoader.getChartData(100);
    
    const labels = chartData.map(d => d.date);
    const prices = chartData.map(d => d.price);
    
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.update();
    
    console.log('📊 Price chart updated with', prices.length, 'points');
}

function prepareData() {
    if (!dataLoader) {
        showStatus('❌ DataLoader not initialized', 'error');
        return;
    }
    
    const preprocessBtn = document.getElementById('preprocessBtn');
    const originalText = preprocessBtn.innerHTML;
    preprocessBtn.disabled = true;
    preprocessBtn.innerHTML = '⏳ Preparing...';
    
    showStatus('⚙️ Preparing data for training...', 'info');
    updateProgress(0, 'Creating sequences...');
    
    try {
        updateProgress(50, 'Creating training sequences...');
        
        // Подготавливаем данные
        dataLoader.prepareForTraining(60, 5);
        
        updateProgress(100, '✅ Data ready!');
        showStatus('✅ Data prepared for GRU training!', 'success');
        
        // Активируем кнопку тренировки
        const trainBtn = document.getElementById('trainBtn');
        if (trainBtn) {
            trainBtn.disabled = false;
            trainBtn.innerHTML = '🧠 3. Train GRU Model';
        }
        
        console.log('📊 Data preparation complete');
        
    } catch (error) {
        console.error('💥 Error preparing data:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        preprocessBtn.disabled = false;
        preprocessBtn.innerHTML = originalText;
    }
}

async function trainModel() {
    if (!dataLoader || !gruModel) {
        showStatus('❌ Models not initialized', 'error');
        return;
    }
    
    const trainBtn = document.getElementById('trainBtn');
    const originalText = trainBtn.innerHTML;
    trainBtn.disabled = true;
    trainBtn.innerHTML = '⏳ Training...';
    
    showStatus('🧠 Training GRU model... (30-60 seconds)', 'info');
    updateProgress(0, 'Building model...');
    
    try {
        updateProgress(10, 'Building GRU model...');
        
        // Строим модель
        gruModel.buildModel([1, 60]);
        
        // Получаем данные
        const X_train = dataLoader.X_train;
        const y_train = dataLoader.y_train;
        const X_test = dataLoader.X_test;
        const y_test = dataLoader.y_test;
        
        if (!X_train || !y_train) {
            throw new Error('Data not prepared. Click "Prepare Data" first.');
        }
        
        // Разделяем данные для валидации
        const valSplit = Math.floor(X_train.shape[0] * 0.8);
        const X_val = X_train.slice([valSplit, 0, 0], [X_train.shape[0] - valSplit, 1, 60]);
        const y_val = y_train.slice([valSplit, 0], [y_train.shape[0] - valSplit, 1]);
        const X_train_sub = X_train.slice([0, 0, 0], [valSplit, 1, 60]);
        const y_train_sub = y_train.slice([0, 0], [valSplit, 1]);
        
        updateProgress(20, 'Starting training...');
        
        // Обучаем модель
        await gruModel.train(
            X_train_sub, y_train_sub, X_val, y_val,
            (epoch, totalEpochs, trainLoss, valLoss) => {
                const progress = 20 + (epoch / totalEpochs) * 70;
                updateProgress(progress, `Epoch ${epoch}/${totalEpochs} - Loss: ${trainLoss.toFixed(6)}`);
                
                // Обновляем график обучения
                updateTrainingChart(epoch, trainLoss, valLoss);
                
                // Обновляем метрики
                if (epoch % 5 === 0) {
                    document.getElementById('trainLoss').textContent = trainLoss.toFixed(6);
                    document.getElementById('valLoss').textContent = valLoss.toFixed(6);
                }
            }
        );
        
        // Оцениваем модель
        updateProgress(95, 'Evaluating model...');
        const evalResult = gruModel.evaluate(X_test, y_test);
        
        // Обновляем финальные метрики
        document.getElementById('rmse').textContent = evalResult.rmse;
        document.getElementById('accuracy').textContent = evalResult.accuracy;
        
        updateProgress(100, '✅ Training complete!');
        showStatus('✅ GRU model trained successfully!', 'success');
        
        // Активируем кнопку предсказаний
        const predictBtn = document.getElementById('predictBtn');
        if (predictBtn) {
            predictBtn.disabled = false;
            predictBtn.innerHTML = '🔮 4. Predict Next 5 Days';
        }
        
        console.log('🏆 Model training complete:', evalResult);
        
    } catch (error) {
        console.error('💥 Error training model:', error);
        showStatus(`❌ Training error: ${error.message}`, 'error');
    } finally {
        trainBtn.disabled = false;
        trainBtn.innerHTML = originalText;
    }
}

function updateTrainingChart(epoch, trainLoss, valLoss) {
    if (!trainingChart) return;
    
    trainingChart.data.labels.push(`E${epoch}`);
    trainingChart.data.datasets[0].data.push(trainLoss);
    trainingChart.data.datasets[1].data.push(valLoss);
    
    // Ограничиваем до 50 точек
    if (trainingChart.data.labels.length > 50) {
        trainingChart.data.labels.shift();
        trainingChart.data.datasets[0].data.shift();
        trainingChart.data.datasets[1].data.shift();
    }
    
    trainingChart.update();
}

async function makePredictions() {
    if (!dataLoader || !gruModel) {
        showStatus('❌ Models not initialized', 'error');
        return;
    }
    
    const predictBtn = document.getElementById('predictBtn');
    const originalText = predictBtn.innerHTML;
    predictBtn.disabled = true;
    predictBtn.innerHTML = '⏳ Predicting...';
    
    showStatus('🔮 Making predictions for next 5 days...', 'info');
    
    try {
        // Получаем последнюю последовательность
        const latestSequence = dataLoader.getLatestSequence(60);
        
        // Делаем предсказания
        const predictions = gruModel.predictSequence(latestSequence, 5);
        
        // Обновляем UI
        updatePredictionsDisplay(predictions);
        
        showStatus('✅ Predictions generated!', 'success');
        
        console.log('📈 Predictions:', predictions);
        
        // Очищаем память
        latestSequence.dispose();
        
    } catch (error) {
        console.error('💥 Error making predictions:', error);
        showStatus(`❌ Prediction error: ${error.message}`, 'error');
    } finally {
        predictBtn.disabled = false;
        predictBtn.innerHTML = originalText;
    }
}

function updatePredictionsDisplay(predictions) {
    const grid = document.getElementById('predictionGrid');
    if (!grid) return;
    
    predictions.forEach((pred, index) => {
        const dayElement = grid.querySelector(`.prediction-day:nth-child(${index + 1})`);
        if (dayElement) {
            const returnPercent = (pred.value * 100).toFixed(3);
            
            dayElement.querySelector('.prediction-value').textContent = pred.direction;
            dayElement.querySelector('.prediction-value').className = 
                `prediction-value ${pred.direction.toLowerCase()}`;
            dayElement.querySelector('.prediction-confidence').textContent = 
                `Return: ${returnPercent}%`;
        }
    });
}

function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    const textElem = document.getElementById('progressText');
    
    if (fill) fill.style.width = `${percent}%`;
    if (textElem) textElem.textContent = text;
}

function showStatus(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    const container = document.getElementById('statusContainer');
    if (!container) return;
    
    const status = document.createElement('div');
    status.className = `status ${type} active`;
    status.textContent = message;
    
    // Удаляем старые статусы
    const oldStatuses = container.querySelectorAll('.status');
    oldStatuses.forEach(s => s.remove());
    
    container.appendChild(status);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (status.parentNode) {
            status.classList.remove('active');
            setTimeout(() => status.remove(), 300);
        }
    }, 5000);
}

// Сделаем функции доступными глобально для отладки
window.debugApp = function() {
    console.log('=== DEBUG APP ===');
    console.log('DataLoader:', dataLoader);
    console.log('GRUModel:', gruModel);
    console.log('Charts:', { priceChart, trainingChart });
    console.log('TensorFlow loaded:', typeof tf !== 'undefined');
    console.log('=== END DEBUG ===');
};
