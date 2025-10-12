import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty({ description: 'Access token для аутентификации' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token для обновления access token' })
  refreshToken: string;
}
