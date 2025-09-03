import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }
}