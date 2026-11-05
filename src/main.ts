import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { static as serveStatic } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads'), {
    dotfiles: 'deny',
    index: false,
    maxAge: '1d',
  }));
  const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: frontendOrigins });
  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();