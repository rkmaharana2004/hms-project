"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

export default function DoctorDashboard() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [activePatient, setActivePatient] = useState<any | null>(null);

  // Prescription Form State
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { checkDoctorAuthAndFetchQueue(); }, []);

  const checkDoctorAuthAndFetchQueue = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }

    const { data: docData } = await supabase.from("employees").select("id, name, role").eq("user_id", session.user.id).single();
    if (docData?.role !== "Doctor") { alert("Unauthorized."); router.push("/"); return; }

    setDoctorName(docData.name);
    setDoctorId(docData.id);
    fetchQueue(docData.id);

    const channel = supabase.channel("realtime-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_queue" }, () => { fetchQueue(docData.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchQueue = async (id: string) => {
    const { data } = await supabase
      .from("opd_queue")
      .select("*, patients(*)")
      .eq("assigned_doctor_id", id)
      .eq("status", "Waiting")
      .order("created_at", { ascending: true });
    if (data) setQueue(data);
  };

  const handleGeneratePDFAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    await supabase.from("opd_queue").update({ status: "Completed" }).eq("id", activePatient.id);
    await supabase.from("prescriptions").insert([{
      patient_id: activePatient.patient_id,
      doctor_id: doctorId,
      diagnosis, medicines, dosage_instructions: instructions, notes
    }]);

    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text("MEDICARE HMS PRESCRIPTION", 20, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text(`Dr. ${doctorName}`, 20, 35);
    doc.text(`Patient: ${activePatient.patients.name} (Age: ${activePatient.patients.age})`, 20, 45);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12);
    doc.text(`Diagnosis: ${diagnosis}`, 20, 60);
    doc.text(`Medicines: ${medicines}`, 20, 75);
    doc.text(`Dosage Instructions: ${instructions}`, 20, 90);
    doc.text(`Notes: ${notes}`, 20, 105);
    doc.save(`${activePatient.patients.name}_Rx.pdf`);

    setActivePatient(null); setDiagnosis(""); setMedicines(""); setInstructions(""); setNotes("");
    fetchQueue(doctorId);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (!doctorName) return (
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
        <div className="p-8 border-b border-gray-50 text-black">
          <div className="flex items-center gap-2 mb-1 text-black">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <span className="text-xl font-black tracking-tighter">MEDICARE <span className="text-blue-600">HMS</span></span>
          </div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Physician Portal</p>
        </div>

        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.25rem] flex items-center justify-center font-black text-2xl border-2 border-blue-100">
              {doctorName.charAt(0)}
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-gray-900">Dr. {doctorName}</h2>
              <p className="text-[10px] text-green-500 font-black flex items-center gap-1 uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6">
          <button className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold bg-blue-600 text-white shadow-xl shadow-blue-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Live OPD Queue
          </button>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-3 rounded-2xl text-sm font-black transition">
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white px-10 py-8 flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tight uppercase text-black">{activePatient ? "Patient Consultation" : "OPD Waiting Room"}</h2>
          <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
            {queue.length} Patients in Queue
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-10 pb-10">
          <div className="max-w-5xl mx-auto">

            {!activePatient ? (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                   <h3 className="font-black text-gray-900">Current Queue Status</h3>
                </div>
                {queue.length === 0 ? (
                  <div className="p-24 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                       <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>  
                    </div>
                    <p className="font-black text-xl text-gray-900 tracking-tight text-black">Queue is Clear</p>
                    <p className="text-gray-400 text-sm mt-1 font-medium">All patients have been attended to.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-black border-b border-gray-50">  
                        <th className="px-8 py-4">Patient Information</th>
                        <th className="px-8 py-4 text-right">Consultation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                          <td className="px-8 py-6">
                            <p className="font-black text-gray-900 text-lg tracking-tight">{item.patients.name}</p>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Age: {item.patients.age} | UID: {item.patients.aadhar_number}</p>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button onClick={() => setActivePatient(item)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition transform hover:-translate-y-0.5 shadow-xl shadow-blue-100">
                              Call Patient
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 animate-in slide-in-from-right-8 duration-500 text-black">
                <div className="flex justify-between items-start mb-10 pb-8 border-b border-gray-50 text-black">
                  <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center font-black text-3xl">
                       {activePatient.patients.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{activePatient.patients.name}</h3>        
                      <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Age: {activePatient.patients.age} | Contact: {activePatient.patients.contact_details}</p>
                    </div>
                  </div>
                  <button onClick={() => setActivePatient(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition">
                    Return to Queue
                  </button>
                </div>

                <form onSubmit={handleGeneratePDFAndComplete} className="space-y-8 text-black">
                  <div className="grid grid-cols-1 gap-8 text-black">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Clinical Diagnosis</label>
                      <textarea required rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 outline-none transition font-bold" placeholder="Diagnosis findings..." />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Prescribed Medicines</label>  
                      <textarea required rows={3} value={medicines} onChange={(e) => setMedicines(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 outline-none transition font-bold" placeholder="1. Medicine A - 10mg..." />
                    </div>
                    <div className="grid grid-cols-2 gap-8 text-black">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1 text-black">Dosage Instructions</label> 
                        <input type="text" required value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 outline-none transition font-bold" placeholder="e.g. 1-0-1 After Meals" />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1 text-black">Follow-up Notes</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 outline-none transition font-bold" placeholder="e.g. Review in 1 week" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-blue-100 transition transform hover:-translate-y-1 flex justify-center items-center gap-3 mt-10 uppercase tracking-[0.15em] text-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Finalize & Generate Prescription
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
