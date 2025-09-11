import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Gender, UserRole } from '../enums';
// import { Skill } from './skill.entity';
// import { Category } from './category.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column({ type: 'date', nullable: true })
  birthdate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  // @ManyToMany(() => Skill, skill => skill.owners, { eager: true })
  // skills: Skill[];

  // @ManyToMany(() => Category, category => category.learners, { eager: true })
  // wantToLearn: Category[];

  // @ManyToMany(() => Skill, { eager: true })
  // favoriteSkills: Skill[];

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;
}
