let modules = process.env.BABEL_ENV !== 'esm' ? 'commonjs' : false;
let TEST = process.env.NODE_ENV === 'test';

if (TEST) {
  modules = 'commonjs';
}

module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        useBuiltIns: TEST ? 'usage' : false,
        modules,
      },
    ],
    '@babel/flow',
  ],
};
