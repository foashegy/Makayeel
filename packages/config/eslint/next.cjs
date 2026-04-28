/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  extends: [
    require.resolve('./base.cjs'),
    'next/core-web-vitals',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: ['jsx-a11y'],
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
