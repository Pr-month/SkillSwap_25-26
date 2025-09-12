import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, PayloadTooLargeException } from "@nestjs/common";
import { response, Response } from "express";
import { EntityNotFoundError } from "typeorm";

@Catch()
export class AllExpectionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

    if (exception instanceof EntityNotFoundError) {
        return res.status(HttpStatus.NOT_FOUND).json({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Entity not found'
        })
    }

    if (exception.code === '23505') {
        return response.status(HttpStatus.CONFLICT).json({
            statusCode: HttpStatus.CONFLICT,
            message: 'Duplicate entry'
        })
    }

    if (exception instanceof PayloadTooLargeException) {
        return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
            statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
            message: 'Payload too large'
        })
    }

    if (exception instanceof HttpException) {
        return res
            .status(exception.getStatus())
            .json(exception.getResponse())
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
    })
    }
}