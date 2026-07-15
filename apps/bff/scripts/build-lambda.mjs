import { build } from 'esbuild';

await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/lambda.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  banner: {
    js: "import { createRequire as topLevelCreateRequire } from 'module'; const require = topLevelCreateRequire(import.meta.url);",
  },
  external: [
    // Optional NestJS/Fastify peer deps we don't use; esbuild would otherwise try to resolve them.
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-express',
    '@fastify/static',
    '@fastify/view',
    'class-transformer/storage',
  ],
  sourcemap: true,
  minify: true,
  logLevel: 'info',
});
