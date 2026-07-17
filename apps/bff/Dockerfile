# dist/lambda.js is already a fully self-contained esbuild bundle (see
# scripts/build-lambda.mjs) — no node_modules/install step needed, just wrap
# the one built file. Must run `pnpm --filter @btfp/bff build` before this
# image builds, same ordering requirement as the zip-based deploy it replaces.
FROM public.ecr.aws/lambda/nodejs:22

COPY dist/lambda.js ${LAMBDA_TASK_ROOT}/

CMD ["lambda.handler"]
