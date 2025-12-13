// data-loader.js - DIRECT GITHUB CSV LOADER
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
     * Загружает и парсит CSV с GitHub
     */
    async loadCSVFromGitHub() {
        console.log('📥 Fetching CSV from GitHub...');
        
        const response = await fetch(this.csvUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub returned ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('CSV file is empty');
        }
        
        const rows = csvText.trim().split('\n');
        
        if (rows.length < 2) {
            throw new Error('CSV has insufficient data');
        }
        
        const headers = rows[0].split(',').map(h => h.trim());
        console.log('CSV headers found:', headers);
        
        // Автоматически определяем колонки
        let dateCol = -1;
        let priceCol = -1;
        
        headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('date')) dateCol = index;
            if (lowerHeader.includes('close') || lowerHeader.includes('price') || 
                lowerHeader.includes('value') || lowerHeader.includes('adj')) {
                priceCol = index;
            }
        });
        
        // Fallback на первые две колонки если не нашли
        if (dateCol === -1) dateCol = 0;
        if (priceCol === -1) priceCol = 1;
        
        const dates = [];
        const prices = [];
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row.trim()) continue;
            
            const cols = row.split(',');
            
            if (cols.length > Math.max(dateCol, priceCol)) {
                const date = cols[dateCol].trim();
                const priceStr = cols[priceCol].trim();
                const price = parseFloat(priceStr);
                
                if (!isNaN(price) && price > 0) {
                    dates.push(date);
                    prices.push(price);
                }
            }
        }
        
        if (dates.length === 0) {
            throw new Error('No valid data found in CSV');
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 (Your GitHub Data)',
            prices: prices,
            source: `GitHub: ${this.csvUrl}`,
            rows: dates.length
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
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Рассчитываем доходность
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            this.returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        console.log('✅ Data normalized. Range:', this.minValue.toFixed(2), 'to', this.maxValue.toFixed(2));
    }

    /**
     * Подготавливает датасет для обучения
     */
    prepareDataset(seqLen = 60, predDays = 5, trainSplit = 0.8) {
        if (!this.normalizedData) {
            throw new Error('Normalize data first');
        }
        
        const totalSamples = this.normalizedData.length - seqLen - predDays;
        
        if (totalSamples <= 0) {
            throw new Error('Not enough data');
        }
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < totalSamples; i++) {
            samples.push(this.normalizedData.slice(i, i + seqLen));
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            labels.push(futureReturns.map(r => r > 0 ? 1 : 0));
        }
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIdx}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIdx}, (_, i) => i + splitIdx);
        
        console.log(`Created ${samples.length} samples (${splitIdx} train, ${samples.length - splitIdx} test)`);
        
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
        
        return {
            symbol: this.data.symbol,
            source: this.data.source,
            numDays: prices.length,
            currentPrice: '$' + (prices[prices.length - 1] || 0).toFixed(2),
            dateRange: `${dates[0] || 'N/A'} to ${dates[dates.length - 1] || 'N/A'}`,
            priceRange: `$${(Math.min(...prices) || 0).toFixed(2)} - $${(Math.max(...prices) || 0).toFixed(2)}`,
            returns: {
                avgDaily: avgReturn.toFixed(2) + '%',
                positiveDays: positiveDays,
                positiveRate: positiveRate.toFixed(1) + '%'
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0
        };
    }

    /**
     * Получает последнюю последовательность для предсказания
     */
    getLatestSequence(seqLen = 60) {
        if (!this.normalizedData || this.normalizedData.length < seqLen) {
            throw new Error('Need more data for prediction');
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
        if (result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({ 
                date: dates[dates.length - 1], 
                price: prices[prices.length - 1] 
            });
        }
        
        return result;
    }

    /**
     * Очищает память
     */
    dispose() {
        const tensors = [this.X_train, this.y_train, this.X_test, this.y_test];
        tensors.forEach(t => {
            if (t) t.dispose();
        });
    }
}
