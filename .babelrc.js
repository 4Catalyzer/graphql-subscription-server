module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        useBuiltIns: 'usage',
        modules: process.env.BABEL_ENV !== 'esm' ? 'commonjs' : false
      }
    ],
    '@babel/flow',
  ],
  plugins: [
    '@babel/proposal-async-generator-functions'
  ]
}

