import { FastifyAdapter } from '@nestjs/platform-fastify';
import awsLambdaFastify from '@fastify/aws-lambda';
import { createApp } from './app.js';

type Proxy = (event: unknown, context: unknown) => Promise<unknown>;
let proxy: Proxy | undefined;

async function bootstrap(): Promise<Proxy> {
  const adapter = new FastifyAdapter();
  const app = await createApp(adapter);
  await app.init();
  return awsLambdaFastify(adapter.getInstance()) as Proxy;
}

export const handler = async (event: unknown, context: unknown) => {
  proxy ??= await bootstrap();
  return proxy(event, context);
};
