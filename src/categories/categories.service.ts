import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from './entities/categories.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { parent: IsNull() },
      relations: ['children'],
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
        // сброс родителя
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

  async removeByID(id: string): Promise<{ message: string }> {
    const category = await this.categoriesRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }

    await this.categoriesRepository.delete(id);

    return { message: `Категория с ID ${id} успешно удалена` };
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, parentId } = createCategoryDto;

    const categoryData: Partial<Category> = { name };

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
