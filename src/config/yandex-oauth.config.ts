import { registerAs } from '@nestjs/config';

export const yandexOAuthConfig = registerAs('YANDEX_OAUTH', () => ({
  clientID: process.env.YANDEX_CLIENT_ID || '',
  clientSecret: process.env.YANDEX_CLIENT_SECRET || '',
  callbackURL: process.env.YANDEX_CALLBACK_URL || 'http://localhost:3000/auth/yandex/callback',
}));
