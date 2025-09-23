// import {
//   IsNotEmpty,
//   IsString,
//   IsOptional,
//   IsNumber,
//   Length,
// } from 'class-validator';

export class CreateCategoryDto {
  // @IsString()
  // @IsNotEmpty()
  // @Length(2, 50)
  name: string;

  // @IsOptional()
  // @IsNumber()
  parentId?: number;
}
