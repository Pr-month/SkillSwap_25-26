import { IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class GetSkillsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsString()
  search = '';

  @IsOptional()
  @IsString()
  category: string;
}
