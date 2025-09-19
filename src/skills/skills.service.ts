import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { QueryBuilder, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Skill } from './entities/skill.entity';
import { GetSkillsDto } from './dto/get-skills.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const skill = this.skillRepository.create(createSkillDto);
    return this.skillRepository.save(skill);
  }

  async findOne(id: string) {
    return this.skillRepository.findOneOrFail({
      where: { id },
      relations: ['owner'],
    });
  }

  async update(id: string, updateSkillDto: UpdateSkillDto) {
    const skill = await this.skillRepository.findOneBy({ id });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    Object.assign(skill, updateSkillDto);
    return this.skillRepository.save(skill);
  }

  async remove(id: string, userId: string) {
    // Получаем навык с информацией о владельце
    const skill = await this.findOne(id);

    // Проверяем, принадлежит ли навык пользователю
    if (skill.owner.id !== userId) {
      throw new ForbiddenException('У вас нет прав на удаление этого навыка');
    }

    // Удаляем изображения из файловой системы
    this.deleteSkillImages(skill.images);

    // Удаляем запись из базы данных
    const result = await this.skillRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Навык с ID ${id} не найден`);
    }

    return { message: `Навык успешно удален` };
  }

  async addToFavorites(
    skillId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Проверяем существование навыка
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });
    if (!skill) {
      throw new NotFoundException(`Навык с ID ${skillId} не найден`);
    }

    // Получаем пользователя с избранными навыками
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['favoriteSkills'],
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, есть ли уже навык в избранном
    const isAlreadyFavorite = user.favoriteSkills.some(
      (favSkill) => favSkill.id === skillId,
    );

    if (isAlreadyFavorite) {
      throw new ConflictException('Навык уже находится в избранном');
    }

    // Добавляем навык в избранное
    user.favoriteSkills.push(skill);
    await this.userRepository.save(user);

    return { message: 'Навык успешно добавлен в избранное' };
  }
  
  /**
   * Удаляет изображения навыка из файловой системы
   */
  private deleteSkillImages(images: string[]): void {
    if (!images || images.length === 0) {
      return;
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    for (const imagePath of images) {
      if (!imagePath) continue;

      try {
        // Получаем только имя файла из пути
        const filename = path.basename(imagePath);
        const fullPath = path.join(uploadsDir, filename);

        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Файл успешно удален: ${fullPath}`);
        } else {
          console.log(`Файл не найден: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Ошибка при удалении файла ${imagePath}:`, error);
      }
    }
  }

  async getSkills({
    page,
    limit,
    search,
    category,
  }: GetSkillsDto): Promise<[Skill[], number]> {
    const skip = (page - 1) * limit;

    return await this.skillRepository
      .createQueryBuilder('skill')
      .leftJoinAndSelect('skill.category', 'category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where(() => {
        if (search) {
          return this.buildSearchCondition(search);
        }
      })
      .andWhere(() => {
        if (category) {
          return this.buildCategoryCondition(category);
        }
      })
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  private buildSearchCondition(search: string): QueryBuilder<Skill> {
    const queryBuilder = this.skillRepository.createQueryBuilder('skill');

    if (search) {
      queryBuilder
        .where('LOWER(skill.title) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        })
        .orWhere('LOWER(category.name) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        })
        .orWhere('LOWER(parent.name) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
    }

    return queryBuilder;
  }

  private buildCategoryCondition(category: string): QueryBuilder<Skill> {
    const queryBuilder = this.skillRepository.createQueryBuilder('skill');

    if (category) {
      queryBuilder
        .where('category.name = :category', { category })
        .orWhere('parent.name = :category', { category });
    }

    return queryBuilder;
  }
}
