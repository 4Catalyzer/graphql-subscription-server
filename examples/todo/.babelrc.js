module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        useBuiltIns: false,
        exclude: ['proposal-async-generator-functions'], // https://github.com/babel/babel/pull/8003
      },
    ],
    '@babel/flow',
  ],
};
