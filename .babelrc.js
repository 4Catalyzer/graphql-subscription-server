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
        targets: { node: '10' },
        useBuiltIns: false,
        exclude: ['proposal-async-generator-functions'], // https://github.com/babel/babel/pull/8003
        modules,
      },
    ],
    '@babel/flow',
  ],
};
