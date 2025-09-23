import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, parentId } = createCategoryDto;

    // Создаём объект категории
    const categoryData: Partial<Category> = { name };

    // Если указан parentId, находим родительскую категорию
    if (parentId) {
      const parent = await this.categoriesRepository.findOne({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Родительская категория не найдена');
      }

      categoryData.parent = parent;
    }

    const category = this.categoriesRepository.create(categoryData);
    return await this.categoriesRepository.save(category);
  }
}
