import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { Skill } from './entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
  ) { }

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const skill = this.skillRepository.create(createSkillDto);
    return this.skillRepository.save(skill);
  }

  findAll() {
    return this.skillRepository.find({ relations: ['owner'] });
  }

  async findOne(id: number) {
    return this.skillRepository.findOneOrFail({
      where: { id },
      relations: ['owner'],
    });
  }

  async update(id: string, updateSkillDto: UpdateSkillDto) {
    const skillId = parseInt(id, 10);
    const skill = await this.skillRepository.findOneBy({ id: skillId });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    Object.assign(skill, updateSkillDto);
    return this.skillRepository.save(skill);
  }

  async remove(id: number, userId: string) {
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
}
