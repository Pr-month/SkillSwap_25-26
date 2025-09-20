import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { RequestStatus } from '../../users/enums';

export class UpdateRequestDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
