// eslint.config.js or .eslintrc.js
module.exports = {
  // ...existing config...
  parserOptions: {
    project: [
      './tsconfig.json',
      './tsconfig.node.json',
      './tsconfig.test.json', // <-- Add this line
    ],
    // ...existing code...
  },
  // ...existing config...
};
