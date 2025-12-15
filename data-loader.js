// data-loader.js - ОБНОВЛЕННЫЙ ДЛЯ ПРЕДСКАЗАНИЯ ДОХОДНОСТИ
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized for returns prediction');
        this.data = null;
        this.normalizedData = null;
        this.returns = null;
        this.X_all = null;
        this.y_all = null;
        this.X_train = null;
        this.y_train = null;
        this.X_val = null;
        this.y_val = null;
        this.X_test = null;
        this.y_test = null;
        
        this.csvUrl = 'https://raw.githubusercontent.com/buschevapoly-del/again/main/my_data.csv';
    }

    async fetchYahooFinanceData() {
        console.log('Loading data from GitHub...');
        
        try {
            const response = await fetch(this.csvUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const text = await response.text();
            console.log('CSV content (first 500 chars):', text.substring(0, 500));
            
            const rows = text.trim().split('\n');
            const dates = [];
            const prices = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                
                const cols = row.split(';');
                if (cols.length >= 2) {
                    const date = cols[0].trim();
                    const price = parseFloat(cols[1].trim());
                    
                    if (!isNaN(price) && price > 0) {
                        dates.push(date);
                        prices.push(price);
                    }
                }
            }
            
            this.data = {
                dates: dates,
                symbol: 'S&P 500',
                prices: prices,
                rows: prices.length
            };
            
            console.log('✅ Data loaded:', this.data.rows, 'rows');
            this.calculateReturns();
            return this.data;
            
        } catch (error) {
            console.error('❌ Load error:', error);
            
            // Создаем тестовые данные для демонстрации
            this.data = this.createTestData();
            this.calculateReturns();
            console.log('⚠️ Using test data due to error');
            return this.data;
        }
    }
    
    createTestData() {
        const dates = [];
        const prices = [];
        const today = new Date();
        const numPoints = 500; // Больше данных для обучения
        
        // Создаем реалистичные данные с трендом и волатильностью
        let price = 1400;
        
        for (let i = numPoints; i > 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            
            // Добавляем тренд + случайную волатильность
            const dailyReturn = 0.0002 + (Math.random() - 0.5) * 0.02;
            price = price * (1 + dailyReturn);
            prices.push(price);
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 (Test)',
            prices: prices,
            rows: prices.length,
            source: 'Test data'
        };
    }
    
    calculateReturns() {
        if (!this.data || this.data.prices.length < 2) {
            throw new Error('Need at least 2 price points');
        }
        
        const prices = this.data.prices;
        this.returns = [];
        
        // Рассчитываем логарифмические доходности (более стабильны)
        for (let i = 1; i < prices.length; i++) {
            const ret = Math.log(prices[i] / prices[i-1]);
            this.returns.push(ret);
        }
        
        console.log('Returns calculated:', this.returns.length);
        console.log('Average return:', this.returns.reduce((a,b) => a+b, 0)/this.returns.length);
    }
    
    prepareDatasetForReturnsPrediction(lookback = 60, horizon = 5) {
        if (!this.returns || this.returns.length < lookback + horizon) {
            throw new Error(`Need at least ${lookback + horizon} returns points`);
        }
        
        console.log(`Preparing dataset: lookback=${lookback}, horizon=${horizon}`);
        
        const X = [];
        const y = [];
        
        // Создаем последовательности для предсказания суммарной доходности на horizon дней вперед
        for (let i = 0; i <= this.returns.length - lookback - horizon; i++) {
            // Вход: последовательность доходностей за lookback дней
            const x_seq = this.returns.slice(i, i + lookback);
            
            // Цель: суммарная доходность на следующие horizon дней
            const future_returns = this.returns.slice(i + lookback, i + lookback + horizon);
            const y_target = future_returns.reduce((sum, ret) => sum + ret, 0);
            
            X.push(x_seq);
            y.push(y_target);
        }
        
        console.log(`Created ${X.length} sequences`);
        
        // Разделяем на train/val/test (70/15/15)
        const n_samples = X.length;
        const train_size = Math.floor(n_samples * 0.7);
        const val_size = Math.floor(n_samples * 0.15);
        
        // Конвертируем в тензоры TensorFlow.js
        this.X_all = tf.tensor3d(X, [X.length, 1, lookback]);
        this.y_all = tf.tensor2d(y, [y.length, 1]);
        
        this.X_train = this.X_all.slice([0, 0, 0], [train_size, 1, lookback]);
        this.y_train = this.y_all.slice([0, 0], [train_size, 1]);
        
        this.X_val = this.X_all.slice([train_size, 0, 0], [val_size, 1, lookback]);
        this.y_val = this.y_all.slice([train_size, 0], [val_size, 1]);
        
        this.X_test = this.X_all.slice([train_size + val_size, 0, 0], 
                                      [n_samples - train_size - val_size, 1, lookback]);
        this.y_test = this.y_all.slice([train_size + val_size, 0], 
                                      [n_samples - train_size - val_size, 1]);
        
        console.log('Dataset prepared:');
        console.log('Train:', this.X_train.shape, this.y_train.shape);
        console.log('Val:', this.X_val.shape, this.y_val.shape);
        console.log('Test:', this.X_test.shape, this.y_test.shape);
        
        return {
            X_train: this.X_train,
            y_train: this.y_train,
            X_val: this.X_val,
            y_val: this.y_val,
            X_test: this.X_test,
            y_test: this.y_test,
            lookback: lookback,
            horizon: horizon
        };
    }
    
    getLatestSequence(lookback = 60) {
        if (!this.returns || this.returns.length < lookback) {
            throw new Error(`Need at least ${lookback} returns for prediction`);
        }
        
        const latest = this.returns.slice(-lookback);
        return tf.tensor3d([latest], [1, 1, lookback]);
    }
    
    getStatistics() {
        if (!this.data) return { status: 'No data loaded' };
        
        const prices = this.data.prices;
        const returns = this.returns || [];
        
        const stats = {
            symbol: this.data.symbol,
            rows: this.data.rows,
            currentPrice: `$${prices[prices.length - 1].toFixed(2)}`,
            dateRange: `${this.data.dates[0]} to ${this.data.dates[this.data.dates.length - 1]}`,
            priceRange: `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
        };
        
        if (returns.length > 0) {
            const positiveReturns = returns.filter(r => r > 0).length;
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const vol = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
            
            stats.returns = {
                positiveDays: `${positiveReturns}/${returns.length}`,
                positiveRate: `${(positiveReturns / returns.length * 100).toFixed(1)}%`,
                avgDailyReturn: `${(avgReturn * 100).toFixed(3)}%`,
                dailyVolatility: `${(vol * 100).toFixed(2)}%`,
                sharpeRatio: returns.length > 0 ? (avgReturn / vol * Math.sqrt(252)).toFixed(2) : 'N/A'
            };
        }
        
        return stats;
    }
    
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
        
        if (result.length === 0 || result[result.length - 1].date !== dates[dates.length - 1]) {
            result.push({ 
                date: dates[dates.length - 1], 
                price: prices[prices.length - 1],
                index: dates.length - 1 
            });
        }
        
        return result;
    }
}
