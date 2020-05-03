/* @flow */

module.exports = {
  extends: [
    '4catalyzer-flow',
    '4catalyzer-jest',
    'prettier',
    'prettier/flowtype',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
