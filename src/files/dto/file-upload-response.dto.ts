export class FileUploadResponseDto {
  id: number;
  publicUrl: string; // Публичная ссылка на загруженное изображение
  originalName: string; // Оригинальное имя файла
  size: number; // Размер файла в байтах
  mimeType: string; // MIME тип файла
}
