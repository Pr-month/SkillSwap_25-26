import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { IYandexOAuthConfig } from '../../config/config.types';
import { yandexOAuthConfig } from 'src/config';

// Интерфейс для профиля пользователя от Яндекса
interface YandexProfile {
  id: string;
  username: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(
    @Inject(yandexOAuthConfig.KEY)
    private yandexConfig: IYandexOAuthConfig,
    private authService: AuthService,
  ) {

    if (!yandexConfig) {
      throw new Error('Yandex OAuth configuration not found');
    }

    super({
      clientID: yandexConfig.clientID,
      clientSecret: yandexConfig.clientSecret,
      callbackURL: yandexConfig.callbackURL,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: YandexProfile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      // Логируем профиль для отладки
      console.log('Yandex Profile:', profile);

      // Извлекаем email из профиля
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('Email не найден в профиле Яндекса'), null);
      }

      // Создаем или находим пользователя
      const user = await this.authService.validateYandexUser({
        email,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value || undefined,
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
