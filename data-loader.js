// Инициализация
const loader = new DataLoader();

// ДЕБАГ - посмотрим что в файле
await loader.debugFile();

// Загрузка данных
try {
    await loader.fetchYahooFinanceData();
    
    // Показать статистику
    const stats = loader.getStatistics();
    console.log('STATISTICS:', stats);
    
    // Нормализация
    loader.normalizeData();
    
    // Подготовка данных
    loader.prepareDataset(20, 2, 0.8);
    
    console.log('✅ Everything loaded successfully!');
    
} catch (error) {
    console.error('Main error:', error);
    
    // Все равно создаем тестовые данные
    loader.createTestData();
    loader.normalizeData();
    loader.prepareDataset(20, 2, 0.8);
}
