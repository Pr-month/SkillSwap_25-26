import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Gender } from '../../users/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Имя пользователя' })
  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя обязательно' })
  name: string;

  @ApiProperty({ description: 'Email пользователя' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ description: 'Пароль пользователя (минимум 6 символов)' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @ApiProperty({ description: 'Информация о пользователе' })
  @IsNotEmpty()
  @IsString()
  about: string;

  @ApiProperty({ description: 'Дата рождения пользователя' })
  @IsNotEmpty()
  @IsDateString()
  birthdate: Date;

  @ApiProperty({ description: 'Город пользователя' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Пол пользователя' })
  @IsOptional()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: 'Аватар пользователя' })
  @IsNotEmpty()
  @IsString()
  avatar: string;

  @ApiPropertyOptional({
    description: 'ID категорий навыков пользователя',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  categoryIds?: string[];
}
