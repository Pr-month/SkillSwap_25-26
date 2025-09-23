import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  Req,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { AuthenticatedRequest } from '../auth/interfaces/auth.interface';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedUsersResponseDto> {
    const { page = 1, limit = 20 } = paginationDto;
    return this.usersService.findAllPaginated(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const userId = req.user.userId;
    return this.usersService.update(userId, updateUserDto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(
    @Request() req: AuthenticatedRequest,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<User> {
    const userId = req.user.userId;
    return this.usersService.updatePassword(userId, updatePasswordDto);
  }
}
