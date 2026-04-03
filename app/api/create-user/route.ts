import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// We use the Master Key here so it doesn't log the Admin out
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, name, role, department } = await request.json();

    // 1. Create the secure Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm for the college project
    });

    if (authError) throw authError;

    // 2. Link them into our Employees table
    const { error: dbError } = await supabaseAdmin.from('employees').insert([{
      user_id: authData.user?.id,
      name,
      role,
      department
    }]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}