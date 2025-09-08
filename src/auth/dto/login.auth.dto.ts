// Временно отключены декораторы валидации из-за проблем с установкой class-validator
// import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  email: string;
  password: string;
}
