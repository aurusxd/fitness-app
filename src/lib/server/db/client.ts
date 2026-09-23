import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';
import { config } from '../config';

if (config.databaseUrl.startsWith('file:')) {
	mkdirSync(dirname(config.databaseUrl.replace(/^file:/, '')), { recursive: true });
}

const client = createClient({
	url: config.databaseUrl,
	authToken: config.databaseAuthToken
});

export const db = drizzle(client, { schema });
