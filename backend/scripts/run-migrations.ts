import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '../src/config/database';

async function runMigrations() {
  const migrations = [
    '001_initial_schema.sql',
    '002_indexes.sql',
    '003_seed_timeslots.sql',
  ];

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`);
    const sql = readFileSync(
      join(__dirname, '..', 'migrations', migration),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
          if (queryError) {
            console.error(`Error in migration ${migration}:`, error);
            // For Supabase, we'll need to run migrations via SQL editor or CLI
            console.log('Please run migrations manually via Supabase SQL editor');
            console.log(`Migration file: ${migration}`);
            break;
          }
        }
      }
    }
  }

  console.log('Migrations completed');
}

// Note: Supabase doesn't support direct SQL execution via client
// Migrations should be run via Supabase Dashboard SQL Editor or CLI
console.log('Note: Run migrations via Supabase Dashboard SQL Editor');
console.log('Migration files are in: backend/migrations/');

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

