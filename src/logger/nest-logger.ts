import * as winston from 'winston';
import * as path from 'path';

const infoFilter = winston.format((info) => {
  return info.level === 'info' ? info : false;
});

const errorFilter = winston.format((info) => {
  return info.level === 'error' ? info : false;
});

export const nestLoggerOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        errorFilter(),
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(
          (info: winston.Logform.TransformableInfo) =>
            `${info.level}: ${info.timestamp as string} ${info.message as string}`,
        ),
      ),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/errors.log'),
      format: winston.format.combine(
        errorFilter(),
        winston.format.timestamp(),
        winston.format.printf(
          (info: winston.Logform.TransformableInfo) =>
            `${info.level}: ${info.timestamp as string} ${info.message as string}`,
        ),
      ),
      level: 'error',
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        infoFilter(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
      level: 'info',
    }),
    new winston.transports.File({
      format: winston.format.combine(infoFilter(), winston.format.simple()),
      filename: path.join(__dirname, '../logs/info.log'),
      level: 'info',
    }),
  ],
};
