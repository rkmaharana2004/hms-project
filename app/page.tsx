"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. Import the router
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter(); // 2. Initialize the router

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 

    // Step 1: Log the user into Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    // Step 2: FR1.1.3 - Identify user role from our employees table
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('role')
      .eq('user_id', authData.user.id)
      .single();

    if (employeeError || !employeeData) {
      setError("User profile not found. Please contact Administration.");
      return;
    }

    // Step 3: FR1.1.4 - Redirect to role-based dashboard
    const role = employeeData.role;
    if (role === 'Doctor') {
      router.push('/doctor');
    } else if (role === 'Admin') {
      router.push('/admin');
    } else if (role === 'Receptionist') {
      router.push('/receptionist');
    } else {
      setError("Invalid role assigned.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Hospital Management System
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="doctor@hospital.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}