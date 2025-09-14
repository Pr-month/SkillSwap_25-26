import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 2 * 1024 * 1024, // Ограничение 2МБ
      },
      fileFilter: (_, file, callback) => {
        // Дополнительная проверка типа файла на уровне Multer
        const allowedMimeTypes = [
          'image/jpeg', // Подходит для .jpg и .jpeg
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new HttpException(
              'Разрешены только изображения (JPEG, PNG, GIF, WebP)',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileUploadResponseDto> {
    try {
      return await this.filesService.uploadImage(file);
    } catch (error) {
      // Если размер файла превышает лимит, Multer вернет ошибку
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw new HttpException(
          'Размер файла не должен превышать 2МБ',
          HttpStatus.PAYLOAD_TOO_LARGE, // 413
        );
      }
      // Пробрасываем другие ошибки
      throw error;
    }
  }
}
