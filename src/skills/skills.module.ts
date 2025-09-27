import { Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/categories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, User, Category])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
