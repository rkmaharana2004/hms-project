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

    const { data: docData } = await supabase.from('employees').select('id, name, role').eq('user_id', session.user.id).single();
    if (docData?.role !== 'Doctor') { alert("Unauthorized."); router.push("/"); return; }

    setDoctorName(docData.name);
    setDoctorId(docData.id);
    fetchQueue(docData.id);

    // Set up Realtime listener for the Queue
    const channel = supabase.channel('realtime-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opd_queue' }, () => { fetchQueue(docData.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchQueue = async (id: string) => {
    const { data } = await supabase
      .from('opd_queue')
      .select('*, patients(*)')
      .eq('assigned_doctor_id', id)
      .eq('status', 'Waiting')
      .order('created_at', { ascending: true });
    if (data) setQueue(data);
  };

  const handleGeneratePDFAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    // 1. Mark patient as completed
    await supabase.from('opd_queue').update({ status: 'Completed' }).eq('id', activePatient.id);

    // 2. Save prescription to DB
    await supabase.from('prescriptions').insert([{
      patient_id: activePatient.patient_id,
      doctor_id: doctorId,
      diagnosis, medicines, dosage_instructions: instructions, notes
    }]);

    // 3. Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text("HOSPITAL MANAGEMENT SYSTEM", 20, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text(`Dr. ${doctorName}`, 20, 35);
    doc.text(`Patient: ${activePatient.patients.name} (Age: ${activePatient.patients.age})`, 20, 45);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12);
    doc.text(`Diagnosis: ${diagnosis}`, 20, 60);
    doc.text(`Medicines: ${medicines}`, 20, 75);
    doc.text(`Dosage Instructions: ${instructions}`, 20, 90);
    doc.text(`Notes: ${notes}`, 20, 105);
    doc.save(`${activePatient.patients.name}_Rx.pdf`);

    // 4. Reset UI
    setActivePatient(null); setDiagnosis(""); setMedicines(""); setInstructions(""); setNotes("");
    fetchQueue(doctorId);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 bg-gray-950 border-b border-gray-800">
          <h1 className="text-2xl font-black text-blue-400 tracking-tight">HMS</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">Physician Portal</p>
        </div>
        
        <div className="p-6 border-b border-gray-800">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xl mb-3 border-2 border-blue-400">
            {doctorName.charAt(0)}
          </div>
          <h2 className="font-bold text-sm">Dr. {doctorName}</h2>
          <p className="text-xs text-blue-400 mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> On Duty</p>
        </div>

        <nav className="flex-1 p-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Active OPD Queue
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition">
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{activePatient ? "Patient Consultation" : "OPD Waiting Room"}</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
            {queue.length} {queue.length === 1 ? 'Patient' : 'Patients'} Waiting
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            
            {/* VIEW 1: THE QUEUE (Shows if no patient is actively selected) */}
            {!activePatient ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 bg-gray-50 border-b border-gray-200"><h3 className="text-lg font-bold text-gray-800">Live Queue (FR3.2)</h3></div>
                {queue.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <p className="font-medium text-lg">Your queue is empty.</p>
                    <p className="text-sm mt-1">Waiting for the receptionist to route patients.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                        <th className="p-4 font-bold">Patient Details</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{item.patients.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Age: {item.patients.age} | UID: {item.patients.aadhar_number}</p>
                          </td>
                          <td className="p-4"><span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">Waiting</span></td>
                          <td className="p-4 text-right">
                            <button onClick={() => setActivePatient(item)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm">
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

              /* VIEW 2: THE CONSULTATION FORM (Shows when a patient is called) */
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-in slide-in-from-right-8 duration-500">
                <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">{activePatient.patients.name}</h3>
                    <p className="text-gray-500 mt-1">Age: {activePatient.patients.age} | Contact: {activePatient.patients.contact_details}</p>
                  </div>
                  <button onClick={() => setActivePatient(null)} className="text-gray-400 hover:text-gray-800 text-sm font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition">
                    Return to Queue
                  </button>
                </div>

                <form onSubmit={handleGeneratePDFAndComplete} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Clinical Diagnosis (FR4.2)</label>
                    <textarea required rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="Patient presents with..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Prescribed Medicines</label>
                    <textarea required rows={3} value={medicines} onChange={(e) => setMedicines(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="1. Paracetamol 500mg..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Dosage Instructions</label>
                      <input type="text" required value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="e.g. Twice a day after meals" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes / Follow-up</label>
                      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="e.g. Review after 5 days" />
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-8 border-t border-gray-100">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5 flex justify-center items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Generate PDF & Clear From Queue (FR4.3)
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}