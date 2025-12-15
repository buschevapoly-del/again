// data-loader.js - ПОЛНЫЙ КОД ДЛЯ ЗАГРУЗКИ И ПРЕДОБРАБОТКИ ДАННЫХ S&P 500
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized for S&P 500 returns prediction');
        this.data = null;
        this.csvUrl = 'https://raw.githubusercontent.com/buschevapoly-del/again/main/my_data.csv';
        this.returnsData = null;
        this.normalizedData = null;
        this.statistics = {
            symbol: 'S&P 500',
            rows: 0,
            currentPrice: '$0.00',
            dateRange: 'N/A - N/A',
            priceRange: '$0.00 - $0.00',
            volatility: '0.00%',
            meanReturn: '0.0000',
            maxReturn: '0.0000',
            minReturn: '0.0000'
        };
    }

    /**
     * Загружает данные S&P 500 из GitHub CSV файла
     */
    async fetchYahooFinanceData() {
        console.log('Loading S&P 500 data from GitHub...');
        
        try {
            const response = await fetch(this.csvUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const text = await response.text();
            console.log('CSV content loaded, size:', text.length, 'characters');
            
            // Парсинг CSV (формат: дата;цена)
            const rows = text.trim().split('\n');
            console.log('Found', rows.length, 'rows in CSV');
            
            const dates = [];
            const prices = [];
            
            // Пропускаем заголовок если есть
            const startIndex = rows[0].includes('Date') || rows[0].includes('date') ? 1 : 0;
            
            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                
                // Разделяем по точке с запятой
                const cols = row.split(';');
                if (cols.length >= 2) {
                    const date = cols[0].trim();
                    const priceStr = cols[1].trim().replace(',', '.'); // Заменяем запятую на точку если нужно
                    const price = parseFloat(priceStr);
                    
                    if (!isNaN(price) && price > 0) {
                        // Проверяем формат даты
                        const formattedDate = this.formatDate(date);
                        dates.push(formattedDate);
                        prices.push(price);
                    }
                }
            }
            
            if (prices.length === 0) {
                throw new Error('No valid price data found in CSV');
            }
            
            this.data = {
                dates: dates,
                symbol: 'S&P 500',
                prices: prices,
                rows: prices.length,
                source: 'GitHub CSV'
            };
            
            // Обновляем статистику
            this.updateStatistics();
            
            console.log('✅ Data loaded successfully:', this.data.rows, 'rows');
            return this.data;
            
        } catch (error) {
            console.error('❌ Load error:', error);
            
            // Создаем тестовые данные для демонстрации
            this.data = this.createTestData();
            console.log('⚠️ Using test data due to error:', error.message);
            return this.data;
        }
    }
    
    /**
     * Форматирует дату из CSV
     */
    formatDate(dateStr) {
        // Пробуем разные форматы дат
        const formats = [
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
            /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
            /^\d{4}\.\d{2}\.\d{2}$/  // YYYY.MM.DD
        ];
        
        for (const format of formats) {
            if (format.test(dateStr)) {
                return dateStr; // Оставляем как есть если это уже нормальный формат
            }
        }
        
        // Пробуем распарсить как Date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Возвращаем YYYY-MM-DD
        }
        
        return dateStr; // Возвращаем оригинальную строку если не смогли распарсить
    }
    
    /**
     * Создает тестовые данные для демонстрации
     */
    createTestData() {
        console.log('Creating test S&P 500 data...');
        
        const dates = [];
        const prices = [];
        const today = new Date();
        const basePrice = 4500; // Начальная цена около текущих значений S&P 500
        
        // Создаем 1000 дней данных
        for (let i = 1000; i > 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            
            // Моделируем реалистичный ряд цен S&P 500
            if (i === 1000) {
                prices.push(basePrice);
            } else {
                const prevPrice = prices[prices.length - 1];
                // Средняя дневная доходность ~0.03% с волатильностью ~1%
                const dailyReturn = 0.0003 + (Math.random() - 0.5) * 0.02;
                const newPrice = prevPrice * Math.exp(dailyReturn);
                prices.push(newPrice);
            }
        }
        
        this.data = {
            dates: dates,
            symbol: 'S&P 500 (Test Data)',
            prices: prices,
            rows: prices.length,
            source: 'Test data'
        };
        
        this.updateStatistics();
        
        return this.data;
    }
    
    /**
     * Обновляет статистику данных
     */
    updateStatistics() {
        if (!this.data || !this.data.prices || this.data.prices.length === 0) {
            return;
        }
        
        const prices = this.data.prices;
        const dates = this.data.dates;
        
        // Базовая статистика цен
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const currentPrice = prices[prices.length - 1];
        
        // Рассчитываем доходности для волатильности
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = Math.log(prices[i] / prices[i - 1]);
            returns.push(ret);
        }
        
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
        const annualVolatility = Math.sqrt(variance * 252) * 100; // Годовая волатильность в процентах
        
        this.statistics = {
            symbol: this.data.symbol,
            rows: this.data.rows,
            currentPrice: `$${currentPrice.toFixed(2)}`,
            dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
            priceRange: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
            volatility: `${annualVolatility.toFixed(2)}%`,
            meanReturn: meanReturn.toFixed(6),
            maxReturn: Math.max(...returns).toFixed(6),
            minReturn: Math.min(...returns).toFixed(6),
            sharpeRatio: returns.length > 0 ? (meanReturn / Math.sqrt(variance) * Math.sqrt(252)).toFixed(2) : '0.00'
        };
    }
    
    /**
     * Возвращает статистику данных
     */
    getStatistics() {
        return this.statistics;
    }
    
    /**
     * Возвращает данные цен в формате для графиков
     */
    getPriceData() {
        if (!this.data) return [];
        return this.data.dates.map((date, i) => ({ 
            date, 
            price: this.data.prices[i] 
        }));
    }
    
    /**
     * Возвращает сырые цены как массив
     */
    getPricesArray() {
        if (!this.data || !this.data.prices) return [];
        return this.data.prices;
    }
    
    /**
     * Возвращает даты как массив
     */
    getDatesArray() {
        if (!this.data || !this.data.dates) return [];
        return this.data.dates;
    }
    
    /**
     * Рассчитывает и возвращает доходности
     */
    calculateReturns() {
        if (!this.data || !this.data.prices) {
            console.warn('No price data available for returns calculation');
            return [];
        }
        
        const prices = this.data.prices;
        const dates = this.data.dates;
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            const priceToday = prices[i];
            const priceYesterday = prices[i - 1];
            
            // Логарифмическая доходность (более стабильная статистически)
            const logReturn = Math.log(priceToday / priceYesterday);
            
            // Простая процентная доходность (для отображения)
            const simpleReturn = ((priceToday / priceYesterday) - 1) * 100;
            
            returns.push({
                date: dates[i],
                logReturn: logReturn,
                simpleReturnPercent: simpleReturn,
                priceToday: priceToday,
                priceYesterday: priceYesterday
            });
        }
        
        this.returnsData = returns;
        console.log(`✅ Returns calculated: ${returns.length} data points`);
        
        return returns;
    }
    
    /**
     * Возвращает рассчитанные доходности
     */
    getReturnsData() {
        if (!this.returnsData) {
            this.calculateReturns();
        }
        return this.returnsData;
    }
    
    /**
     * Рассчитывает скользящую статистику
     */
    calculateRollingStatistics(windowSize = 20) {
        if (!this.returnsData) {
            this.calculateReturns();
        }
        
        const logReturns = this.returnsData.map(r => r.logReturn);
        const rollingStats = [];
        
        for (let i = windowSize; i < logReturns.length; i++) {
            const windowReturns = logReturns.slice(i - windowSize, i);
            const mean = windowReturns.reduce((a, b) => a + b, 0) / windowSize;
            const variance = windowReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowSize;
            const volatility = Math.sqrt(variance * 252) * 100; // Годовая волатильность
            
            rollingStats.push({
                date: this.returnsData[i].date,
                rollingVolatility: volatility,
                rollingMeanReturn: mean * 252 * 100, // Годовая доходность в %
                windowSize: windowSize
            });
        }
        
        return rollingStats;
    }
    
    /**
     * Нормализует данные (рассчитывает доходности)
     */
    normalizeData() {
        console.log('Normalizing price data by calculating returns...');
        
        if (!this.data) {
            throw new Error('No data loaded. Please load data first.');
        }
        
        try {
            // Рассчитываем доходности
            this.calculateReturns();
            
            // Рассчитываем статистику нормализованных данных
            const returns = this.returnsData.map(r => r.logReturn);
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length);
            
            this.normalizedData = {
                returns: returns,
                normalizedReturns: returns.map(r => (r - mean) / std),
                mean: mean,
                std: std,
                dates: this.data.dates.slice(1) // Пропускаем первую дату (нет доходности)
            };
            
            console.log('✅ Data normalized successfully');
            console.log(`   Mean return: ${mean.toFixed(6)}`);
            console.log(`   Std deviation: ${std.toFixed(6)}`);
            console.log(`   Annual volatility: ${(std * Math.sqrt(252) * 100).toFixed(2)}%`);
            
            return this.normalizedData;
            
        } catch (error) {
            console.error('❌ Error normalizing data:', error);
            throw new Error(`Normalization failed: ${error.message}`);
        }
    }
    
    /**
     * Подготавливает данные для обучения (создает последовательности)
     * Теперь этот метод в основном вызывается из GRU модели
     */
    prepareDataset(lookback = 20, forecastHorizon = 5) {
        console.log(`Preparing dataset with lookback=${lookback}, horizon=${forecastHorizon}`);
        
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData() first.');
        }
        
        const normalizedReturns = this.normalizedData.normalizedReturns;
        
        // Создаем последовательности и таргеты
        const sequences = [];
        const targets = [];
        const sequenceDates = [];
        
        for (let i = lookback; i < normalizedReturns.length - forecastHorizon + 1; i++) {
            // Вход: окно нормализованных доходностей
            const sequence = normalizedReturns.slice(i - lookback, i);
            sequences.push(sequence);
            
            // Цель: кумулятивная доходность на forecastHorizon дней вперед
            const futureReturn = normalizedReturns.slice(i, i + forecastHorizon)
                .reduce((sum, r) => sum + r, 0);
            targets.push(futureReturn);
            
            // Сохраняем дату для этого примера
            sequenceDates.push(this.normalizedData.dates[i]);
        }
        
        console.log(`✅ Dataset prepared: ${sequences.length} sequences`);
        
        return {
            sequences: sequences,
            targets: targets,
            dates: sequenceDates,
            lookback: lookback,
            forecastHorizon: forecastHorizon
        };
    }
    
    /**
     * Разделяет данные на train/val/test как в коллабе (70/15/15)
     */
    splitData(sequences, targets, dates) {
        const n_samples = sequences.length;
        const train_size = Math.floor(n_samples * 0.7);
        const val_size = Math.floor(n_samples * 0.15);
        
        return {
            X_train: sequences.slice(0, train_size),
            y_train: targets.slice(0, train_size),
            dates_train: dates.slice(0, train_size),
            
            X_val: sequences.slice(train_size, train_size + val_size),
            y_val: targets.slice(train_size, train_size + val_size),
            dates_val: dates.slice(train_size, train_size + val_size),
            
            X_test: sequences.slice(train_size + val_size),
            y_test: targets.slice(train_size + val_size),
            dates_test: dates.slice(train_size + val_size),
            
            train_size: train_size,
            val_size: val_size,
            test_size: n_samples - train_size - val_size
        };
    }
    
    /**
     * Возвращает последнюю последовательность для предсказания
     */
    getLatestSequence(lookback = 20) {
        if (!this.normalizedData) {
            throw new Error('Data not normalized');
        }
        
        const normalizedReturns = this.normalizedData.normalizedReturns;
        
        if (normalizedReturns.length < lookback) {
            throw new Error(`Not enough data. Need at least ${lookback} returns, have ${normalizedReturns.length}`);
        }
        
        // Берем последние lookback доходностей
        const lastSequence = normalizedReturns.slice(-lookback);
        const lastDate = this.normalizedData.dates[this.normalizedData.dates.length - 1];
        
        return {
            sequence: lastSequence,
            date: lastDate,
            lookback: lookback
        };
    }
    
    /**
     * Конвертирует нормализованную доходность обратно в реальную
     */
    denormalizeReturn(normalizedReturn) {
        if (!this.normalizedData) {
            throw new Error('Data not normalized');
        }
        
        const { mean, std } = this.normalizedData;
        return (normalizedReturn * std) + mean;
    }
    
    /**
     * Конвертирует логарифмическую доходность в цену
     */
    convertReturnToPrice(startPrice, logReturn) {
        return startPrice * Math.exp(logReturn);
    }
    
    /**
     * Проверяет качество данных
     */
    validateData() {
        if (!this.data) {
            return { valid: false, message: 'No data loaded' };
        }
        
        const issues = [];
        
        // Проверяем наличие данных
        if (this.data.prices.length < 100) {
            issues.push(`Only ${this.data.prices.length} data points. Need at least 100 for meaningful analysis.`);
        }
        
        // Проверяем на пропущенные значения
        let missingCount = 0;
        for (let i = 0; i < this.data.prices.length; i++) {
            if (this.data.prices[i] <= 0 || isNaN(this.data.prices[i])) {
                missingCount++;
            }
        }
        
        if (missingCount > 0) {
            issues.push(`${missingCount} invalid or missing price values found.`);
        }
        
        // Проверяем монотонность дат
        let dateIssues = 0;
        for (let i = 1; i < this.data.dates.length; i++) {
            const prevDate = new Date(this.data.dates[i-1]);
            const currDate = new Date(this.data.dates[i]);
            
            if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) {
                dateIssues++;
            } else if (currDate <= prevDate) {
                dateIssues++;
            }
        }
        
        if (dateIssues > 0) {
            issues.push(`${dateIssues} date sequence issues found.`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            dataPoints: this.data.prices.length,
            dateRange: this.statistics.dateRange,
            priceRange: this.statistics.priceRange
        };
    }
    
    /**
     * Очищает память
     */
    dispose() {
        this.data = null;
        this.returnsData = null;
        this.normalizedData = null;
        console.log('DataLoader memory cleared');
    }
}
