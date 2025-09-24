import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Gender } from 'src/users/enums';

export class RegisterDto {
  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя обязательно' })
  name: string;

  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @IsNotEmpty()
  @IsString()
  about: string;

  @IsNotEmpty()
  @IsDateString()
  birthdate: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsNotEmpty()
  @IsString()
  avatar: string;
}
