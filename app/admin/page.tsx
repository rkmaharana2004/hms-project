"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState("directory");

  // Form State (Add)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [role, setRole] = useState("Doctor");
  const [department, setDepartment] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDept, setEditDept] = useState("");

  useEffect(() => { checkAdminAndFetchStaff(); }, []);

  const checkAdminAndFetchStaff = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }

    const { data: adminData } = await supabase.from("employees").select("role").eq("user_id", session.user.id).single();
    if (adminData?.role !== "Admin") { alert("Unauthorized access."); router.push("/"); return; }
    fetchEmployees();
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false });    
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const response = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role, department })
    });
    const result = await response.json();
    if (result.error) { alert(`Error: ${result.error}`); }
    else {
      alert("Employee added successfully!");
      setName(""); setEmail(""); setPassword(""); setDepartment(""); setRole("Doctor");
      fetchEmployees();
      setActiveTab("directory");
    }
    setLoading(false);
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from("employees").update({ role: editRole, department: editDept }).eq("id", id);
    if (!error) { setEditingId(null); fetchEmployees(); }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this employee?")) return;
    await supabase.from("employees").delete().eq("id", id);
    fetchEmployees();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const categories = ["Admin", "Doctor", "Receptionist"];

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white text-gray-900 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black tracking-tight text-xl">MEDICARE <span className="text-blue-600">HMS</span></p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <span className="text-xl font-black tracking-tighter text-black">MEDICARE <span className="text-blue-600">HMS</span></span>
          </div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Administrative Control</p>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setActiveTab("directory")} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === "directory" ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Staff Directory
          </button>
          <button onClick={() => setActiveTab("register")} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === "register" ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Register Staff
          </button>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-3 rounded-2xl text-sm font-black transition">
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden text-black">
        <header className="bg-white px-10 py-8 flex items-center justify-between shadow-sm">
          <h2 className="text-3xl font-black tracking-tight text-black">{activeTab === "directory" ? "Staff Directory" : "Onboard New Employee"}</h2>
          <div className="flex items-center gap-4">
             <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">Superuser Mode</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 pb-10 mt-8">
          <div className="max-w-6xl mx-auto">

            {activeTab === "directory" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {categories.map(category => {
                  const categoryStaff = employees.filter(emp => emp.role === category);
                  if (categoryStaff.length === 0) return null;

                  return (
                    <div key={category} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-50 flex items-center gap-4 text-black">
                        <span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{category}s</span>
                        <h3 className="font-black text-gray-900">Department Roster</h3>
                        <span className="ml-auto text-xs font-bold text-gray-400">{categoryStaff.length} Members</span>
                      </div>

                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-black border-b border-gray-50">
                            <th className="px-8 py-4">Full Name</th>
                            <th className="px-8 py-4">Designation</th>
                            <th className="px-8 py-4">Department</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-black">
                          {categoryStaff.map((emp) => (
                            <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">  
                              <td className="px-8 py-5 font-bold text-gray-900">{emp.name}</td>

                              {editingId === emp.id ? (
                                <>
                                  <td className="px-8 py-5">
                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-xl text-sm w-full font-bold focus:ring-2 focus:ring-blue-100 outline-none text-black">
                                      <option value="Admin">Admin</option><option value="Doctor">Doctor</option><option value="Receptionist">Receptionist</option>
                                    </select>
                                  </td>
                                  <td className="px-8 py-5 text-black">
                                    <input type="text" value={editDept} onChange={(e) => setEditDept(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-xl text-sm w-full font-bold focus:ring-2 focus:ring-blue-100 outline-none text-black" />
                                  </td>
                                  <td className="px-8 py-5 text-right flex gap-2 justify-end">
                                    <button onClick={() => handleSaveEdit(emp.id)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition">Save</button>
                                    <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition">Cancel</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-8 py-5 text-sm font-bold text-gray-500">{emp.role}</td>
                                  <td className="px-8 py-5 text-sm font-bold text-gray-500">{emp.department || "General"}</td>  
                                  <td className="px-8 py-5 text-right flex gap-4 justify-end">
                                    <button onClick={() => { setEditingId(emp.id); setEditRole(emp.role); setEditDept(emp.department || ""); }} className="text-blue-600 hover:text-blue-800 font-black text-xs uppercase tracking-widest transition hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:text-red-700 font-black text-xs uppercase tracking-widest transition hover:underline">Remove</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "register" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                <div className="mb-10 text-center">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">New Staff Setup</h3>
                  <p className="text-sm font-medium text-gray-400">Authorize a new medical or administrative professional.</p>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-6">
                  <div className="space-y-4 text-black">
                    <div><label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Full Legal Name</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition font-bold text-black" /></div>
                    <div><label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">System Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition font-bold text-black" /></div>
                    <div><label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Temporary Password</label><input type="text" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition font-bold text-black" /></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Role</label>     
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none appearance-none font-bold text-black">
                          <option value="Doctor">Doctor</option><option value="Receptionist">Receptionist</option><option value="Admin">Administrator</option>
                        </select>
                      </div>
                      <div><label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1 text-black">Department</label><input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Cardiology" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition font-bold text-black" /></div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-blue-100 mt-6 transition transform hover:-translate-y-1 uppercase tracking-widest text-sm">
                    {loading ? "Authenticating..." : "Finalize & Add Employee"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
