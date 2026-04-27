/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/next.js'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
};
