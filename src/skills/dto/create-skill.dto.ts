import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateSkillDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  images?: string[];

  @IsNotEmpty()
  categoryId: string;
}
