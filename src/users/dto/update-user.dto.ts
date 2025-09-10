import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Наследует все поля из CreateUserDto как опциональные
  // name?: string;
  // email?: string;
  // password?: string; // В будущем можно исключить пароль из обновления
}
