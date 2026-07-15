import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'cdk.out/**', '.turbo/**', 'node_modules/**'],
  },
);
