import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Category } from 'src/categories/entities/categories.entity';
import { Skill } from 'src/skills/entities/skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Category, Skill])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
