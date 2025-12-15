// data-loader.js
class DataLoader {
    constructor() {
        console.log('✅ DataLoader created');
        this.csvUrl = 'https://raw.githubusercontent.com/buschevapoly-del/again/main/my_data.csv';
        this.data = null;
        this.returns = [];
        this.X_train = null;
        this.y_train = null;
        this.X_test = null;
        this.y_test = null;
    }

    async loadData() {
        console.log('🚀 Loading data from:', this.csvUrl);
        
        try {
            const response = await fetch(this.csvUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const text = await response.text();
            console.log('📄 Raw text (first 200 chars):', text.substring(0, 200));
            
            const rows = text.trim().split('\n');
            const dates = [];
            const prices = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                
                // Пробуем разделить по ; или ,
                let parts;
                if (row.includes(';')) {
                    parts = row.split(';');
                } else {
                    parts = row.split(',');
                }
                
                if (parts.length >= 2) {
                    const date = parts[0].trim();
                    const price = parseFloat(parts[1].trim());
                    
                    if (!isNaN(price) && price > 0) {
                        dates.push(date);
                        prices.push(price);
                    }
                }
            }
            
            if (prices.length === 0) {
                throw new Error('No valid price data found in CSV');
            }
            
            this.data = { 
                dates, 
                prices, 
                symbol: 'S&P 500',
                source: this.csvUrl
            };
            
            console.log(`✅ Loaded ${prices.length} data points`);
            
            // Рассчитываем доходности
            this.calculateReturns();
            
            return this.data;
            
        } catch (error) {
            console.error('❌ Load error:', error);
            return this.createTestData();
        }
    }

    calculateReturns() {
        if (!this.data || this.data.prices.length < 2) return;
        
        this.returns = [];
        for (let i = 1; i < this.data.prices.length; i++) {
            const ret = (this.data.prices[i] - this.data.prices[i-1]) / this.data.prices[i-1];
            this.returns.push(ret);
        }
        console.log(`📊 Calculated ${this.returns.length} returns`);
    }

    createTestData() {
        console.log('⚠️ Creating test data');
        
        const dates = [];
        const prices = [];
        let price = 1400;
        
        for (let i = 0; i < 200; i++) {
            const date = new Date(Date.now() - (200 - i) * 24 * 3600000);
            dates.push(date.toISOString().slice(0, 10));
            
            // Добавляем тренд и шум
            price = price * (1 + (Math.random() - 0.5) * 0.02 + 0.0002);
            prices.push(price);
        }
        
        this.data = { 
            dates, 
            prices, 
            symbol: 'S&P 500 (Test Data)',
            source: 'Test data (GitHub failed)' 
        };
        
        this.calculateReturns();
        
        return this.data;
    }

    prepareForTraining(lookback = 60, horizon = 5) {
        if (!this.returns || this.returns.length < lookback + horizon) {
            throw new Error(`Need at least ${lookback + horizon} returns`);
        }
        
        console.log(`🔄 Preparing sequences (lookback=${lookback}, horizon=${horizon})`);
        
        const X = [];
        const y = [];
        
        for (let i = 0; i <= this.returns.length - lookback - horizon; i++) {
            X.push(this.returns.slice(i, i + lookback));
            
            // Сумма доходностей на horizon дней вперед
            const futureSum = this.returns
                .slice(i + lookback, i + lookback + horizon)
                .reduce((sum, r) => sum + r, 0);
            y.push(futureSum);
        }
        
        console.log(`✅ Created ${X.length} sequences`);
        
        // Разделяем данные (80% train, 20% test)
        const split = Math.floor(X.length * 0.8);
        
        // Конвертируем в тензоры TensorFlow.js
        this.X_train = tf.tensor3d(
            X.slice(0, split).map(x => [x]),
            [split, 1, lookback]
        );
        this.y_train = tf.tensor2d(
            y.slice(0, split),
            [split, 1]
        );
        
        this.X_test = tf.tensor3d(
            X.slice(split).map(x => [x]),
            [X.length - split, 1, lookback]
        );
        this.y_test = tf.tensor2d(
            y.slice(split),
            [X.length - split, 1]
        );
        
        console.log(`📊 Train: ${split} samples, Test: ${X.length - split} samples`);
        
        return {
            X_train: this.X_train,
            y_train: this.y_train,
            X_test: this.X_test,
            y_test: this.y_test
        };
    }

    getLatestSequence(lookback = 60) {
        if (!this.returns || this.returns.length < lookback) {
            throw new Error('Not enough data');
        }
        
        const latest = this.returns.slice(-lookback);
        return tf.tensor3d([latest], [1, 1, lookback]);
    }

    getStats() {
        if (!this.data) return { status: 'No data loaded' };
        
        const prices = this.data.prices;
        const returns = this.returns || [];
        
        let stats = {
            symbol: this.data.symbol,
            points: prices.length,
            current: `$${prices[prices.length - 1].toFixed(2)}`,
            min: `$${Math.min(...prices).toFixed(2)}`,
            max: `$${Math.max(...prices).toFixed(2)}`,
            dateRange: `${this.data.dates[0]} to ${this.data.dates[this.data.dates.length - 1]}`
        };
        
        if (returns.length > 0) {
            const positive = returns.filter(r => r > 0).length;
            const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
            
            stats.returns = {
                positive: `${positive}/${returns.length}`,
                rate: `${(positive / returns.length * 100).toFixed(1)}%`,
                avg: `${(avg * 100).toFixed(3)}%`
            };
        }
        
        return stats;
    }

    getChartData(limit = 100) {
        if (!this.data) return [];
        
        const { dates, prices } = this.data;
        
        // Если точек меньше лимита, возвращаем все
        if (dates.length <= limit) {
            return dates.map((date, i) => ({
                date: date,
                price: prices[i]
            }));
        }
        
        // Берем каждую N-ую точку
        const step = Math.ceil(dates.length / limit);
        const result = [];
        
        for (let i = 0; i < dates.length; i += step) {
            result.push({
                date: dates[i],
                price: prices[i]
            });
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
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataLoader };
} else {
    window.DataLoader = DataLoader;
}
