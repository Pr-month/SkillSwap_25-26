import { Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { UsersModule } from '../users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/categories/entities/categories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, User, Category])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
