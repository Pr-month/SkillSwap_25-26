import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';
import { FileEntity } from './entities/file.entity';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid'; // Для генерации уникального имени файла

@Injectable()
export class FilesService {
  // Есть сценарий, при котором будем игнорировать второстепенную ошибку, чтобы не потерять основную
  // Если такое произойдет, то уивидим в логах
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService,
  ) {}

  // Загрузить изображение
  // Обрабатывает загруженный файл и возвращает публичную ссылку
  // Файл сохраняется в папке public/images
  // Ссылка записывается в БД
  async uploadImage(file: Express.Multer.File): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Файл не был предоставлен');
    }

    // Проверяем, что это изображение
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Разрешены только изображения (JPEG, PNG, GIF, WebP)',
      );
    }

    // Генерируем гарантированно уникальное имя файла с использованием UUID v4
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;

    // Путь для сохранения файла
    const uploadPath = path.join(process.cwd(), 'public', 'images', fileName);

    try {
      // Сохраняем файл на диск
      await fs.promises.writeFile(uploadPath, file.buffer);

      // Формируем публичную ссылку
      const baseUrl = this.configService.get(
        'BASE_URL',
        'http://localhost:3000',
      );
      const publicUrl = `${baseUrl}/public/images/${fileName}`;
      const relativePath = `public/images/${fileName}`;

      // Сохраняем информацию о файле в БД
      const fileEntity = this.fileRepository.create({
        filename: fileName,
        originalName: file.originalname,
        path: relativePath,
        publicUrl,
        mimeType: file.mimetype,
        size: file.size,
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      this.logger.log(
        `Файл успешно загружен: ${savedFile.filename} (ID: ${savedFile.id})`,
      );

      return {
        id: savedFile.id,
        publicUrl: savedFile.publicUrl,
        originalName: savedFile.originalName,
        size: savedFile.size,
        mimeType: savedFile.mimeType,
      };
    } catch (error) {
      // Cleanup: удаляем файл с диска при ошибке сохранения в БД
      try {
        await fs.promises.unlink(uploadPath);
      } catch (cleanupError) {
        // Логируем ошибку cleanup'а для мониторинга, но не пробрасываем
        // Основная проблема (ошибка БД) важнее, чем неудачная очистка
        this.logger.warn(
          `Не удалось удалить файл при cleanup: ${uploadPath}`,
          cleanupError.message,
        );
      }

      // Проверяем, не связана ли ошибка с дублированием filename
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        throw new BadRequestException(
          'Ошибка при сохранении файла: конфликт имени файла',
        );
      }

      throw new BadRequestException('Ошибка при сохранении файла');
    }
  }

  // Получить файл по ID
  async getFileById(id: number): Promise<FileEntity | null> {
    return await this.fileRepository.findOne({ where: { id } });
  }

  // Получить все файлы
  async getAllFiles(): Promise<FileEntity[]> {
    return await this.fileRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
