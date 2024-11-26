import { drizzle } from 'drizzle-orm/libsql';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';

export const db = drizzle({ connection: getRequiredEnvVar('DB_FILE_NAME'), casing: 'snake_case' });