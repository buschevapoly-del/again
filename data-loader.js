// data-loader.js - DIRECT GITHUB CSV LOADER (Fixed for single-column format)
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized for GitHub CSV');
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
     * Загружает данные напрямую из вашего GitHub CSV
     */
    async fetchYahooFinanceData() {
        console.log('Loading data directly from GitHub CSV:', this.csvUrl);
        
        try {
            this.data = await this.loadCSVFromGitHub();
            console.log('✅ Data loaded successfully:', this.data.prices.length, 'data points');
            return this.data;
        } catch (error) {
            console.error('❌ Error loading from GitHub:', error);
            throw error;
        }
    }

    /**
     * Загружает и парсит CSV с GitHub (специально для формата с одним столбцом цен)
     */
    async loadCSVFromGitHub() {
        console.log('📥 Fetching CSV from GitHub...');
        
        const response = await fetch(this.csvUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub returned ${response.status}: ${response.statusText}`);
        }
        
        let csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('CSV file is empty');
        }
        
        console.log('Raw CSV text (first 500 chars):', csvText.substring(0, 500));
        
        // Очистка данных: удаляем пустые строки и кавычки
        const lines = csvText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        console.log('Lines after cleaning:', lines.length);
        
        const prices = [];
        const dates = [];
        let invalidCount = 0;
        
        // Ваш файл содержит только цены в одном столбце, без заголовков
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Удаляем кавычки если есть
            let cleanValue = line.replace(/"/g, '').trim();
            
            // Пропускаем пустые строки или строки с пустыми кавычками
            if (cleanValue === '' || cleanValue === '""') {
                console.log(`Skipping empty line at index ${i}`);
                invalidCount++;
                continue;
            }
            
            // Парсим числовое значение
            const price = parseFloat(cleanValue);
            
            if (isNaN(price)) {
                console.log(`Invalid number at line ${i}: "${line}" -> "${cleanValue}"`);
                invalidCount++;
                continue;
            }
            
            // Проверяем что цена разумная (больше 0)
            if (price <= 0) {
                console.log(`Non-positive price at line ${i}: ${price}`);
                invalidCount++;
                continue;
            }
            
            prices.push(price);
            
            // Создаем искусственные даты (начиная с сегодняшнего дня и идя назад)
            // Это нужно для совместимости с остальным кодом
            const date = new Date();
            date.setDate(date.getDate() - (lines.length - i));
            dates.push(date.toISOString().split('T')[0]); // Формат YYYY-MM-DD
        }
        
        console.log(`Parsed ${prices.length} valid prices, skipped ${invalidCount} invalid entries`);
        console.log('First 5 prices:', prices.slice(0, 5));
        console.log('Last 5 prices:', prices.slice(-5));
        console.log('Date range:', dates[0], 'to', dates[dates.length - 1]);
        
        if (prices.length === 0) {
            throw new Error('No valid numeric data found in CSV. Check if file contains numbers like 1313.27, 1326.82, etc.');
        }
        
        if (prices.length < 10) {
            console.warn(`Warning: Only ${prices.length} data points found. More data is recommended.`);
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 Daily Prices',
            prices: prices,
            source: `GitHub: ${this.csvUrl}`,
            rows: prices.length,
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length
        };
    }

    /**
     * Альтернативный метод: если первый не работает
     */
    async loadCSVFromGitHubAlternative() {
        console.log('Trying alternative CSV parsing method...');
        
        const response = await fetch(this.csvUrl);
        const csvText = await response.text();
        
        // Разделяем по любому whitespace
        const values = csvText.split(/\s+/).filter(v => v.trim().length > 0);
        
        console.log('Found', values.length, 'values in file');
        
        const prices = [];
        const dates = [];
        
        for (let i = 0; i < values.length; i++) {
            const val = values[i].replace(/"/g, '').trim();
            
            if (val === '' || val === '""') continue;
            
            const price = parseFloat(val);
            
            if (!isNaN(price) && price > 0) {
                prices.push(price);
                
                // Создаем дату
                const date = new Date();
                date.setDate(date.getDate() - (values.length - i));
                dates.push(date.toISOString().split('T')[0]);
            }
        }
        
        if (prices.length === 0) {
            throw new Error('Alternative parser also failed to find valid data');
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 Daily Prices',
            prices: prices,
            source: `GitHub: ${this.csvUrl} (alternative parser)`,
            rows: prices.length
        };
    }

    /**
     * Нормализует данные (0-1 диапазон)
     */
    normalizeData() {
        if (!this.data || !this.data.prices) {
            throw new Error('Load data first');
        }
        
        const prices = this.data.prices;
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        console.log(`Normalizing ${prices.length} prices from ${this.minValue} to ${this.maxValue}`);
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Рассчитываем доходность
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            this.returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        console.log('✅ Data normalized. Returns calculated:', this.returns.length);
        console.log('Sample normalized values:', this.normalizedData.slice(0, 5));
        console.log('Sample returns:', this.returns.slice(0, 5));
    }

    /**
     * Подготавливает датасет для обучения
     */
    prepareDataset(seqLen = 60, predDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Normalize data first');
        }
        
        if (this.normalizedData.length < seqLen + predDays + 10) {
            console.warn(`Warning: Very little data (${this.normalizedData.length} points). Consider reducing seqLen (currently ${seqLen})`);
            // Автоматически подстраиваем seqLen если данных мало
            seqLen = Math.min(seqLen, Math.floor(this.normalizedData.length / 3));
            predDays = Math.min(predDays, Math.floor(seqLen / 3));
            console.log(`Adjusted: seqLen=${seqLen}, predDays=${predDays}`);
        }
        
        const totalSamples = this.normalizedData.length - seqLen - predDays;
        
        if (totalSamples <= 0) {
            throw new Error(`Not enough data. Need at least ${seqLen + predDays} points, have ${this.normalizedData.length}`);
        }
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < totalSamples; i++) {
            samples.push(this.normalizedData.slice(i, i + seqLen));
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            labels.push(futureReturns.map(r => r > 0 ? 1 : 0));
        }
        
        console.log(`Created ${samples.length} samples`);
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIdx}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIdx}, (_, i) => i + splitIdx);
        
        console.log(`Dataset split: ${splitIdx} train, ${samples.length - splitIdx} test`);
        
        // Создаем тензоры TensorFlow.js
        this.X_train = tf.tensor3d(
            this.trainIndices.map(idx => [samples[idx]]),
            [splitIdx, 1, seqLen]
        );
        
        this.y_train = tf.tensor2d(
            this.trainIndices.map(idx => labels[idx]),
            [splitIdx, predDays]
        );
        
        this.X_test = tf.tensor3d(
            this.testIndices.map(idx => [samples[idx]]),
            [samples.length - splitIdx, 1, seqLen]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIdx, predDays]
        );
        
        console.log('✅ Dataset prepared');
        console.log('X_train shape:', this.X_train.shape);
        console.log('y_train shape:', this.y_train.shape);
    }

    /**
     * Получает статистику данных
     */
    getStatistics() {
        if (!this.data) {
            return {
                symbol: 'No data loaded',
                numDays: 0,
                currentPrice: 'N/A',
                dateRange: 'N/A - N/A',
                priceRange: 'N/A - N/A',
                returns: 'N/A',
                source: 'No data'
            };
        }
        
        const prices = this.data.prices;
        const dates = this.data.dates;
        const returns = this.returns || [];
        
        let positiveDays = 0;
        let totalReturn = 0;
        
        returns.forEach(ret => {
            totalReturn += ret;
            if (ret > 0) positiveDays++;
        });
        
        const avgReturn = returns.length > 0 ? (totalReturn / returns.length) * 100 : 0;
        const positiveRate = returns.length > 0 ? (positiveDays / returns.length) * 100 : 0;
        
        // Рассчитываем общую доходность
        const totalPercentReturn = prices.length > 1 ? 
            ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0;
        
        return {
            symbol: this.data.symbol,
            source: this.data.source,
            numDays: prices.length,
            currentPrice: prices[prices.length - 1].toFixed(2),
            dateRange: `${dates[0] || 'N/A'} to ${dates[dates.length - 1] || 'N/A'}`,
            priceRange: `${(Math.min(...prices) || 0).toFixed(2)} - ${(Math.max(...prices) || 0).toFixed(2)}`,
            totalReturn: totalPercentReturn.toFixed(2) + '%',
            returns: {
                avgDaily: avgReturn.toFixed(3) + '%',
                positiveDays: positiveDays + ' of ' + returns.length,
                positiveRate: positiveRate.toFixed(1) + '%'
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0,
            status: '✅ Loaded successfully'
        };
    }

    /**
     * Получает последнюю последовательность для предсказания
     */
    getLatestSequence(seqLen = 60) {
        if (!this.normalizedData || this.normalizedData.length < seqLen) {
            throw new Error(`Need at least ${seqLen} data points for prediction, have ${this.normalizedData ? this.normalizedData.length : 0}`);
        }
        
        const latest = this.normalizedData.slice(-seqLen);
        return tf.tensor3d([[latest]], [1, 1, seqLen]);
    }

    /**
     * Получает данные для графика
     */
    getPriceData(maxPoints = 100) {
        if (!this.data) return [];
        
        const { dates, prices } = this.data;
        
        if (dates.length <= maxPoints) {
            return dates.map((date, i) => ({ date, price: prices[i] }));
        }
        
        const step = Math.ceil(dates.length / maxPoints);
        const result = [];
        
        for (let i = 0; i < dates.length; i += step) {
            result.push({ date: dates[i], price: prices[i] });
        }
        
        // Добавляем последнюю точку
        if (result.length === 0 || result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({ 
                date: dates[dates.length - 1], 
                price: prices[prices.length - 1] 
            });
        }
        
        return result;
    }

    /**
     * Простая версия для быстрой проверки
     */
    async simpleLoadAndCheck() {
        try {
            console.log('=== SIMPLE LOAD AND CHECK ===');
            const response = await fetch(this.csvUrl);
            const text = await response.text();
            
            console.log('File size:', text.length, 'chars');
            console.log('First 200 chars:', text.substring(0, 200));
            
            // Простой парсинг: берем все числа
            const numbers = text.match(/[\d\.]+/g);
            console.log('Found numbers:', numbers ? numbers.slice(0, 10) : 'none');
            
            if (numbers) {
                const validNumbers = numbers
                    .map(n => parseFloat(n))
                    .filter(n => !isNaN(n) && n > 0);
                
                console.log('Valid numbers:', validNumbers.length);
                console.log('Examples:', validNumbers.slice(0, 5));
                
                if (validNumbers.length > 0) {
                    return {
                        success: true,
                        count: validNumbers.length,
                        min: Math.min(...validNumbers),
                        max: Math.max(...validNumbers),
                        avg: validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length
                    };
                }
            }
            
            return { success: false, error: 'No numbers found' };
            
        } catch (error) {
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
        console.log('DataLoader memory cleared');
    }
}
