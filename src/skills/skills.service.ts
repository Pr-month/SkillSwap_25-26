import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { QueryBuilder, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
  ) {}

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const skill = this.skillRepository.create(createSkillDto);
    return this.skillRepository.save(skill);
  }

  findAll() {
    return `This action returns all skills`;
  }

  findOne(id: number) {
    return `This action returns a #${id} skill`;
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

  remove(id: number) {
    return `This action removes a #${id} skill`;
  }

  async getSkills(
    page: number,
    limit: number,
    search: string,
    category: string,
  ): Promise<[Skill[], number]> {
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
