import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module.js';

export async function createApp(adapter: FastifyAdapter): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  await app.register(fastifyCookie);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  return app;
}
