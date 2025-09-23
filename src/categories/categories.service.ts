import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/categories.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepositoryy: Repository<Category>,
  ) {}

  async removeByID(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepositoryy.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }

    await this.categoryRepositoryy.delete(id);

    return { message: `Категория с ID ${id} успешно удалена` };
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, parentId } = createCategoryDto;

    // Создаём объект категории
    const categoryData: Partial<Category> = { name };

    // Если указан parentId, находим родительскую категорию
    if (parentId) {
      const parent = await this.categoryRepositoryy.findOne({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Родительская категория не найдена');
      }

      categoryData.parent = parent;
    }

    const category = this.categoryRepositoryy.create(categoryData);
    return await this.categoryRepositoryy.save(category);
  }
}
