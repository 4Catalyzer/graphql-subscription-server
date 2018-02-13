let modules = process.env.BABEL_ENV !== 'esm' ? 'commonjs' : false;

if (process.env.NODE_ENV === 'test') {
  modules = 'commonjs';
}

module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        useBuiltIns: 'usage',
        modules,
      },
    ],
    '@babel/flow',
  ],
  plugins: ['@babel/proposal-async-generator-functions'],
};
