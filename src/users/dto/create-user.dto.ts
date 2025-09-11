// Временно отключены декораторы валидации из-за проблем с установкой class-validator
// import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
