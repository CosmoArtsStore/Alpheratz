import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    plugins: {
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks,
      unicorn,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/no-array-for-each': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-module': 'error',
      'unicorn/no-array-reduce': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'can', 'should'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['app/**', 'features/**'],
              message: 'shared/ may import from shared/ only.',
            },
            {
              regex: '^\\.\\.(?:/\\.\\.)*/(?:app|features)/',
              message: 'shared/ may import from shared/ only.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['app/**'],
              message: 'features/ may import from shared/ only and must not depend on app/.',
            },
            {
              regex: '^\\.\\.(?:/\\.\\.)*/app/',
              message: 'features/ may import from shared/ only and must not depend on app/.',
            },
            {
              regex: '^\\.\\.(?:/\\.\\.)*/features/[^/]+/',
              message: 'features/ must not import from another feature.',
            },
          ],
        },
      ],
    },
  },

  {
    ignores: [
      'dist/**',
      'src-tauri/target/**',
      'tauri.conf.json',
      'vite.config.*',
      'eslint.config.js',
    ],
  },
);
