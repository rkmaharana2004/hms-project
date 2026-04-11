import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { name, age, contact, email, password, aadhar } = await request.json();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;
    const userId = authData.user?.id;

    const { error: empError } = await supabaseAdmin.from("employees").insert([{
      user_id: userId,
      name,
      email,
      role: "Patient"
    }]);

    if (empError) throw empError;

    const { error: patError } = await supabaseAdmin.from("patients").insert([{
      user_id: userId,
      name,
      age: parseInt(age),
      contact_details: contact,
      aadhar_number: aadhar
    }]);

    if (patError) throw patError;

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
