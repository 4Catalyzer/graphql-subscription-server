module.exports = {
  extends: [
    '4catalyzer',
    '4catalyzer-typescript',
    '4catalyzer-jest',
    'prettier',
    'prettier/prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
