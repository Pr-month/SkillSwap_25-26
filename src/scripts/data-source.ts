import { DataSource } from 'typeorm';
import { Category } from '../categories/entities/categories.entity';
import { User } from '../users/entities/user.entity';
import { Skill } from '../skills/entities/skill.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { FileEntity } from '../files/entities/file.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'skillswap',
  entities: [Category, User, Skill, RefreshToken, FileEntity],
  synchronize: false, // Важно: отключаем синхронизацию в скриптах
});
