import { FastifyAdapter } from '@nestjs/platform-fastify';
import { createApp } from './app.js';

async function bootstrap() {
  const app = await createApp(new FastifyAdapter());
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`BFF listening on :${port}`);
}

bootstrap();
