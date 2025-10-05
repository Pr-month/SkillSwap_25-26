import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IYandexOAuthConfig } from '../config/config.types';
import { YandexAuthGuard } from './guards/yandex-auth.guard';

@Controller('auth-test')
export class AuthTestController {
  constructor(private configService: ConfigService) {}

  @Get('config')
  async testConfig(@Res() res: Response) {
    const yandexConfig =
      this.configService.get<IYandexOAuthConfig>('YANDEX_OAUTH');

    if (!yandexConfig) {
      return res.status(500).json({
        error: 'Yandex OAuth configuration not found',
        success: false,
      });
    }

    // Проверяем, что все необходимые переменные настроены
    const hasClientId = !!yandexConfig.clientID && yandexConfig.clientID !== '';
    const hasClientSecret =
      !!yandexConfig.clientSecret && yandexConfig.clientSecret !== '';
    const hasCallbackUrl =
      !!yandexConfig.callbackURL && yandexConfig.callbackURL !== '';

    return res.json({
      success: true,
      config: {
        hasClientId,
        hasClientSecret,
        hasCallbackUrl,
        callbackURL: yandexConfig.callbackURL,
        clientID: hasClientId
          ? `${yandexConfig.clientID.substring(0, 8)}...`
          : 'NOT_SET',
        clientSecret: hasClientSecret ? '***SET***' : 'NOT_SET',
      },
      message: 'Yandex OAuth configuration loaded successfully',
    });
  }

  @Get('yandex-url')
  async getYandexAuthUrl(@Res() res: Response) {
    const yandexConfig =
      this.configService.get<IYandexOAuthConfig>('YANDEX_OAUTH');

    if (!yandexConfig || !yandexConfig.clientID) {
      return res.status(500).json({
        error: 'Yandex OAuth not configured',
        success: false,
      });
    }

    // Формируем URL для авторизации через Яндекс
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${yandexConfig.clientID}&redirect_uri=${encodeURIComponent(yandexConfig.callbackURL)}`;

    return res.json({
      success: true,
      authUrl,
      message: 'Use this URL to test Yandex OAuth manually',
      instructions: [
        '1. Copy the authUrl and open it in browser',
        '2. Authorize the application in Yandex',
        '3. You will be redirected to callback URL with authorization code',
        '4. Note: This is manual testing without database connection',
      ],
    });
  }

  @Get('yandex/login')
  @UseGuards(YandexAuthGuard)
  async yandexLogin() {
    // Этот эндпоинт инициирует OAuth flow
    // Passport автоматически перенаправит на Яндекс
  }

  @Get('yandex/callback')
  @UseGuards(YandexAuthGuard)
  async yandexCallback(@Res() res: Response) {
    // После успешной авторизации через Яндекс
    // В реальном приложении здесь бы генерировались токены
    return res.json({
      success: true,
      message: 'Yandex OAuth callback received successfully!',
      note: 'This is a test endpoint without database connection',
    });
  }
}
