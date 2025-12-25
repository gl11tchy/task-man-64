import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load .env file
config();

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: VITE_DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  try {
    console.log('Running whiteboard migration...');

    // Create table
    console.log('Creating whiteboards table...');
    await sql`
      CREATE TABLE IF NOT EXISTS whiteboards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        document_snapshot jsonb NOT NULL DEFAULT '{}',
        session_snapshot jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        user_id text
      )
    `;

    // Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_whiteboards_project_id ON whiteboards(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_whiteboards_user_id ON whiteboards(user_id)`;

    console.log('Migration completed successfully!');

    // Verify table exists
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'whiteboards'`;
    console.log('Whiteboards table exists:', tables.length > 0);

    // Show table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'whiteboards'
      ORDER BY ordinal_position
    `;
    console.log('\nTable structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
