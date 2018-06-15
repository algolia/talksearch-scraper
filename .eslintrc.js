module.exports = {
  extends: ['algolia', 'algolia/jest'],
  globals: {
    __rewire_reset_all__: true,
  },
  rules: {
    'no-console': 0,
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
