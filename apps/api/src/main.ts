import 'reflect-metadata';
import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({ origin: [env.WEB_ORIGIN], credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  new Logger('DaCy').log(`API hazırdır: http://localhost:${env.API_PORT}`);
}
void bootstrap();
