import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsNotEmpty({ message: 'ID навыка, который предлагается, обязателен' })
  @IsUUID('4', { message: 'ID предлагаемого навыка должен быть валидным UUID' })
  offeredSkillId: string;

  @IsNotEmpty({ message: 'ID навыка, который запрашивается, обязателен' })
  @IsUUID('4', {
    message: 'ID запрашиваемого навыка должен быть валидным UUID',
  })
  requestedSkillId: string;
}
