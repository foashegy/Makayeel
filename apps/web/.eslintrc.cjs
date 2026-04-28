/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/next.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
};
