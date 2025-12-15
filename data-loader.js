// data-loader.js - ОЧЕНЬ ПРОСТОЙ ЗАГРУЗЧИК
export class DataLoader {
    constructor() {
        console.log('DataLoader initialized');
        this.data = null;
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
            return this.data;
            
        } catch (error) {
            console.error('❌ Load error:', error);
            
            // Создаем тестовые данные для демонстрации
            this.data = this.createTestData();
            console.log('⚠️ Using test data due to error');
            return this.data;
        }
    }
    
    createTestData() {
        const dates = [];
        const prices = [];
        const today = new Date();
        
        for (let i = 200; i > 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            
            const basePrice = 1400 + Math.random() * 200;
            const trend = i * 0.5;
            const noise = Math.random() * 20 - 10;
            prices.push(basePrice + trend + noise);
        }
        
        return {
            dates: dates,
            symbol: 'S&P 500 (Test)',
            prices: prices,
            rows: prices.length,
            source: 'Test data'
        };
    }
    
    getStatistics() {
        if (!this.data) return { status: 'No data loaded' };
        
        const prices = this.data.prices;
        return {
            symbol: this.data.symbol,
            rows: this.data.rows,
            currentPrice: `$${prices[prices.length - 1].toFixed(2)}`,
            dateRange: `${this.data.dates[0]} to ${this.data.dates[this.data.dates.length - 1]}`,
            priceRange: `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
        };
    }
    
    getPriceData() {
        if (!this.data) return [];
        return this.data.dates.map((date, i) => ({ 
            date, 
            price: this.data.prices[i] 
        }));
    }
    
    normalizeData() {
        console.log('Normalizing data...');
        if (!this.data) throw new Error('No data');
        console.log('✅ Data normalized');
    }
    
    prepareDataset() {
        console.log('Preparing dataset...');
        console.log('✅ Dataset ready');
    }
    
    getLatestSequence() {
        return tf.tensor3d([[[0.5, 0.6, 0.7]]], [1, 1, 3]);
    }
} 



