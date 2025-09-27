import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  export enum NotificationType {
    REQUEST_CREATED = 'request_created',
    REQUEST_ACCEPTED = 'request_accepted',
    REQUEST_REJECTED = 'request_rejected',
    REQUEST_CANCELLED = 'request_cancelled',
    REQUEST_COMPLETED = 'request_completed',
    SKILL_FAVORITED = 'skill_favorited',
    SKILL_UNFAVORITED = 'skill_unfavorited',
  }
  
  @Entity('notifications')
  export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
  
    @Column({
      type: 'enum',
      enum: NotificationType,
    })
    type: NotificationType;
  
    @Column({ type: 'varchar', length: 255 })
    title: string;
  
    @Column({ type: 'text' })
    message: string;
  
    @Column({ type: 'boolean', default: false })
    isRead: boolean;
  
    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, any>;
  
    @CreateDateColumn()
    createdAt: Date;
  }