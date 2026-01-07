import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/database';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin User';

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert admin user
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: 'admin',
      name: name,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - user already exists
      console.log('Admin user already exists');
      return;
    }
    console.error('Error creating admin user:', error);
    process.exit(1);
  }

  console.log('Admin user created successfully:');
  console.log(`  Email: ${data.email}`);
  console.log(`  Name: ${data.name}`);
  console.log(`  Role: ${data.role}`);
}

seedAdmin()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });

