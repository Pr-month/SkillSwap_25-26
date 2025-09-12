import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import * as winston from 'winston';
import * as path from 'path';

export const requestLoggerOptions = {
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.prettyPrint()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/requests.log'),
          level: 'http'
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/errors.log'),
          level: 'error'
        })
      ]
    }

@Injectable()
export class requestLoggerMiddleware implements NestMiddleware{

    constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

    use(req: Request, res: Response, next: NextFunction) {

        const requestId = randomUUID();

        const request = {
            requestId,
            url: req.originalUrl,
            method: req.method,
            body: req.body || 'empty',
        }

        this.logger.log('http', request);

        res.on('finish', () => {
            const response = {
                requestId,
                statusCode: res.statusCode,
                message: res.statusMessage,
            }

            if (res.statusCode >= 400) {
                this.logger.log('error', response);
                return
            }

            this.logger.log('http', response)
        })

        next();
    }
}