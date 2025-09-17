import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Название файла должно быть всегда уникальным (будем генерировать с  помощью UUID v4)
  @Column({ unique: true })
  filename: string;

  // Оригинальное название (может пригодиться в UX)
  @Column()
  originalName: string;

  @Column()
  path: string;

  @Column()
  publicUrl: string;

  @Column()
  mimeType: string;

  // Разммер файла (может пригодиться для UX или для мониторинга)
  @Column()
  size: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
