import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
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
    about: string;

    @Column({ type: 'date', nullable: true })
    birthdate: Date;

    @Column({ type: 'varchar', nullable: true })
    city: string;

    @Column({ type: 'varchar', nullable: true })
    gender: string;

    @Column({ type: 'varchar', nullable: true })
    avatar: string;

    // @ManyToMany(() => Skill, skill => skill.owners, { eager: true })
    // skills: Skill[];

    // @ManyToMany(() => Category, category => category.learners, { eager: true })
    // wantToLearn: Category[];

    // @ManyToMany(() => Skill, { eager: true })
    // favoriteSkills: Skill[];

    @Column({ type: 'enum', enum: ['USER', 'ADMIN'], default: 'USER' })
    role: 'USER' | 'ADMIN';

    @Column({ type: 'text', nullable: true })
    refreshToken: string;
}
