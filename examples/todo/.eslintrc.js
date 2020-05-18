module.exports = {
  extends: [
    'plugin:relay/recommended',
    '4catalyzer-react',
    '4catalyzer-typescript',
    '4catalyzer-jest',
    'prettier',
    'prettier/react',
    'prettier/@typescript-eslint',
  ],
  plugins: ['relay'],
  rules: {
    // Don't fail linting if example dependencies aren't installed.
    'import/extensions': 'off',
    'import/no-cycle': 'off',
    'import/no-unresolved': 'off',
    'react/jsx-filename-extension': [1, { extensions: ['.jsx', '.tsx'] }],
    'jsx-a11y/control-has-associated-label': 'off',
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: [],
        aspects: ['noHref', 'invalidHref', 'preferButton'],
      },
    ],
    'react/button-has-type': 'off',
    'relay/unused-fields': 'off',
    'relay/generated-flow-types': 'off',
  },

  overrides: [
    {
      files: ['data/**'],
      rules: {
        'global-require': 'off',
        'no-await-in-loop': 'off',
        'no-console': 'off',
        'import/no-dynamic-require': 'off',
      },
    },
  ],
};
