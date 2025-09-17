import { User } from '../entities/user.entity';

export class PaginatedUsersResponseDto {
  data: User[];
  page: number;
  totalPages: number;
} 