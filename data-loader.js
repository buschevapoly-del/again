// data-loader-fixed.js - ЗАГРУЗЧИК ДЛЯ CSV С РАЗДЕЛИТЕЛЕМ ;
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized for semicolon-separated CSV');
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
     * Загружает данные с GitHub
     */
    async fetchYahooFinanceData() {
        console.log('Loading data from GitHub CSV with semicolon separator');
        
        try {
            this.data = await this.loadCSVFromGitHub();
            console.log('✅ Data loaded successfully:', this.data.prices.length, 'data points');
            console.log('Sample data:', {
                firstDate: this.data.dates[0],
                firstPrice: this.data.prices[0],
                lastDate: this.data.dates[this.data.dates.length - 1],
                lastPrice: this.data.prices[this.data.prices.length - 1]
            });
            return this.data;
        } catch (error) {
            console.error('❌ Error loading from GitHub:', error);
            throw error;
        }
    }

    /**
     * Загружает и парсит CSV с разделителем ;
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
        
        console.log('First 200 chars of file:', csvText.substring(0, 200));
        
        // Разбиваем на строки
        const rows = csvText.trim().split('\n');
        console.log('Total rows found:', rows.length);
        
        if (rows.length < 2) {
            throw new Error('CSV has insufficient data (need at least header + 1 data row)');
        }
        
        // Парсим заголовок - используем точку с запятой как разделитель
        const headers = rows[0].split(';').map(h => h.trim());
        console.log('CSV headers:', headers);
        
        if (headers.length < 2) {
            console.warn('Only one column found, trying comma separator...');
            // Пробуем запятую как разделитель
            const headersComma = rows[0].split(',').map(h => h.trim());
            if (headersComma.length >= 2) {
                console.log('Using comma separator instead');
                return this.parseWithSeparator(rows, ',');
            }
            throw new Error('CSV must have at least two columns (date and price)');
        }
        
        return this.parseWithSeparator(rows, ';');
    }

    /**
     * Парсит CSV с указанным разделителем
     */
    parseWithSeparator(rows, separator = ';') {
        console.log(`Parsing with separator: "${separator}"`);
        
        const headers = rows[0].split(separator).map(h => h.trim());
        
        // Находим индексы колонок
        let dateCol = -1;
        let priceCol = -1;
        
        headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('date')) dateCol = index;
            if (lowerHeader.includes('close') || lowerHeader.includes('price') || 
                lowerHeader.includes('value') || lowerHeader.includes('adj') ||
                lowerHeader.includes('s&p') || lowerHeader.includes('p500')) {
                priceCol = index;
            }
        });
        
        // Fallback на первые две колонки
        if (dateCol === -1) dateCol = 0;
        if (priceCol === -1) priceCol = 1;
        
        console.log(`Using column ${dateCol} for dates, column ${priceCol} for prices`);
        
        const dates = [];
        const prices = [];
        let skippedRows = 0;
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) {
                skippedRows++;
                continue;
            }
            
            const cols = row.split(separator);
            
            if (cols.length <= Math.max(dateCol, priceCol)) {
                console.warn(`Row ${i} has only ${cols.length} columns, skipping`);
                skippedRows++;
                continue;
            }
            
            const dateStr = cols[dateCol].trim();
            let priceStr = cols[priceCol].trim();
            
            // Убираем кавычки если есть
            priceStr = priceStr.replace(/"/g, '');
            
            const price = parseFloat(priceStr);
            
            if (isNaN(price)) {
                console.warn(`Row ${i}: Cannot parse price "${priceStr}" as number`);
                skippedRows++;
                continue;
            }
            
            if (price <= 0) {
                console.warn(`Row ${i}: Price ${price} is not positive, skipping`);
                skippedRows++;
                continue;
            }
            
            dates.push(dateStr);
            prices.push(price);
        }
        
        console.log(`Parsed ${prices.length} valid rows, skipped ${skippedRows} rows`);
        
        if (prices.length === 0) {
            throw new Error('No valid price data found in CSV');
        }
        
        // Сортируем по дате (на случай если данные не в хронологическом порядке)
        const combined = dates.map((date, index) => ({ date, price: prices[index] }));
        combined.sort((a, b) => {
            // Конвертируем даты в формат для сравнения (DD.MM.YYYY -> YYYYMMDD)
            const dateA = this.parseEuropeanDate(a.date);
            const dateB = this.parseEuropeanDate(b.date);
            return dateA - dateB;
        });
        
        const sortedDates = combined.map(item => item.date);
        const sortedPrices = combined.map(item => item.price);
        
        console.log(`Data range: ${sortedDates[0]} ($${sortedPrices[0].toFixed(2)}) to ${sortedDates[sortedDates.length - 1]} ($${sortedPrices[sortedPrices.length - 1].toFixed(2)})`);
        
        return {
            dates: sortedDates,
            symbol: 'S&P 500',
            prices: sortedPrices,
            source: `GitHub: ${this.csvUrl}`,
            rows: sortedPrices.length,
            separator: separator
        };
    }

    /**
     * Парсит европейский формат даты (DD.MM.YYYY)
     */
    parseEuropeanDate(dateStr) {
        try {
            // Формат DD.MM.YYYY
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Месяцы в JS: 0-11
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day).getTime();
            }
            
            // Формат YYYY-MM-DD
            if (dateStr.includes('-')) {
                return new Date(dateStr).getTime();
            }
            
            // Другие форматы
            return new Date(dateStr).getTime();
        } catch (e) {
            console.warn(`Cannot parse date: ${dateStr}`, e);
            return 0;
        }
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
        
        console.log(`Normalizing ${prices.length} prices from ${this.minValue.toFixed(2)} to ${this.maxValue.toFixed(2)}`);
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        // Рассчитываем доходность (дневную)
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            this.returns.push(ret);
        }
        
        console.log('✅ Data normalized');
        console.log('Returns calculated:', this.returns.length);
        
        // Статистика доходности
        const positiveReturns = this.returns.filter(r => r > 0).length;
        console.log(`Positive returns: ${positiveReturns}/${this.returns.length} (${(positiveReturns/this.returns.length*100).toFixed(1)}%)`);
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
            // Автоматически подстраиваем параметры если данных мало
            const adjustedSeqLen = Math.min(30, Math.floor(this.normalizedData.length / 3));
            const adjustedPredDays = Math.min(3, Math.floor(adjustedSeqLen / 4));
            
            console.warn(`Not enough data for original parameters. Adjusting to seqLen=${adjustedSeqLen}, predDays=${adjustedPredDays}`);
            return this.prepareDataset(adjustedSeqLen, adjustedPredDays, trainSplit);
        }
        
        console.log(`Creating ${totalSamples} samples (seqLen=${seqLen}, predDays=${predDays})`);
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < totalSamples; i++) {
            samples.push(this.normalizedData.slice(i, i + seqLen));
            
            // Используем среднюю доходность за predDays дней как метку
            const futureReturns = this.returns.slice(i + seqLen, i + seqLen + predDays);
            const avgReturn = futureReturns.reduce((sum, r) => sum + r, 0) / futureReturns.length;
            
            // Бинарная классификация: 1 если средняя доходность положительная, 0 если отрицательная
            labels.push([avgReturn > 0 ? 1 : 0]);
        }
        
        const splitIdx = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIdx}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIdx}, (_, i) => i + splitIdx);
        
        console.log(`Dataset split: ${splitIdx} train, ${samples.length - splitIdx} test samples`);
        
        // Создаем тензоры TensorFlow.js
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
                status: '❌ No data loaded',
                message: 'Click "Load Data from GitHub" first'
            };
        }
        
        const prices = this.data.prices;
        const dates = this.data.dates;
        
        const totalReturn = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
        
        let stats = {
            status: '✅ Data loaded',
            symbol: this.data.symbol,
            source: this.data.source,
            dataPoints: prices.length,
            dateRange: `${dates[0]} - ${dates[dates.length - 1]}`,
            days: prices.length,
            currentPrice: `$${prices[prices.length - 1].toFixed(2)}`,
            priceRange: `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`,
            totalReturn: `${totalReturn.toFixed(2)}%`,
            avgPrice: `$${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`
        };
        
        if (this.returns && this.returns.length > 0) {
            const positiveReturns = this.returns.filter(r => r > 0).length;
            const avgReturn = this.returns.reduce((a, b) => a + b, 0) / this.returns.length * 100;
            
            stats.returns = {
                positiveDays: `${positiveReturns} of ${this.returns.length}`,
                positiveRate: `${(positiveReturns / this.returns.length * 100).toFixed(1)}%`,
                avgDailyReturn: `${avgReturn.toFixed(3)}%`,
                volatility: `${(Math.stddev(this.returns) * 100).toFixed(2)}%`
            };
        }
        
        if (this.trainIndices) {
            stats.training = {
                trainSamples: this.trainIndices.length,
                testSamples: this.testIndices.length,
                sequenceLength: this.X_train ? this.X_train.shape[2] : 'N/A',
                predictionDays: this.y_train ? this.y_train.shape[1] : 'N/A'
            };
        }
        
        return stats;
    }

    /**
     * Получает последнюю последовательность для предсказания
     */
    getLatestSequence(seqLen = 60) {
        if (!this.normalizedData) {
            throw new Error('Normalize data first');
        }
        
        if (this.normalizedData.length < seqLen) {
            seqLen = this.normalizedData.length;
            console.warn(`Using shorter sequence: ${seqLen} days`);
        }
        
        const latest = this.normalizedData.slice(-seqLen);
        return tf.tensor3d([[latest]], [1, 1, seqLen]);
    }

    /**
     * Получает данные для графика
     */
    getPriceData(maxPoints = 200) {
        if (!this.data) return [];
        
        const { dates, prices } = this.data;
        
        if (dates.length <= maxPoints) {
            return dates.map((date, i) => ({ 
                date: date, 
                price: prices[i],
                index: i 
            }));
        }
        
        const step = Math.ceil(dates.length / maxPoints);
        const result = [];
        
        for (let i = 0; i < dates.length; i += step) {
            result.push({ 
                date: dates[i], 
                price: prices[i],
                index: i 
            });
        }
        
        // Добавляем последнюю точку
        if (result.length === 0 || result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({ 
                date: dates[dates.length - 1], 
                price: prices[prices.length - 1],
                index: dates.length - 1 
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
        console.log('Memory cleared');
    }
}

// Добавляем функцию stddev в Math если её нет
if (!Math.stddev) {
    Math.stddev = function(arr) {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.sqrt(
            arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / arr.length
        );
    };
}
