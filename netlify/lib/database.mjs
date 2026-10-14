import { neon } from '@neondatabase/serverless';

export async function queryDatabase(query, params) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL non configurata');
  return neon(connectionString).query(query, params, {
    fetchOptions: { signal: AbortSignal.timeout(15000) },
  });
}
