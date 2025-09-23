import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/categories/entities/categories.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async removeByID(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }

    await this.categoryRepository.delete(id);

    return { message: `Категория с ID ${id} успешно удалена` };
  }
}
