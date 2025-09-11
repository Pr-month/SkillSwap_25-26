import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
// import { User } from '../../users/entities/user.entity';

@Entity({ name: 'skills' })
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

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

  // @ManyToOne(() => User, user => user.skills)
  // owner: User;
}
