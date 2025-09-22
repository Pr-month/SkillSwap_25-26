// Временно отключены декораторы валидации из-за проблем с установкой class-validator
// import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Gender } from '../enums';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  about: string;

  @IsNotEmpty()
  @IsDate()
  birthdate: Date;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsEnum(Gender)
  @IsOptional()
  gender: Gender;

  @IsNotEmpty()
  @IsString()
  avatar: string;
}
