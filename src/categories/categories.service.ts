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

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

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
