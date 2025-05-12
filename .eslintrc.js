module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],  rules: {
    'no-import-assign': 'error',
    'import/no-named-as-default-member': 'warn',
    // ...add other rules as needed
  },
};
