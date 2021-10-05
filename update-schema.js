import fs from 'fs';
import path from 'path';

import { printSchema } from 'graphql/utilities';

import schema from './test/data/schema';

fs.writeFileSync(
  path.join(__dirname, './test/data/schema.graphql'),
  printSchema(schema),
);
