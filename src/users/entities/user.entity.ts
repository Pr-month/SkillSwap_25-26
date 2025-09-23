import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Gender, UserRole } from '../enums';
import { Skill } from '../../skills/entities/skill.entity';
// import { Category } from './category.entity';

@Entity('users')
export class User {
  // Константы для селектов полей (статические для переиспользования)
  static readonly SELECT_FIELDS: (keyof User)[] = [
    'id',
    'name',
    'email',
    'about',
    'birthdate',
    'city',
    'gender',
    'avatar',
    'role',
  ];

  static readonly SELECT_WITH_PASSWORD: (keyof User)[] = [
    ...User.SELECT_FIELDS,
    'password',
  ];
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  @Exclude() // Исключаем пароль из всех ответов API
  password: string;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({ type: 'date', nullable: true })
  birthdate: Date;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  // @ManyToMany(() => Skill, skill => skill.owners, { eager: true })
  // skills: Skill[];

  // @ManyToMany(() => Category, category => category.learners, { eager: true })
  // wantToLearn: Category[];

  @ManyToMany(() => Skill, (skill) => skill.favoritedBy)
  @JoinTable({
    name: 'user_favorite_skills',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'skill_id',
      referencedColumnName: 'id',
    },
  })
  favoriteSkills: Skill[];

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;
}
