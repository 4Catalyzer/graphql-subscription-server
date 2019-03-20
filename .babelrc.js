module.exports = {
  presets: [
    [
      '@4c',
      {
        target: 'node',
        modules: process.env.BABEL_ENV !== 'esm' ? 'commonjs' : false,
      },
    ],
    '@babel/flow',
  ],
};
