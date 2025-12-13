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
        
        // Улучшенный парсинг CSV с учетом кавычек и разных форматов
        const rows = this.parseCSV(csvText);
        
        if (rows.length < 2) {
            throw new Error('CSV has insufficient data (less than 2 rows)');
        }
        
        const headers = rows[0];
        console.log('CSV headers found:', headers);
        console.log('Number of rows:', rows.length);
        
        // Автоматически определяем колонки с улучшенной логикой
        let dateCol = -1;
        let priceCol = -1;
        
        headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase().trim();
            console.log(`Header ${index}: "${header}" -> "${lowerHeader}"`);
            
            // Поиск колонки с датой
            if (dateCol === -1 && (
                lowerHeader.includes('date') || 
                lowerHeader.includes('time') ||
                lowerHeader.includes('day') ||
                lowerHeader.includes('timestamp')
            )) {
                dateCol = index;
                console.log(`Found date column: ${index} - "${header}"`);
            }
            
            // Поиск колонки с ценой
            if (priceCol === -1 && (
                lowerHeader.includes('close') || 
                lowerHeader.includes('price') || 
                lowerHeader.includes('value') || 
                lowerHeader.includes('adj') ||
                lowerHeader.includes('last') ||
                lowerHeader.includes('settle') ||
                lowerHeader.includes('rate') ||
                lowerHeader.includes('amount')
            )) {
                priceCol = index;
                console.log(`Found price column: ${index} - "${header}"`);
            }
        });
        
        // Fallback логика
        if (dateCol === -1) {
            // Пробуем найти колонку с датой по формату (YYYY-MM-DD или подобное)
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] && this.looksLikeDateColumn(rows, i)) {
                    dateCol = i;
                    console.log(`Fallback: Using column ${i} as date (looks like date)`);
                    break;
                }
            }
            // Если всё еще не нашли, используем первую колонку
            if (dateCol === -1) {
                dateCol = 0;
                console.log(`Fallback: Using first column (index 0) as date`);
            }
        }
        
        if (priceCol === -1) {
            // Пробуем найти числовую колонку
            for (let i = 0; i < headers.length; i++) {
                if (i !== dateCol && this.looksLikeNumericColumn(rows, i)) {
                    priceCol = i;
                    console.log(`Fallback: Using column ${i} as price (looks numeric)`);
                    break;
                }
            }
            // Если всё еще не нашли, используем вторую колонку
            if (priceCol === -1) {
                priceCol = dateCol === 0 ? 1 : 0;
                console.log(`Fallback: Using column ${priceCol} as price`);
            }
        }
        
        console.log(`Using date column: ${dateCol}, price column: ${priceCol}`);
        
        const dates = [];
        const prices = [];
        let skippedRows = 0;
        
        for (let i = 1; i
