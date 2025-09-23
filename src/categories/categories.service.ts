import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/categories.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent'],
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Категория не может быть родителем самой себя',
        );
      }
      if (dto.parentId === (null as any)) {
        // Сбросить родителя
        // Приведение типов для явного допуска null без валидации
        category.parent = null as any;
      } else {
        const parent = await this.categoriesRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new BadRequestException('Родительская категория не найдена');
        }
        category.parent = parent;
      }
    }

    await this.categoriesRepository.save(category);
    return category;
  }
}
