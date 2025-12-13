// data-loader.js - LOADS DATA FROM GITHUB CSV
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized');
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
        this.symbol = '^GSPC';
        this.isFetching = false;
        
        // URL вашего CSV файла на GitHub
        this.csvUrl = 'https://raw.githubusercontent.com/buschevapoly-del/again/main/my_data.csv';
    }

    /**
     * Загружает данные из вашего CSV файла на GitHub
     */
    async fetchYahooFinanceData() {
        console.log('Loading data from GitHub CSV...');
        
        if (this.isFetching) {
            console.log('Already fetching, skipping...');
            return this.data;
        }
        
        this.isFetching = true;
        
        try {
            // Загружаем данные из вашего CSV файла
            this.data = await this.loadDataFromGitHub();
            console.log('✅ Data loaded from GitHub:', this.data.prices.length, 'points');
            return this.data;
        } catch (error) {
            console.error('❌ Error loading from GitHub:', error.message);
            // Fallback к симуляции если GitHub недоступен
            console.log('⚠️ Falling back to simulated data...');
            this.data = this.generateSimulatedData(2020);
            return this.data;
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Загружает и парсит CSV файл с вашего GitHub
     */
    async loadDataFromGitHub() {
        console.log(`📥 Fetching CSV from: ${this.csvUrl}`);
        
        try {
            const response = await fetch(this.csvUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText || csvText.length < 10) {
                throw new Error('CSV file is empty or too small');
            }
            
            console.log('📊 CSV loaded, parsing...');
            
            // Парсим CSV
            const rows = csvText.trim().split('\n');
            
            if (rows.length < 2) {
                throw new Error('CSV has no data rows');
            }
            
            // Определяем заголовки
            const headers = rows[0].split(',').map(h => h.trim());
            
            console.log('📋 CSV headers:', headers);
            
            // Ищем колонки с датами и ценами
            let dateIndex = -1;
            let priceIndex = -1;
            
            // Попробуем найти стандартные названия колонок
            headers.forEach((header, index) => {
                const lowerHeader = header.toLowerCase();
                if (lowerHeader.includes('date')) {
                    dateIndex = index;
                } else if (lowerHeader.includes('close') || 
                          lowerHeader.includes('price') || 
                          lowerHeader.includes('adj') ||
                          lowerHeader.includes('value')) {
                    priceIndex = index;
                }
            });
            
            // Если не нашли стандартные названия, используем первые две колонки
            if (dateIndex === -1) dateIndex = 0;
            if (priceIndex === -1) priceIndex = 1;
            
            console.log(`🔍 Using column ${dateIndex} for dates, column ${priceIndex} for prices`);
            
            const dates = [];
            const prices = [];
            
            // Парсим строки данных
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row.trim()) continue;
                
                const columns = row.split(',');
                
                if (columns.length > Math.max(dateIndex, priceIndex)) {
                    const dateStr = columns[dateIndex].trim();
                    const priceStr = columns[priceIndex].trim();
                    
                    const price = parseFloat(priceStr);
                    
                    // Проверяем валидность данных
                    if (!isNaN(price) && price > 0 && dateStr) {
                        dates.push(dateStr);
                        prices.push(price);
                    }
                }
            }
            
            if (dates.length === 0 || prices.length === 0) {
                throw new Error('No valid data found in CSV');
            }
            
            console.log(`✅ Parsed ${dates.length} data points`);
            console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
            console.log(`💰 Price range: $${Math.min(...prices).toFixed(2)} to $${Math.max(...prices).toFixed(2)}`);
            
            return {
                dates: dates,
                symbol: 'S&P 500 (Your GitHub Data)',
                prices: prices,
                source: 'GitHub CSV: ' + this.csvUrl
            };
            
        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            throw error;
        }
    }

    /**
     * Функция для симуляции данных (используется как fallback)
     */
    generateSimulatedData(startYear = 2020) {
        console.log('⚠️ Generating simulated data...');
        
        const currentYear = new Date().getFullYear();
        const years = currentYear - startYear + 1;
        const totalDays = years * 252;
        
        const dates = [];
        const prices = [];
        
        let price = 4000;
        let currentDate = new Date(startYear, 0, 1);
        
        for (let i = 0; i < totalDays; i++) {
            currentDate.setDate(currentDate.getDate() + 1);
            
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }
            
            const changePercent = (Math.random() - 0.5) * 0.04;
            price = price * (1 + changePercent);
            price = Math.max(price, 3500);
            
            dates.push(currentDate.toISOString().split('T')[0]);
            prices.push(price);
            
            if (prices.length >= 1000) break;
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 (Simulated)',
            prices: prices,
            source: 'Simulated Data (GitHub unavailable)'
        };
    }

    /**
     * Нормализация данных
     */
    normalizeData() {
        console.log('⚙️ Normalizing data...');
        
        if (!this.data || !this.data.prices) {
            throw new Error('No data loaded. Call fetchYahooFinanceData first.');
        }
        
        const prices = this.data.prices;
        
        this.minValue = Math.min(...prices);
        this.maxValue = Math.max(...prices);
        
        this.normalizedData = prices.map(p => 
            (p - this.minValue) / (this.maxValue - this.minValue)
        );
        
        this.returns = [];
        for (let i = 1; i < prices.length; i++) {
            this.returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        console.log('✅ Data normalized');
        console.log('📊 Min:', this.minValue.toFixed(2), 'Max:', this.maxValue.toFixed(2));
    }

    /**
     * Подготовка датасета
     */
    prepareDataset(sequenceLength = 60, predictionDays = 5, trainSplit = 0.8) {
        console.log('📦 Preparing dataset...');
        
        if (!this.normalizedData) {
            throw new Error('Data not normalized. Call normalizeData first.');
        }
        
        const totalSamples = this.normalizedData.length - sequenceLength - predictionDays;
        
        if (totalSamples <= 0) {
            throw new Error('Not enough data for training');
        }
        
        const samples = [];
        const labels = [];
        
        for (let i = 0; i < totalSamples; i++) {
            const input = this.normalizedData.slice(i, i + sequenceLength);
            const futureReturns = this.returns.slice(i + sequenceLength, i + sequenceLength + predictionDays);
            const output = futureReturns.map(ret => ret > 0 ? 1 : 0);
            
            samples.push(input);
            labels.push(output);
        }
        
        const splitIndex = Math.floor(samples.length * trainSplit);
        this.trainIndices = Array.from({length: splitIndex}, (_, i) => i);
        this.testIndices = Array.from({length: samples.length - splitIndex}, (_, i) => i + splitIndex);
        
        console.log('📊 Total samples:', samples.length);
        console.log('🎯 Train samples:', splitIndex);
        console.log('🧪 Test samples:', samples.length - splitIndex);
        
        this.X_train = tf.tensor3d(
            this.trainIndices.map(idx => [samples[idx]]),
            [splitIndex, 1, sequenceLength]
        );
        
        this.y_train = tf.tensor2d(
            this.trainIndices.map(idx => labels[idx]),
            [splitIndex, predictionDays]
        );
        
        this.X_test = tf.tensor3d(
            this.testIndices.map(idx => [samples[idx]]),
            [samples.length - splitIndex, 1, sequenceLength]
        );
        
        this.y_test = tf.tensor2d(
            this.testIndices.map(idx => labels[idx]),
            [samples.length - splitIndex, predictionDays]
        );
        
        console.log('✅ Dataset prepared');
        console.log('📐 X_train shape:', this.X_train.shape);
        console.log('📐 y_train shape:', this.y_train.shape);
    }

    /**
     * Получение статистики
     */
    getStatistics() {
        console.log('📈 Getting statistics...');
        
        if (!this.data || !this.data.prices) {
            console.log('No data available for statistics');
            return {
                symbol: 'No data loaded',
                numDays: 0,
                currentPrice: 'N/A',
                dateRange: { start: 'N/A', end: 'N/A' },
                priceRange: { min: 'N/A', max: 'N/A' },
                returns: {
                    average: 'N/A',
                    positiveDays: 0,
                    totalDays: 0,
                    positiveRate: '0%'
                },
                trainSamples: 0,
                testSamples: 0,
                normalized: false,
                source: 'No data'
            };
        }
        
        const prices = this.data.prices || [];
        const returns = this.returns || [];
        const dates = this.data.dates || [];
        
        let totalReturn = 0;
        let positiveDays = 0;
        
        for (const ret of returns) {
            if (typeof ret === 'number') {
                totalReturn += ret;
                if (ret > 0) positiveDays++;
            }
        }
        
        const avgReturn = returns.length > 0 ? totalReturn / returns.length : 0;
        const positiveRate = returns.length > 0 ? (positiveDays / returns.length) * 100 : 0;
        
        const currentPrice = prices.length > 0 ? '$' + prices[prices.length - 1].toFixed(2) : 'N/A';
        const minPrice = prices.length > 0 ? '$' + Math.min(...prices).toFixed(2) : 'N/A';
        const maxPrice = prices.length > 0 ? '$' + Math.max(...prices).toFixed(2) : 'N/A';
        const startDate = dates.length > 0 ? dates[0] : 'N/A';
        const endDate = dates.length > 0 ? dates[dates.length - 1] : 'N/A';
        
        return {
            symbol: this.data.symbol || 'S&P 500',
            source: this.data.source || 'Unknown',
            numDays: prices.length || 0,
            currentPrice: currentPrice,
            dateRange: {
                start: startDate,
                end: endDate
            },
            priceRange: {
                min: minPrice,
                max: maxPrice
            },
            returns: {
                average: (avgReturn * 100).toFixed(2) + '%',
                positiveDays: positiveDays,
                totalDays: returns.length,
                positiveRate: positiveRate.toFixed(1) + '%'
            },
            trainSamples: this.trainIndices ? this.trainIndices.length : 0,
            testSamples: this.testIndices ? this.testIndices.length : 0,
            normalized: this.normalizedData !== null
        };
    }

    /**
     * Получение последней последовательности для предсказания
     */
    getLatestSequence(sequenceLength = 60) {
        if (!this.normalizedData || this.normalizedData.length < sequenceLength) {
            throw new Error('Not enough normalized data for prediction');
        }
        
        const latestSequence = this.normalizedData.slice(-sequenceLength);
        return tf.tensor3d([[latestSequence]], [1, 1, sequenceLength]);
    }

    /**
     * Получение данных цен для визуализации
     */
    getPrice
