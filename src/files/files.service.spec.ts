import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { appConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Мокаем fs модуль
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

// Мокаем uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FilesService', () => {
  let service: FilesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAppConfig = {
    baseUrl: 'http://localhost:3000',
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockRepository,
        },
        {
          provide: appConfig.KEY,
          useValue: mockAppConfig,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const mockFileEntity = {
        id: 1,
        filename: 'mocked-uuid-v4.jpg',
        originalName: 'test-image.jpg',
        path: 'public/images/mocked-uuid-v4.jpg',
        publicUrl: 'http://localhost:3000/public/images/mocked-uuid-v4.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
      };

      mockRepository.create.mockReturnValue(mockFileEntity);
      mockRepository.save.mockResolvedValue(mockFileEntity);
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadImage(mockFile);

      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'images', 'mocked-uuid-v4.jpg'),
        mockFile.buffer,
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        publicUrl: 'http://localhost:3000/public/images/mocked-uuid-v4.jpg',
        originalName: 'test-image.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      });
    });

    it('should throw BadRequestException if file is not provided', async () => {
      await expect(service.uploadImage(null)).rejects.toThrow(
        new BadRequestException('Файл не был предоставлен'),
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const unsupportedFile = { ...mockFile, mimetype: 'text/plain' };

      await expect(service.uploadImage(unsupportedFile)).rejects.toThrow(
        new BadRequestException(
          'Разрешены только изображения (JPEG, PNG, GIF, WebP)',
        ),
      );
    });

    it('should cleanup file when database save fails', async () => {
      const dbError = new Error('Database error');
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(dbError);
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (mockedFs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await expect(service.uploadImage(mockFile)).rejects.toThrow(
        new BadRequestException('Ошибка при сохранении файла'),
      );

      expect(mockedFs.promises.unlink).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'images', 'mocked-uuid-v4.jpg'),
      );
    });

    it('should handle duplicate filename error', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(duplicateError);
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await expect(service.uploadImage(mockFile)).rejects.toThrow(
        new BadRequestException(
          'Ошибка при сохранении файла: конфликт имени файла',
        ),
      );
    });
  });

  describe('getFileById', () => {
    it('should return file by id', async () => {
      const mockFileEntity = { id: 1, filename: 'test.jpg' };
      mockRepository.findOne.mockResolvedValue(mockFileEntity);

      const result = await service.getFileById(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockFileEntity);
    });
  });
});
