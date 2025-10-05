import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';
import { ConfigService } from '@nestjs/config';
import { IYandexOAuthConfig } from '../../config/config.types';

// Интерфейс для профиля пользователя от Яндекса
interface YandexProfile {
  id: string;
  username: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

@Injectable()
export class YandexTestStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private configService: ConfigService) {
    const yandexConfig = configService.get<IYandexOAuthConfig>('YANDEX_OAUTH');

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

      // Создаем простой объект пользователя для тестирования
      const user = {
        id: profile.id,
        email,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value || undefined,
        provider: 'yandex',
      };

      console.log('Test user created:', user);
      return done(null, user);
    } catch (error) {
      console.error('Yandex OAuth error:', error);
      return done(error, null);
    }
  }
}
