import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  let controller: FilesController;

  const mockFilesService = {
    uploadImage: jest.fn(),
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
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const expectedResponse = {
        id: 1,
        publicUrl: 'http://localhost:3000/public/images/test.jpg',
        originalName: 'test-image.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      };

      mockFilesService.uploadImage.mockResolvedValue(expectedResponse);

      const result = await controller.uploadImage(mockFile);

      expect(mockFilesService.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw HttpException for file size limit error', async () => {
      const fileSizeError = new Error('File too large');
      fileSizeError['code'] = 'LIMIT_FILE_SIZE';

      mockFilesService.uploadImage.mockRejectedValue(fileSizeError);

      await expect(controller.uploadImage(mockFile)).rejects.toThrow(
        new HttpException(
          'Размер файла не должен превышать 2МБ',
          HttpStatus.PAYLOAD_TOO_LARGE,
        ),
      );
    });
  });
});
