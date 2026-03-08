import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const provider = process.env.DATABASE_PROVIDER || 'sqlite';

if (!['sqlite', 'postgresql'].includes(provider)) {
  console.error(`Invalid DATABASE_PROVIDER: ${provider}. Must be 'sqlite' or 'postgresql'.`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace provider = "..." within the datasource block
const datasourceRegex = /datasource\s+db\s+{[^}]*provider\s*=\s*"[^"]*"/;
const newDatasourceContent = schema.match(datasourceRegex)?.[0].replace(/provider\s*=\s*"[^"]*"/, `provider = "${provider}"`);

if (newDatasourceContent) {
  schema = schema.replace(datasourceRegex, newDatasourceContent);
  fs.writeFileSync(schemaPath, schema);
  console.log(`Prisma provider set to: ${provider}`);
} else {
  console.error('Could not find provider in schema.prisma');
  process.exit(1);
}
