import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants';

dotenv.config();

let clientInstance: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

const initializeDatabase = () => {
	// Skip database connection during build phase
	if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
		return;
	}

	if (!process.env.POSTGRES_URL) {
		throw new Error('POSTGRES_URL environment variable is not set');
	}

	if (!clientInstance) {
		clientInstance = postgres(process.env.POSTGRES_URL);
		dbInstance = drizzle(clientInstance, { schema });
	}
};

// Initialize immediately if not in build phase
if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
	initializeDatabase();
}

export const client = clientInstance || ({} as postgres.Sql);
export const db = dbInstance || ({} as ReturnType<typeof drizzle<typeof schema>>);
