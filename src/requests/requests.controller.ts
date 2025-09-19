import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
