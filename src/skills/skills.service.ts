import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
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
}
