// data-loader-simple.js - ОЧЕНЬ ПРОСТОЙ ЗАГРУЗЧИК ДЛЯ ВАШЕГО CSV
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized for simple CSV format');
        this.data = null;
        this.normalizedData = null;
        this.minValue = null;
        this.maxValue = null;
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
        this.returns = null;
        this.trainIndices = null;
        this.testIndices = null;
        
        // ПРЯМАЯ ссылка на ваш CSV файл в GitHub
        this.csvUrl = 'https://raw.githubusercontent.com/buschevapoly-del/again/main/my_data.csv';
    }

    /**
     * СУПЕР-ПРОСТОЙ МЕТОД ЗАГРУЗКИ - просто берет все числа из файла
     */
    async fetchYahooFinanceData() {
        console.log('Loading from GitHub CSV:', this.csvUrl);
        
        try {
            // Сначала попробуем простой метод
            this.data = await this.loadCSVSimpleMethod();
            
            if (!this.data || this.data.prices.length === 0) {
                // Если не получилось, пробуем альтернативный
                console.log('Simple method failed, trying alternative...');
                this.data = await this.loadCSVAlternative();
            }
            
            console.log('✅ Data loaded successfully:', this.data.prices.length, 'data points');
            console.log('First 5 prices:', this.data.prices.slice(0, 5));
            console.log('Last 5 prices:', this.data.prices.slice(-5));
            
            return this.data;
        } catch (error) {
            console.error('❌ Error loading data:', error);
            // Создаем тестовые данные если не удалось загрузить
            return this.createTestData();
        }
    }

    /**
     * ПРОСТОЙ МЕТОД: берет все числа из файла
     */
    async loadCSVSimpleMethod() {
        console.log('Trying simple CSV parsing method...');
        
        const response = await fetch(this.csvUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Raw file content (first 300 chars):');
        console.log(text.substring(0, 300));
        console.log('Total file length:', text.length, 'characters');
        
        // Разбиваем на строки
        const lines = text.split('\n').map(line => line.trim());
        console.log('Number of lines:', lines.length);
        
        // Собираем ВСЕ числа из файла
        const allPrices = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue; // Пропускаем пустые строки
            
            // Убираем кавычки
            const cleanLine = line.replace(/"/g, '').trim();
            
            // Пробуем распарсить как число
            const num = parseFloat(cleanLine);
            
            if (!isNaN(num) && num > 0) {
                allPrices.push(num);
            } else if (cleanLine && cleanLine !== '""') {
                console.log(`Line ${i}: Could not parse "${cleanLine}" as number`);
            }
        }
        
        console.log(`Found ${allPrices.length} valid numbers`);
        
        if (allPrices.length === 0) {
            throw new Error('No valid numbers found in file');
        }
        
        // Создаем искусственные даты
        const dates = [];
        for (let i = 0; i < allPrices.length; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (allPrices.length - i - 1));
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return {
            dates: dates,
            symbol: 'Stock Prices',
            prices: allPrices,
            source: `GitHub: ${this.csvUrl}`,
            rows: allPrices.length,
            description: 'Single column price data'
        };
    }

    /**
     * АЛЬТЕРНАТИВНЫЙ МЕТОД: используем регулярные выражения
     */
    async loadCSVAlternative() {
        console.log('Trying alternative regex method...');
        
        const response = await fetch(this.csvUrl);
        const text = await response.text();
        
        // Ищем все числа (включая дробные) с помощью регулярного выражения
        const numberRegex = /\b\d+\.\d+\b/g;
        const matches = text.match(numberRegex);
        
        console.log('Regex found matches:', matches ? matches.length : 0);
        
        if (!matches || matches.length === 0) {
            // Пробуем другой паттерн
            const numberRegex2 = /[-+]?\d*\.?\d+/g;
            const matches2 = text.match(numberRegex2);
            
            if (!matches2 || matches2.length === 0) {
                throw new Error('No numbers found with regex');
            }
            
            console.log('Second regex found:', matches2.length, 'matches');
            
            const prices = matches2
                .map(m => parseFloat(m))
                .filter(p => !isNaN(p) && p > 0);
            
            console.log('Valid prices from second regex:', prices.length);
            
            if (prices.length === 0) throw new Error('No valid prices');
            
            return this.createDataObject(prices);
        }
        
        const prices = matches.map(m => parseFloat(m)).filter(p => p > 0);
        return this.createDataObject(prices);
    }

    /**
     * Создает объект данных из массива цен
     */
    createDataObject(prices) {
        const dates = [];
        for (let i = 0; i < prices.length; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (prices.length - i - 1));
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return {
            dates: dates,
            symbol: 'Stock Prices',
            prices: prices,
            source: `GitHub: ${this.csvUrl}`,
            rows: prices.length,
            description: 'Parsed from single column'
        };
    }

    /**
     * СОЗДАЕМ ТЕСТОВЫЕ ДАННЫЕ если не удалось загрузить
     */
    createTestData() {
        console.log('Creating test data as fallback...');
        
        // Создаем тестовые данные (синусоида + тренд)
        const testPrices = [];
        const dates = [];
        const startPrice = 1300;
        const amplitude = 50;
        const points = 200;
        
        for (let i = 0; i < points; i++) {
            const trend = i * 0.5;
            const noise = Math.random() * 20 - 10;
            const cycle = Math.sin(i * 0.1) * amplitude;
            testPrices.push(startPrice + trend + cycle + noise);
            
            const date = new Date();
            date.setDate(date.getDate() - (points - i - 1));
            dates.push(date.toISOString().split('T')[0]);
        }
        
        this.data = {
            dates: dates,
            symbol: 'TEST DATA (S&P 500 Simulation)',
            prices: testPrices,
            source: 'Generated test data (original CSV failed to load)',
            rows: points
        };
        
        console.log('Test data created with', points, 'points');
        return this.data;
    }

    /**
     * Нормализует данные (0-1 диапазон) - УПРОЩЕННАЯ ВЕРСИЯ
     */
    normalizeData() {
        if (!this.data || !this.data.prices) {
            console.warn('No data to normalize, creating test data...');
            this.createTestData();
        }
        
        const prices = this.data.prices;
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        console.log(`Normalizing ${prices.length} prices from ${this.minValue.toFixed(2)} to ${this.maxValue.toFixed(2)}`);
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Рассчитываем доходность
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            this.returns.push(ret);
        }
        
        console.log('✅ Data normalized');
        console.log('Sample normalized:', this.normalizedData.slice(0, 3));
        console.log('Sample returns:', this.returns.slice(0, 3));
    }

    /**
     * Подготавливает датасет для обучения
     */
    prepareDataset(seqLen = 30, predDays = 3, trainSplit = 0.8) {
        if (!this.normalizedData) {
            console.log('Data not normalized, normalizing now...');
            this.normalizeData();
        }
        
        // Автонастройка если данных мало
        const availablePoints = this.normalizedData.length;
        if (availablePoints < seqLen + predDays + 10) {
            console.warn(`Only ${availablePoints} points available. Adjusting parameters...`);
            seqLen = Math.min(20, Math.floor(availablePoints / 3));
            predDays = Math.min(2, Math.floor(seqLen / 4));
            console.log(`New parameters: seqLen=${seqLen}, predDays=${predDays}`);
        }
        
        const totalSamples = this.normalizedData.length - seqLen - predDays;
        
        if (totalSamples <= 0) {
            throw new Error(`Need more data. Have ${availablePoints} points, need at least ${seqLen + predDays}`);
        }
        
        console.log(`Creating ${totalSamples} samples from ${availablePoints} data points`);
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < totalSamples; i++) {
            samples.push(this.normalizedData.slice(i, i + seqLen));
            
            // Бинарные метки: 1 если средняя доходность положительная, 0 если отрицательная
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            const avgReturn = futureReturns.reduce((a, b) => a + b, 0) / futureReturns.length;
            labels.push([avgReturn > 0 ? 1 : 0]); // Упрощаем до одной метки
        }
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIdx}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIdx}, (_, i) => i + splitIdx);
        
        console.log(`Dataset: ${splitIdx} train, ${samples.length - splitIdx} test samples`);
        
        // Создаем тензоры
        this.X_train = tf.tensor3d(
            this.trainIndices.map(idx => [samples[idx]]),
            [splitIdx, 1, seqLen]
        );
        
        this.y_train = tf.tensor2d(
            this.trainIndices.map(idx => labels[idx]),
            [splitIdx, 1]
        );
        
        this.X_test = tf.tensor3d(
            this.testIndices.map(idx => [samples[idx]]),
            [samples.length - splitIdx, 1, seqLen]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIdx, 1]
        );
        
        console.log('✅ Dataset ready');
        console.log('X_train shape:', this.X_train.shape);
        console.log('y_train shape:', this.y_train.shape);
    }

    /**
     * Получает статистику данных
     */
    getStatistics() {
        if (!this.data) {
            return {
                status: '❌ No data loaded',
                message: 'Please load data first'
            };
        }
        
        const prices = this.data.prices;
        const dates = this.data.dates;
        
        let stats = {
            status: '✅ Data loaded successfully',
            symbol: this.data.symbol,
            source: this.data.source,
            dataPoints: prices.length,
            dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
            currentPrice: prices[prices.length - 1].toFixed(2),
            minPrice: Math.min(...prices).toFixed(2),
            maxPrice: Math.max(...prices).toFixed(2),
            avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
        };
        
        if (this.returns && this.returns.length > 0) {
            let positive = 0;
            let total = 0;
            
            this.returns.forEach(r => {
                if (r > 0) positive++;
                total += r;
            });
            
            stats.dailyReturns = {
                positiveDays: `${positive} of ${this.returns.length}`,
                positiveRate: ((positive / this.returns.length) * 100).toFixed(1) + '%',
                avgReturn: ((total / this.returns.length) * 100).toFixed(3) + '%'
            };
        }
        
        if (this.trainIndices) {
            stats.training = {
                trainSamples: this.trainIndices.length,
                testSamples: this.testIndices.length
            };
        }
        
        return stats;
    }

    /**
     * Получает последнюю последовательность для предсказания
     */
    getLatestSequence(seqLen = 30) {
        if (!this.normalizedData) {
            this.normalizeData();
        }
        
        if (this.normalizedData.length < seqLen) {
            seqLen = this.normalizedData.length;
        }
        
        const latest = this.normalizedData.slice(-seqLen);
        return tf.tensor3d([[latest]], [1, 1, seqLen]);
    }

    /**
     * Быстрая проверка файла
     */
    async debugFile() {
        console.log('=== DEBUG FILE CONTENT ===');
        
        try {
            const response = await fetch(this.csvUrl);
            const text = await response.text();
            
            console.log('File size:', text.length, 'bytes');
            console.log('First 10 lines:');
            
            const lines = text.split('\n');
            for (let i = 0; i < Math.min(10, lines.length); i++) {
                console.log(`[${i}] "${lines[i]}"`);
            }
            
            // Анализ содержимого
            const numbers = text.match(/\d+\.\d+/g);
            console.log('Found decimal numbers:', numbers ? numbers.length : 0);
            
            if (numbers) {
                console.log('First 5 numbers:', numbers.slice(0, 5));
                const parsed = numbers.slice(0, 10).map(n => parseFloat(n));
                console.log('Parsed as floats:', parsed);
            }
            
            return {
                success: true,
                size: text.length,
                lines: lines.length,
                numbersFound: numbers ? numbers.length : 0
            };
            
        } catch (error) {
            console.error('Debug failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Очищает память
     */
    dispose() {
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        tensors.forEach(t => {
            if (t) t.dispose();
        });
        console.log('Memory cleared');
    }
}
