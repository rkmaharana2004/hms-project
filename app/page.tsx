"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Auth States
  const [role, setRole] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Patient Signup States
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [contact, setContact] = useState("");
  const [aadhar, setAadhar] = useState("");

  useEffect(() => {
    if (role !== "Patient" && role !== "") setIsSignUp(false);
  }, [role]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSignUp && !role) {
      alert("Please select a portal before signing in.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim();

    if (isSignUp) {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (authError || !authData.user) {
        alert(`Signup Error: ${authError?.message}`);
        setLoading(false); return;
      }
      const userId = authData.user.id;
      await supabase.from("employees").insert([{ user_id: userId, name, email: cleanEmail, role: "Patient" }]);
      await supabase.from("patients").insert([{ user_id: userId, name, age: parseInt(age), contact_details: contact, aadhar_number: aadhar }]);     
      router.push("/patient");
    } else {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authError || !authData.user) {
        alert(`Login Error: ${authError?.message}`);
        setLoading(false); return;
      }

      // Check if role matches
      const { data: empData } = await supabase.from("employees").select("role").eq("user_id", authData.user.id).single();
      
      if (empData) {
        if (empData.role !== role) {
          alert(`Access Denied: Your account is registered as a ${empData.role}, but you selected the ${role} Portal.`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (empData.role === "Admin") router.push("/admin");
        else if (empData.role === "Doctor") router.push("/doctor");
        else if (empData.role === "Receptionist") router.push("/receptionist");
        else if (empData.role === "Patient") router.push("/patient");
      } else {
        alert("Account profile not found. Please contact administration.");
        await supabase.auth.signOut();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">

      {/* NAVIGATION */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <span className="text-2xl font-black tracking-tighter text-gray-900">MEDICARE <span className="text-blue-600">HMS</span></span>
        </div>
        <button
          onClick={() => {setShowLogin(true); window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"})}}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-blue-600 transition shadow-xl shadow-gray-200"      
        >
          Access Portal
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="px-8 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
            Next-Gen Healthcare Management
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
            Seamless Care, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Digital Precision.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-lg leading-relaxed font-medium">
            Empowering hospitals with a unified digital ecosystem. Manage patients, prescriptions, and staff with real-time accuracy.
          </p>
          <div className="flex gap-4">
            <button
               onClick={() => setShowLogin(true)}
               className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition shadow-2xl shadow-blue-200 transform hover:-translate-y-1"
            >
              Get Started
            </button>
            <div className="flex -space-x-3 items-center">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                   <div className={`w-full h-full bg-gradient-to-br ${i%2===0 ? "from-blue-400 to-blue-600" : "from-indigo-400 to-indigo-600"}`}></div>
                </div>
              ))}
              <span className="pl-6 text-sm font-bold text-gray-500">Trusted by 500+ Doctors</span>
            </div>
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
           <div className="aspect-square rounded-[3.5rem] overflow-hidden border-8 border-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] relative group bg-blue-100">
              <img
                src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200"
                alt="Hospital Medical Center"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent"></div>

              {/* FLOATING ACCURACY & RATINGS BLOCK */}
              <div className="absolute bottom-10 left-10 right-10 bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/50 transform transition-all group-hover:-translate-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Platform Accuracy</p>
                      <div className="flex items-baseline gap-2 text-black">
                        <span className="text-4xl font-black">98.4%</span>
                        <div className="flex text-yellow-500 text-xs">
                           {[1,2,3,4,5].map(s => <span key={s}>★</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="h-12 w-[1px] bg-gray-200"></div>
                    <div className="text-right text-black">
                       <p className="text-lg font-black">4.9/5</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">User Rating</p>
                    </div>
                  </div>
              </div>
           </div>
           {/* Background decorative blobs */}
           <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-200/30 blur-3xl rounded-full -z-10"></div>
           <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-200/30 blur-3xl rounded-full -z-10"></div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">One Platform. Every Role.</h2>
            <p className="text-gray-500 font-medium">Specialized dashboards designed for hospital efficiency.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-black">
            {[
              { title: "Patients", desc: "View prescriptions & book OPD online", icon: "Patient" },
              { title: "Doctors", desc: "Digital prescriptions & queue management", icon: "Physician" },
              { title: "Reception", desc: "Onboarding & appointment routing", icon: "Front Desk" },
              { title: "Admin", desc: "Staff management & system control", icon: "Operations" }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-gray-100 group">
                <div className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTAL SECTION */}
      <section id="portal" className={`py-24 px-8 transition-all duration-1000 ${showLogin ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>     
        <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.15)] border border-gray-100 relative overflow-hidden">

          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Secure Access</h2>
            <p className="text-sm text-gray-500 font-medium">Please verify your credentials to continue.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 text-black">
            {!isSignUp && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Select Portal</label>
                <div className="relative">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-4 focus:ring-blue-100 outline-none transition appearance-none cursor-pointer">
                    <option value="">-- Select Portal --</option>
                    <option value="Patient">Patient Portal</option>
                    <option value="Receptionist">Receptionist Portal</option>
                    <option value="Doctor">Doctor Portal</option>
                    <option value="Admin">Admin Portal</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-4 focus:ring-blue-100 outline-none transition" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50 focus:ring-4 focus:ring-blue-100 outline-none transition" />
            </div>

            {isSignUp && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4">
                <input type="text" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" required placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50" />
                  <input type="text" required placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50" />
                </div>
                <input type="text" required placeholder="Aadhar Number" value={aadhar} onChange={(e) => setAadhar(e.target.value)} className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50" />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition transform hover:-translate-y-1 mt-4">
              {loading ? "Verifying..." : (isSignUp ? "Create My Account" : "Sign In to Portal")}
            </button>
          </form>

          {role === "Patient" && (
            <div className="mt-8 pt-8 border-t border-gray-50 text-center">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition">
                {isSignUp ? "Already have an account? Sign In" : "New patient? Register here"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-gray-100 text-center">
         <p className="text-sm text-gray-400 font-medium">© 2026 Medicare HMS. All rights reserved.</p>
      </footer>

    </div>
  );
}
