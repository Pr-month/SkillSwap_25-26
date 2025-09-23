import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Delete,
  Patch,
  Param,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums';
import { AuthenticatedRequest } from '../auth/interfaces/auth.interface';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.requestsService.create(createRequestDto, req.user.userId);
  }

  @Get('incoming')
  async getIncomingRequests(@Request() req: AuthenticatedRequest) {
    return this.requestsService.getIncomingRequests(req.user.userId);
  }
  @Get('outgoing')
  async getOutgoingRequests(@Request() req: AuthenticatedRequest) {
    return this.requestsService.getOutgoingRequests(req.user.userId);
  }
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.requestsService.remove(id, req.user.userId, req.user.role);
  }
  
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.requestsService.update(
      id,
      updateRequestDto,
      req.user.userId,
      req.user.role,
    );
  }
}
