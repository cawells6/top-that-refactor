module.exports = {
  root: true,
  env: {
    browser: true, // For client-side code (e.g., public/scripts)
    node: true, // For server-side code (e.g., server.ts, controllers, models)
    es2021: true, // Enables ES2021 globals and syntax
    jest: true, // Adds Jest global variables for test files
  },
  globals: {
    module: 'readonly',
    process: 'readonly',
    __dirname: 'readonly',
  },
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser for TypeScript
  parserOptions: {
    ecmaVersion: 12, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    project: './tsconfig.json', // Important for rules that require type information
  },
  plugins: [
    '@typescript-eslint', // Contains TypeScript-specific linting rules
    'prettier', // Integrates Prettier with ESLint
    'jest', // For Jest-specific linting rules
    'import', // For import/export linting
    'promise', // For promise best practices
  ],
  extends: [
    'eslint:recommended', // Basic ESLint recommended rules
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'plugin:jest/recommended', // Recommended Jest rules
    'plugin:promise/recommended', // Recommended promise rules
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  rules: {
    // === Prettier Integration ===
    'prettier/prettier': 'warn', // Show Prettier problems as ESLint warnings

    // === General JavaScript/ESLint Best Practices ===
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // Allow console in dev, warn in prod
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // Allow debugger in dev
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    eqeqeq: ['error', 'always', { null: 'ignore' }], // Enforce === and !==
    'no-else-return': ['warn', { allowElseIf: false }], // Warn against `else` after `return`
    'no-extra-semi': 'warn', // Warn about unnecessary semicolons
    'no-useless-escape': 'warn', // Warn about unnecessary escapes

    // === TypeScript Specific Rules ===
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn on unused vars, allow args starting with _
    '@typescript-eslint/no-explicit-any': 'warn', // Warn on usage of 'any' type
    '@typescript-eslint/explicit-function-return-type': 'off', // Allow inferred return types for functions
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow inferred types for module boundaries
    '@typescript-eslint/no-var-requires': 'warn', // Prefer ES modules over require()

    // === Import Plugin Rules ===
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // tsconfig paths handle this
    'import/prefer-default-export': 'off', // Allow named exports

    // === Jest Plugin Rules ===
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',

    // === Promise Plugin Rules ===
    'promise/always-return': 'warn',
    'promise/catch-or-return': ['warn', { terminationMethod: ['catch', 'asCallback', 'finally'] }],
  },
  overrides: [
    {
      files: [".eslintrc.js", "eslint.config.js", "vite.config.ts", "jest.config.cjs", "babel.config.cjs", "scripts/**/*.ts"],
      env: { node: true },
      globals: { module: 'readonly', process: 'readonly', __dirname: 'readonly' },
    },
    {
      files: ["public/scripts/**/*.ts", "public/scripts/**/*.js"],
      env: { browser: true },
      globals: { document: 'readonly', window: 'readonly', navigator: 'readonly', HTMLButtonElement: 'readonly', HTMLInputElement: 'readonly', HTMLDetailsElement: 'readonly', MutationObserver: 'readonly', Node: 'readonly', setTimeout: 'readonly' },
    },
    {
      files: ["tests/**/*.ts", "**/*.test.ts"],
      env: { jest: true, node: true },
      globals: { describe: 'readonly', test: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', jest: 'readonly', global: 'readonly', document: 'readonly', window: 'readonly', navigator: 'readonly', HTMLButtonElement: 'readonly', HTMLInputElement: 'readonly', HTMLDetailsElement: 'readonly', MutationObserver: 'readonly', Node: 'readonly', setTimeout: 'readonly' },
    },
    {
      files: ["public/scripts/**/*.ts", "public/scripts/**/*.js"],
      env: { browser: true, node: false },
    },
    {
      files: ["server.ts", "controllers/**/*.ts", "models/**/*.ts", "utils/**/*.ts", "scripts/**/*.ts", "vite.config.ts"],
      env: { node: true, browser: false },
    },
    {
      files: ["tests/**/*.ts", "**/*.test.ts"],
      env: { jest: true, node: true },
    },
    {
      // Configuration for JavaScript files (if any, e.g., old client scripts if not yet TS)
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off', // Allow require in JS files
      },
    },
    {
      // Configuration specifically for configuration files like vite.config.ts, .eslintrc.js etc.
      files: ['.eslintrc.js', 'vite.config.ts', 'jest.config.js', 'babel.config.js'],
      env: {
        node: true, // Ensure Node.js environment for these files
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off', // Often needed in config files
      },
    },
  ],
  ignorePatterns: ["dist/", "build/", "node_modules/", "*.d.ts"],
  settings: {
    'import/resolver': {
      typescript: {}, // This helps eslint-plugin-import understand TypeScript path aliases
    },
  },
};
