import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;
}

export type JwtUser = Pick<User, 'id' | 'email' | 'name'>;

export interface RequestWithUser extends Request {
  user: JwtUser;
}
