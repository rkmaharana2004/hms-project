"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ReceptionistDashboard() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // UI State for Sidebar Navigation
  const [activeTab, setActiveTab] = useState("register");

  // TAB 1: Register Patient (Auth + Profile)
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAadhar, setRegAadhar] = useState("");

  // TAB 2: Manage Patients (Search, Update, Delete)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editName, setEditName] = useState("");

  // TAB 3: OPD Approval & Queue
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [opdTracker, setOpdTracker] = useState<any[]>([]);
  const [selectedDoctorForApproval, setSelectedDoctorForApproval] = useState<{ [key: string]: string }>({});

  // Offline Appointment State (at bottom of Manage/Search)
  const [assignDoctorId, setAssignDoctorId] = useState("");

  useEffect(() => {
    fetchDoctors();
    if (activeTab === "opd") fetchOpdTracker();
  }, [activeTab]);

  const fetchDoctors = async () => {
    const { data } = await supabase.from("employees").select("id, name").eq("role", "Doctor");
    if (data) setDoctors(data);
  };

  const fetchOpdTracker = async () => {
    const { data: pendingData } = await supabase.from("opd_queue")
      .select("*, patients(name, aadhar_number)")
      .eq("status", "Pending")
      .order("created_at", { ascending: true });
    if (pendingData) setPendingRequests(pendingData);

    const { data: trackerData } = await supabase.from("opd_queue")
      .select("*, patients(name, aadhar_number), employees(name)")
      .neq("status", "Pending")
      .order("created_at", { ascending: false });
    if (trackerData) setOpdTracker(trackerData);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/register-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName, age: regAge, contact: regContact, email: regEmail, password: regPassword, aadhar: regAadhar
        })
      });
      const result = await response.json();
      if (result.error) alert(`Error: ${result.error}`);
      else {
        alert("Patient registered successfully!");
        setRegName(""); setRegAge(""); setRegContact(""); setRegEmail(""); setRegPassword(""); setRegAadhar("");
      }
    } catch (err) { alert("Server connection failed."); }
    setLoading(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    let query = supabase.from("patients").select("*");
    if (searchQuery.trim()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery.trim());
      if (isUuid) query = query.eq("id", searchQuery.trim());
      else query = query.or(`name.ilike.%${searchQuery}%,aadhar_number.ilike.%${searchQuery}%`);
    } else {
      query = query.order("created_at", { ascending: false }).limit(10);
    }
    const { data } = await query;
    if (data) setSearchResults(data);
    setIsSearching(false);
  };

  const handleSavePatientEdit = async (id: string) => {
    const { error } = await supabase.from("patients").update({
      name: editName, age: parseInt(editAge), contact_details: editContact
    }).eq("id", id);
    if (!error) { alert("Patient updated!"); setEditingPatientId(null); handleSearch(); }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm("Delete this patient?")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (!error) { alert("Deleted!"); handleSearch(); }
  };

  const handleAssignOfflineAppointment = async (patientId: string) => {
    if (!assignDoctorId) return alert("Select doctor.");
    const { error } = await supabase.from("opd_queue").insert([{
      patient_id: patientId, assigned_doctor_id: assignDoctorId, status: "Waiting"
    }]);
    if (!error) { alert("Assigned!"); setAssignDoctorId(""); }
  };

  const handleApproveAppointment = async (queueId: string) => {
    const doctorId = selectedDoctorForApproval[queueId];
    if (!doctorId) return alert("Select doctor.");
    const { error } = await supabase.from("opd_queue").update({
      assigned_doctor_id: doctorId, status: "Waiting"
    }).eq("id", queueId);
    if (!error) { alert("Approved!"); fetchOpdTracker(); }
  };

  const handleRemoveOPD = async (queueId: string) => {
    if (!confirm("Remove?")) return;
    const { error } = await supabase.from("opd_queue").delete().eq("id", queueId);
    if (!error) fetchOpdTracker();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm text-black">
        <div className="p-8 border-b border-gray-50 text-black">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <span className="text-xl font-black tracking-tighter text-black">MEDICARE <span className="text-blue-600">HMS</span></span>
          </div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Front Office Portal</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 text-black">
          {["register", "manage", "opd"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}>
               {tab === "register" ? "Register Patient" : tab === "manage" ? "Manage Patient" : "OPD Approval"}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-3 rounded-2xl text-sm font-black transition">Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white px-10 py-8">
          <h2 className="text-3xl font-black tracking-tight uppercase text-black">
            {activeTab === "register" ? "New Registration" : activeTab === "manage" ? "Patient Directory" : "Live OPD Control"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-10 pb-10">
          <div className="max-w-5xl mx-auto">

            {activeTab === "register" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 animate-in fade-in duration-300">
                <form onSubmit={handleRegisterPatient} className="grid grid-cols-2 gap-8 text-black">
                  {[
                    { label: "Full Name", state: regName, set: setRegName },
                    { label: "Age", state: regAge, set: setRegAge, type: "number" },
                    { label: "Contact", state: regContact, set: setRegContact },
                    { label: "Aadhar", state: regAadhar, set: setRegAadhar },
                    { label: "Email", state: regEmail, set: setRegEmail, type: "email" },
                    { label: "Password", state: regPassword, set: setRegPassword }
                  ].map((f, i) => (
                    <div key={i} className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">{f.label}</label>
                      <input type={f.type || "text"} required value={f.state} onChange={(e) => f.set(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition font-bold" />
                    </div>
                  ))}
                  <button type="submit" disabled={loading} className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-blue-100 transform hover:-translate-y-1 mt-4 transition text-black">
                    {loading ? "Processing..." : "Register Account & Profile"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "manage" && (
              <div className="space-y-6 animate-in fade-in duration-300 text-black">
                <form onSubmit={handleSearch} className="flex gap-4 text-black">
                  <input type="text" placeholder="Search by Name or Aadhar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-white border border-gray-100 p-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-100 shadow-sm font-bold text-black" />
                  <button type="submit" className="bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black transition">Search</button>
                </form>

                <div className="space-y-4">
                  {searchResults.map(patient => (
                    <div key={patient.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-xl transition-all">
                      {editingPatientId === patient.id ? (
                        <div className="grid grid-cols-2 gap-4 text-black">
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-3 rounded-2xl font-bold bg-gray-50 text-black" />
                          <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} className="border p-3 rounded-2xl font-bold bg-gray-50 text-black" />
                          <input type="text" value={editContact} onChange={(e) => setEditContact(e.target.value)} className="col-span-2 border p-3 rounded-2xl font-bold bg-gray-50 text-black" />
                          <button onClick={() => handleSavePatientEdit(patient.id)} className="bg-blue-600 text-white py-3 rounded-2xl font-black transition">Save</button>
                          <button onClick={() => setEditingPatientId(null)} className="bg-gray-100 py-3 rounded-2xl font-black transition text-gray-400">Cancel</button>
                        </div>
                      ) : (
                        <div className="text-black">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-2xl font-black tracking-tight">{patient.name}</h3>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Aadhar: {patient.aadhar_number} | Age: {patient.age} | {patient.contact_details}</p>
                            </div>
                            <div className="flex gap-4">
                              <button onClick={() => { setEditingPatientId(patient.id); setEditName(patient.name); setEditAge(patient.age); setEditContact(patient.contact_details); }} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Update</button>
                              <button onClick={() => handleDeletePatient(patient.id)} className="text-red-500 font-black text-xs uppercase tracking-widest hover:underline">Delete</button>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-6 border-t border-gray-50 flex gap-4 items-center">
                            <div className="flex-1 relative">
                              <select value={assignDoctorId} onChange={(e) => setAssignDoctorId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none appearance-none cursor-pointer text-black">
                                <option value="">Assign Doctor for Offline Visit...</option>
                                {doctors.map(doc => <option key={doc.id} value={doc.id} className="text-black">Dr. {doc.name}</option>)}
                              </select>
                            </div>
                            <button onClick={() => handleAssignOfflineAppointment(patient.id)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition transform hover:-translate-y-1">Assign Appointment</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "opd" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-xl font-black text-gray-900">Pending Approvals</h3>
                     <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">Action Required</span>
                  </div>
                  {pendingRequests.length === 0 ? <p className="text-sm text-gray-400 text-center py-10 font-medium italic">No pending requests.</p> : (
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest"><th className="px-6 py-4">Patient Name</th><th className="px-6 py-4">Doctor Assignment</th><th className="px-6 py-4 text-right">Approval</th></tr></thead>
                      <tbody className="text-black text-black">
                        {pendingRequests.map(req => (
                          <tr key={req.id} className="border-b border-gray-50">
                            <td className="px-6 py-5 font-bold text-lg tracking-tight">{req.patients?.name}</td>
                            <td className="px-6 py-5">
                              <select onChange={(e) => setSelectedDoctorForApproval({...selectedDoctorForApproval, [req.id]: e.target.value})} className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold w-full outline-none text-black">
                                <option value="">-- Select Physician --</option>
                                {doctors.map(doc => <option key={doc.id} value={doc.id} className="text-black">Dr. {doc.name}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-5 text-right flex gap-3 justify-end">
                              <button onClick={() => handleApproveAppointment(req.id)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase transition">Approve</button>
                              <button onClick={() => handleRemoveOPD(req.id)} className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase transition">Reject</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 text-black">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Live Queue Tracking</h3>
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest"><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Doctor</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Control</th></tr></thead>
                    <tbody className="text-black">
                      {opdTracker.map(item => (
                        <tr key={item.id} className="border-b border-gray-50 text-black">
                          <td className="px-6 py-5 font-bold">{item.patients?.name}</td>
                          <td className="px-6 py-5 text-sm font-bold text-gray-500">Dr. {item.employees?.name}</td>
                          <td className="px-6 py-5"><span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${item.status === "Completed" ? "bg-green-50 text-green-600 border border-green-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.status}</span></td>
                          <td className="px-6 py-5 text-right"><button onClick={() => handleRemoveOPD(item.id)} className="text-red-500 font-black text-xs uppercase tracking-widest transition hover:underline">Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
