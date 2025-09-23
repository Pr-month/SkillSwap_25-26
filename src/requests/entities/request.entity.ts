import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { RequestStatus } from '../../users/enums';

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  sender: User;

  @ManyToOne(() => User)
  receiver: User;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @ManyToOne(() => Skill)
  offeredSkill: Skill;

  @ManyToOne(() => Skill)
  requestedSkill: Skill;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;
}
