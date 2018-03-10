const fs = require('fs');
const jwt = require('jsonwebtoken');

// sign with RSA SHA256
const key = fs.readFileSync(`${__dirname}/private-key.pem`);

const token = jwt.sign({ sub: 'Jimmy' }, key, {
  algorithm: 'RS256',
  expiresIn: '100 hours',
  keyid: 'graphql-subscriptions-test-key',
});

console.log(`
Your JWT is:
  ${token}
`);
