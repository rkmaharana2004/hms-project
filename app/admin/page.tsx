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

    const { data: adminData } = await supabase.from('employees').select('role').eq('user_id', session.user.id).single();
    if (adminData?.role !== 'Admin') { alert("Unauthorized access."); router.push("/"); return; }
    fetchEmployees();
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const { error } = await supabase.from('employees').update({ role: editRole, department: editDept }).eq('id', id);
    if (!error) { setEditingId(null); fetchEmployees(); }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this employee?")) return;
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  // Category array for mapping
  const categories = ["Admin", "Doctor", "Receptionist"];

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-900">Loading System...</div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 bg-gray-950 border-b border-gray-800">
          <h1 className="text-2xl font-black text-purple-400 tracking-tight">HMS</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">Admin Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab("directory")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "directory" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Staff Directory
          </button>
          <button onClick={() => setActiveTab("register")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "register" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Register Staff
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{activeTab === "directory" ? "Staff Directory" : "Onboard New Employee"}</h2>
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">Admin Privileges Active</span>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* TAB 1: CATEGORY-WISE DIRECTORY */}
            {activeTab === "directory" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {categories.map(category => {
                  const categoryStaff = employees.filter(emp => emp.role === category);
                  if (categoryStaff.length === 0) return null;

                  return (
                    <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className={`p-4 border-b border-gray-200 flex items-center gap-3 ${
                        category === 'Admin' ? 'bg-purple-50' : category === 'Doctor' ? 'bg-blue-50' : 'bg-green-50'
                      }`}>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                          category === 'Admin' ? 'bg-purple-200 text-purple-800' : category === 'Doctor' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                        }`}>
                          {category}s
                        </span>
                        <h3 className="font-bold text-gray-800 text-lg">Department Roster</h3>
                        <span className="ml-auto text-sm text-gray-500 font-medium">{categoryStaff.length} Member(s)</span>
                      </div>
                      
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                            <th className="p-4 font-bold">Name</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold">Department</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryStaff.map((emp) => (
                            <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="p-4 font-bold text-gray-900">{emp.name}</td>
                              
                              {editingId === emp.id ? (
                                <>
                                  <td className="p-4">
                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-full text-gray-900 bg-white shadow-sm focus:ring-purple-500 outline-none">
                                      <option value="Admin">Admin</option><option value="Doctor">Doctor</option><option value="Receptionist">Receptionist</option>
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <input type="text" value={editDept} onChange={(e) => setEditDept(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-full text-gray-900 bg-white shadow-sm focus:ring-purple-500 outline-none" placeholder="Department" />
                                  </td>
                                  <td className="p-4 text-right flex gap-2 justify-end">
                                    <button onClick={() => handleSaveEdit(emp.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md font-bold text-xs transition">Save</button>
                                    <button onClick={() => setEditingId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-md font-bold text-xs transition">Cancel</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-4 text-gray-600 font-medium">{emp.role}</td>
                                  <td className="p-4 text-gray-600 font-medium">{emp.department || "—"}</td>
                                  <td className="p-4 text-right flex gap-3 justify-end">
                                    <button onClick={() => { setEditingId(emp.id); setEditRole(emp.role); setEditDept(emp.department || ""); }} className="text-gray-500 hover:text-blue-600 font-bold text-sm transition">Edit</button>
                                    <button onClick={() => handleDeleteEmployee(emp.id)} className="text-gray-500 hover:text-red-600 font-bold text-sm transition">Remove</button>
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

            {/* TAB 2: REGISTER */}
            {activeTab === "register" && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                <div className="mb-8 border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-800">New Staff Setup (FR6.1)</h3>
                  <p className="text-sm text-gray-500">Create a secure login and profile for a new employee.</p>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-5">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">System Email (Login)</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Temporary Password</label><input type="text" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white outline-none transition" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Role Designator</label>
                      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white outline-none transition">
                        <option value="Doctor">Doctor</option><option value="Receptionist">Receptionist</option><option value="Admin">Administrator</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Department</label><input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Cardiology" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white outline-none transition" /></div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition">
                    {loading ? "Creating Account..." : "Authorize & Add Employee"}
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