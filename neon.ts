import { neon } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.warn('Missing VITE_DATABASE_URL environment variable - using localStorage only');
}

// Create the SQL query function
export const sql = databaseUrl ? neon(databaseUrl) : null;

// Helper to check if database is available
export const isDatabaseAvailable = () => !!sql;
