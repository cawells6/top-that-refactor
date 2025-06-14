// eslint.config.js for ESLint v9+ (Flat Config)
import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import originalGlobals from 'globals'; // Import original globals
import importPlugin from 'eslint-plugin-import'; // Preserving import plugin
import promisePlugin from 'eslint-plugin-promise'; // Preserving promise plugin

// Helper function to trim keys of an object
const trimGlobalKeys = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.trim(), value])
  );
};

// Create sanitized versions of globals
const globals = {
  node: trimGlobalKeys(originalGlobals.node),
  browser: trimGlobalKeys(originalGlobals.browser),
  jest: trimGlobalKeys(originalGlobals.jest),
  es2021: trimGlobalKeys(originalGlobals.es2021), // Added for modern JS features
  // Add any other global sets you might use, e.g., worker, amd, etc.
};

export default [
  // 1. Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      '**/*.d.ts', // Ignore all TypeScript declaration files
      '.eslintrc.js', // Ignore old ESLint config file
      'vite.config.ts*.timestamp-*',
      'public/scripts/**/*.js', // JS files in public/scripts handled by their own block
      'shared/eslint.config.js', // Ignore this file as it uses CommonJS syntax
    ],
  },

  js.configs.recommended, // General JS recommendations

  // Special rule for scripts/test.ts that's causing issues
  {
    files: ['scripts/test.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        // No project specified - this avoids the typed linting error
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // More lenient rules since we're not using typed linting for this file
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // 2. Main TypeScript Configuration (Server, Scripts, Root TS files, Non-client Tests)
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
    ],
    ignores: [ // Exclude files handled by more specific configurations
      'public/scripts/**/*.ts',
      'public/scripts/**/*.tsx',
      'scripts/test.ts', // Exclude the file we're handling specially
    ],
    languageOptions: {
      parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        sourceType: 'module',
        ecmaVersion: 'latest', // Updated
      },
      globals: {
        ...globals.node, // For Node.js environment specifics (like process, console)
        ...globals.es2021, // For modern JavaScript global objects (like Promise, Map, Set)
        ...globals.jest, // For server-side tests
        // NodeJS: 'readonly', // Explicitly define NodeJS if still problematic after globals.node
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin, // Preserved import plugin
      promise: promisePlugin, // Preserved promise plugin
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars for TS
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Updated
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'warn', // Added
      'no-undef': 'off', // Updated: TypeScript handles this
      // Preserved import rules
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: '@/', group: 'internal', position: 'before' },
            { pattern: '@shared/', group: 'internal', position: 'before' },
            { pattern: '@models/', group: 'internal', position: 'before' },
            { pattern: '@publicScripts/', group: 'internal', position: 'before' },
            { pattern: '@srcTypes/', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off', // Rely on TypeScript/parserOptions.project
      // Preserved promise rules
      'promise/always-return': 'warn',
      'promise/catch-or-return': [
        'warn',
        { terminationMethod: ['catch', 'asCallback', 'finally'] },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-else-return': ['warn', { allowElseIf: false }],
      'no-extra-semi': 'warn',
      'no-useless-escape': 'warn',
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json', './tsconfig.node.json'], // For the main/server TS block
        },
      },
    },
  },

  // 3. Client-side TypeScript Configuration (public/scripts/**/*.ts)
  {
    files: ['public/scripts/**/*.ts', 'public/scripts/**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: {
        project: ['./public/scripts/tsconfig.json'], // Corrected path relative to project root
        sourceType: 'module',
        ecmaVersion: 'latest', // Updated
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest, // If you have tests for client-side TS files
        io: 'readonly', // Assuming 'io' is from socket.io-client
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      promise: promisePlugin, // Added promise plugin
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Updated
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'warn', // Added
      'no-undef': 'off', // Updated: TypeScript handles this
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: '@/', group: 'internal', position: 'before' },
            { pattern: '@shared/', group: 'internal', position: 'before' },
            { pattern: '@models/', group: 'internal', position: 'before' },
            { pattern: '@publicScripts/', group: 'internal', position: 'before' },
            { pattern: '@srcTypes/', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off', // Rely on TypeScript/parserOptions.project
      'promise/always-return': 'warn', // Added promise rule
      'promise/catch-or-return': [
        'warn',
        { terminationMethod: ['catch', 'asCallback', 'finally'] },
      ], // Added promise rule
      eqeqeq: ['error', 'always', { null: 'ignore' }], // Added
      'no-else-return': ['warn', { allowElseIf: false }], // Added
      'no-extra-semi': 'warn', // Added
      'no-useless-escape': 'warn', // Added
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './public/scripts/tsconfig.json', // For the client-side TS block
        },
      },
    },
  },

  // 4. Client-side JavaScript Configuration (public/scripts/**/*.js)
  {
    files: ['public/scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        io: 'readonly',
      },
      sourceType: 'module', // Assuming client JS are modules
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Updated
      'no-undef': 'error', // Browser globals should be exhaustive
    },
  },

  // 5. CJS Configuration (e.g., jest.config.cjs)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node, // Includes commonjs globals like module, require, etc.
        ...globals.es2021,
        // module: 'readonly', // Already in globals.node or globals.commonjs
        // require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Updated
      'no-undef': 'error',
      'no-useless-escape': 'warn',
    },
  },

  // 6. Root-level JavaScript files (e.g., wait.js)
  {
    files: ['*.js'],
    ignores: ['eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'module', // wait.js uses import/export
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Updated
      'no-undef': 'error',
    },
  },

  // New configuration for scripts/*.js files
  {
    files: ['scripts/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error', 
    },
  },

  // 7. Test File Configuration (specific to server-side tests, client tests handled in client TS block)
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.es2021,
        ...globals.browser, // For tests like lobbyForm.test.ts
      },
      parserOptions: {
        // Ensure parser options are set for test files if not inheriting correctly
        project: ['./tsconfig.json'], // Or a specific tsconfig.test.json
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Specific Jest rules can go here
      'no-undef': 'off', // Updated: TypeScript handles this for TS test files; Jest globals are defined
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  prettierConfig, // Applies Prettier rules globally as a final step
];
