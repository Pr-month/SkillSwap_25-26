import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'skills' })
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  // @ManyToOne(() => Category, category => category.skills)
  // category: Category;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  images: string[];

  @ManyToOne(() => User)
  owner: User;

  @ManyToMany(() => User, (user) => user.favoriteSkills)
  favoritedBy: User[];
}
