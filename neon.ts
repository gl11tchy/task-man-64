import { neon } from '@neondatabase/serverless';

/**
 * SECURITY WARNING: This client-side database connection is for DEVELOPMENT ONLY.
 *
 * For production deployments:
 * 1. Create a backend API layer (Vercel API routes, Express, etc.)
 * 2. Move database queries to the server-side
 * 3. Use proper authentication/authorization
 * 4. Never expose DATABASE_URL to the client
 *
 * The VITE_ prefix exposes this variable to the browser bundle.
 * Consider using Neon's Data API with proper auth for client-side access.
 */
const databaseUrl = import.meta.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.warn('Missing VITE_DATABASE_URL environment variable - using localStorage only');
}

if (databaseUrl && import.meta.env.PROD) {
  console.warn(
    'WARNING: Database credentials are exposed to the client. ' +
    'For production, use a backend API layer to protect your database.'
  );
}

// Create the SQL query function
export const sql = databaseUrl ? neon(databaseUrl) : null;

// Helper to check if database is available
export const isDatabaseAvailable = () => !!sql;
