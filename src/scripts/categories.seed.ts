import { AppDataSource } from '../config/database.config';
import { Category } from '../categories/entities/categories.entity';
import { CategoriesData } from './categories.data';

async function seed() {
  try {
    console.log('🌱 Инициализация подключения к базе данных...');
    await AppDataSource.initialize();

    const categoryRepo = AppDataSource.getRepository(Category);

    // Проверяем, есть ли уже категории в базе данных
    const existing = await categoryRepo.count();
    if (existing > 0) {
      console.log(
        '📋 Категории уже существуют в базе данных. Пропускаем сидинг.',
      );
      await AppDataSource.destroy();
      return;
    }

    console.log('📝 Создание категорий...');

    // Создаем родительские категории
    for (const categoryData of CategoriesData) {
      const parentCategory = new Category();
      parentCategory.name = categoryData.name;

      const savedParent = await categoryRepo.save(parentCategory);
      console.log(`✅ Создана родительская категория: ${savedParent.name}`);

      // Создаем дочерние категории
      for (const childName of categoryData.children) {
        const childCategory = new Category();
        childCategory.name = childName;
        childCategory.parent = savedParent;

        const savedChild = await categoryRepo.save(childCategory);
        console.log(`  ✅ Создана дочерняя категория: ${savedChild.name}`);
      }
    }

    console.log('🎉 Сидинг категорий успешно завершен!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Ошибка при выполнении сидинга категорий:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void seed();
