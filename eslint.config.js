import { baseConfig } from './packages/config/eslint.base.js';

export default [
  ...baseConfig,
  {
    ignores: ['**/dist/**', '**/cdk.out/**', '**/.turbo/**', '**/node_modules/**'],
  },
];
