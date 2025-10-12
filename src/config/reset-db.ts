import { AppDataSource } from '../config/database.config';

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    // Инициализируем подключение
    await AppDataSource.initialize();
    
    // Сбрасываем всю схему
    await AppDataSource.dropDatabase();
    
    // Синхронизируем схему заново (создаем таблицы)
    await AppDataSource.synchronize();
    
    console.log('Database reset successfully!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();