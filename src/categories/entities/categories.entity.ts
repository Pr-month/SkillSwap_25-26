import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    name: string

    @ManyToOne(() => Category, category => category.children, {nullable: true})
    parent: Category

    @OneToMany(() => Category, category => category.parent)
    children: Category[]
}