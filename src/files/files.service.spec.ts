import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import { appConfig } from '../config';
import { FileEntity } from './entities/file.entity';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;
  let mockRepository: any;

  const mockAppConfig = { baseUrl: 'http://localhost:3000' };

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
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: getRepositoryToken(FileEntity), useValue: mockRepository },
        { provide: appConfig.KEY, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);

    jest.spyOn(fs.promises, 'writeFile').mockImplementation(async () => {});
    jest.spyOn(fs.promises, 'unlink').mockImplementation(async () => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
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

      const result = await service.uploadImage(mockFile);

      expect(mockRepository.create).toHaveBeenCalled();
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
      // @ts-expect-error тестируем null
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

      const unlinkSpy = jest.spyOn(fs.promises, 'unlink');

      await expect(service.uploadImage(mockFile)).rejects.toThrow(
        new BadRequestException('Ошибка при сохранении файла'),
      );

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should handle duplicate filename error', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(duplicateError);

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

    it('should return null if file not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getFileById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAllFiles', () => {
    it('should return all files ordered by createdAt DESC', async () => {
      const mockFiles = [
        { id: 1, filename: 'a.jpg', createdAt: new Date() },
        { id: 2, filename: 'b.jpg', createdAt: new Date() },
      ];
      mockRepository.find.mockResolvedValue(mockFiles);

      const result = await service.getAllFiles();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockFiles);
    });

    it('should return empty array if no files exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getAllFiles();

      expect(result).toEqual([]);
    });
  });
});
