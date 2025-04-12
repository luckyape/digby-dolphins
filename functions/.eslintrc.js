module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['eslint:recommended', 'google'],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    quotes: ['off'],
    'object-curly-spacing': ['off'],
    indent: ['off'],
    'max-len': ['off'],
    'comma-dangle': ['off'],
    'operator-linebreak': ['off'],
    'no-unused-vars': ['off'],
    'valid-jsdoc': ['off'],
    'quote-props': ['off'],
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
