import fs from 'fs';
import path from 'path';

import jwt from 'jsonwebtoken';

// sign with RSA SHA256
const key = fs.readFileSync(path.join(__dirname, '/private-key.pem'));

const token = jwt.sign({ sub: 'Jimmy' }, key, {
  algorithm: 'RS256',
  expiresIn: '100 hours',
  keyid: 'graphql-subscriptions-test-key',
});

fs.writeFileSync(
  path.resolve(__dirname, '../token.json'),
  JSON.stringify({ token }, null, 2),
);

console.log('writing token to token.json');
