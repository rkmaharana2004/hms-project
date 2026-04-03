"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

export default function ReceptionistDashboard() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // NEW: UI State for Sidebar Navigation
  const [activeTab, setActiveTab] = useState("register");

  // Registration State
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [contact, setContact] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState("");
  const [editAddress, setEditAddress] = useState(""); 

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    const { data } = await supabase.from('employees').select('id, name').eq('role', 'Doctor');
    if (data) setDoctors(data);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data: patientData, error: patientError } = await supabase
      .from('patients').insert([{ name, age: parseInt(age), contact_details: contact, aadhar_number: aadhar }]).select().single();
      
    if (patientError) { alert("Error registering patient. Aadhar might already exist."); } 
    else if (selectedDoctor && patientData) {
      await supabase.from('opd_queue').insert([{ patient_id: patientData.id, assigned_doctor_id: selectedDoctor, status: 'Waiting' }]);
      alert("Success! Registered & added to queue."); 
      setName(""); setAge(""); setContact(""); setAadhar(""); setSelectedDoctor("");
      setActiveTab("search"); // Automatically switch to search tab after registering!
    }
    setLoading(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    const { data } = await supabase.from('patients')
      .select(`*, prescriptions ( id, diagnosis, medicines, dosage_instructions, notes, created_at, employees ( name ) )`)
      .or(`name.ilike.%${searchQuery}%,contact_details.eq.${searchQuery},aadhar_number.eq.${searchQuery}`);
    if (data) setSearchResults(data);
    setIsSearching(false);
  };

  const handleSavePatientEdit = async (id: string) => {
    const { error } = await supabase.from('patients').update({ contact_details: editContact, address: editAddress }).eq('id', id);
    if (!error) { setEditingPatientId(null); handleSearch(); }
  };

  const handlePrintPrescription = (patient: any, rx: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text("HOSPITAL MANAGEMENT SYSTEM", 20, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text(`Dr. ${rx.employees?.name || "Doctor"}`, 20, 35);
    doc.text(`Patient: ${patient.name} (Age: ${patient.age})`, 20, 45); 
    doc.text(`Date: ${new Date(rx.created_at).toLocaleDateString()}`, 140, 45);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12); doc.text(`Diagnosis: ${rx.diagnosis}`, 20, 60); doc.text(`Medicines: ${rx.medicines}`, 20, 75);
    doc.text(`Dosage Instructions: ${rx.dosage_instructions}`, 20, 90); doc.text(`Additional Notes: ${rx.notes}`, 20, 105);
    doc.save(`${patient.name}_Prescription_${new Date(rx.created_at).toLocaleDateString()}.pdf`);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* PROFESSIONAL SIDEBAR */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 bg-gray-950 border-b border-gray-800">
          <h1 className="text-2xl font-black text-green-400 tracking-tight">HMS</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">Receptionist Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab("register")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === "register" ? "bg-green-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Register Patient
          </button>
          
          <button 
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === "search" ? "bg-green-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Patient Records
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === "register" ? "Patient Registration" : "Medical Records Directory"}
          </h2>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
            System Online
          </span>
        </header>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            
            {/* TAB 1: REGISTRATION */}
            {activeTab === "register" && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-800">New Admission (FR5.1)</h3>
                  <p className="text-sm text-gray-500">Enter patient details to assign them to the OPD queue.</p>
                </div>
                
                <form onSubmit={handleRegisterPatient} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Legal Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Age</label>
                    <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Contact Number</label>
                    <input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Aadhar Number (12 Digits)</label>
                    <input type="text" required value={aadhar} onChange={(e) => setAadhar(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition" />
                  </div>
                  <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Routing: Assign to Doctor</label>
                    <select required value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none transition cursor-pointer">
                      <option value="">-- Select Available Doctor --</option>
                      {doctors.map((doc) => (<option key={doc.id} value={doc.id}>Dr. {doc.name}</option>))}
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="col-span-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-green-500/30 transition transform hover:-translate-y-0.5 mt-4">
                    {loading ? "Processing Admission..." : "Register Patient & Route to OPD"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: SEARCH RECORDS */}
            {activeTab === "search" && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Search Database (FR2.3)</h3>
                  <p className="text-sm text-gray-500 mb-4">Look up historical records, update contact info, and re-print prescriptions.</p>
                  
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                      <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input type="text" required placeholder="Search by Name, Phone, or Aadhar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition text-black placeholder-gray-400" />
                    </div>
                    <button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-bold shadow-md transition">
                      {isSearching ? "..." : "Search"}
                    </button>
                  </form>
                </div>

                <div className="space-y-6 mt-8">
                  {searchResults.length === 0 && !isSearching && searchQuery !== "" && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <p className="text-gray-500 font-medium">No records found matching your query.</p>
                    </div>
                  )}
                  
                  {searchResults.map((patient) => (
                    <div key={patient.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 p-5 border-b border-gray-200 flex justify-between items-start">
                        {editingPatientId === patient.id ? (
                          <div className="w-full space-y-3">
                            <h4 className="font-bold text-gray-800">Editing Profile: {patient.name}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <input type="text" value={editContact} onChange={(e) => setEditContact(e.target.value)} placeholder="Phone" className="w-full border p-2 rounded-lg text-sm" />
                              <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" className="w-full border p-2 rounded-lg text-sm" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleSavePatientEdit(patient.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition">Save Changes</button>
                              <button onClick={() => setEditingPatientId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm transition">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <h3 className="font-black text-xl text-gray-900">{patient.name} <span className="text-gray-400 font-medium text-sm ml-2">Age: {patient.age}</span></h3>
                              <div className="flex gap-4 mt-2 text-sm text-gray-600 font-medium">
                                <span className="flex items-center gap-1"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> {patient.contact_details}</span>
                                <span className="flex items-center gap-1"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> {patient.address || "No address on file"}</span>
                                <span className="flex items-center gap-1"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg> UID: {patient.aadhar_number}</span>
                              </div>
                            </div>
                            <button onClick={() => { setEditingPatientId(patient.id); setEditContact(patient.contact_details); setEditAddress(patient.address || ""); }} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg font-bold shadow-sm transition">
                              Edit Details
                            </button>
                          </>
                        )}
                      </div>

                      <div className="p-5 bg-white">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Clinical History & Prescriptions</h4>
                        {patient.prescriptions && patient.prescriptions.length > 0 ? (
                          <ul className="space-y-3">
                            {patient.prescriptions.map((rx: any) => (
                              <li key={rx.id} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                                    Rx
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">Dr. {rx.employees?.name} <span className="text-gray-400 font-normal mx-1">•</span> <span className="text-gray-500 font-medium">{new Date(rx.created_at).toLocaleDateString()}</span></p>
                                    <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Diag:</span> {rx.diagnosis}</p>
                                  </div>
                                </div>
                                <button onClick={() => handlePrintPrescription(patient, rx)} className="opacity-0 group-hover:opacity-100 bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                  Download PDF
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic bg-gray-50 py-3 px-4 rounded border border-gray-100">No previous consultations recorded.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}