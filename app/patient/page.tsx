"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

export default function PatientDashboard() {
  const router = useRouter();
  const [patientData, setPatientData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  useEffect(() => { checkAuthAndFetchData(); }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }
    const { data: patient } = await supabase.from("patients").select("*").eq("user_id", session.user.id).single();
    if (!patient) { alert("Patient profile not found."); router.push("/"); return; }
    setPatientData(patient);
    fetchAppointments(patient.id);
    fetchPrescriptions(patient.id);
  };

  const fetchAppointments = async (patientId: string) => {
    const { data } = await supabase.from("opd_queue").select("*, employees(name)").eq("patient_id", patientId).order("created_at", { ascending: false });
    if (data) setAppointments(data);
  };

  const fetchPrescriptions = async (patientId: string) => {
    // 1. Fetch prescriptions without join
    const { data: prescriptionsData, error: rxError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    
    if (rxError) {
      console.error("Error fetching prescriptions:", rxError);
      return;
    }

    if (!prescriptionsData || prescriptionsData.length === 0) {
      setPrescriptions([]);
      return;
    }

    // 2. Fetch all unique doctor IDs
    const doctorIds = Array.from(new Set(prescriptionsData.map(rx => rx.doctor_id).filter(id => !!id)));

    // 3. Fetch doctor names from employees table
    const { data: doctorsData, error: docError } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", doctorIds);

    if (docError) {
      console.error("Error fetching doctors for prescriptions:", docError);
      // Fallback: show prescriptions with Unknown doctor
      setPrescriptions(prescriptionsData.map(rx => ({ ...rx, employees: { name: "Unknown" } })));
      return;
    }

    // 4. Map doctor names back to prescriptions
    const doctorMap = (doctorsData || []).reduce((acc: any, doc: any) => {
      acc[doc.id] = doc.name;
      return acc;
    }, {});

    const enrichedPrescriptions = prescriptionsData.map(rx => ({
      ...rx,
      employees: { name: doctorMap[rx.doctor_id] || "Unknown" }
    }));

    setPrescriptions(enrichedPrescriptions);
  };

  const handleRequestAppointment = async () => {
    const hasActive = appointments.some(app => app.status === "Pending" || app.status === "Waiting");
    if (hasActive) return alert("You already have an active request.");
    const { error } = await supabase.from("opd_queue").insert([{ patient_id: patientData.id, status: "Pending" }]);
    if (!error) { alert("Request sent!"); fetchAppointments(patientData.id); }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Cancel this request?")) return;
    const { error } = await supabase.from("opd_queue").delete().eq("id", id);
    if (!error) fetchAppointments(patientData.id);
  };

  const downloadPDF = (rx: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text("MEDICARE HMS PRESCRIPTION", 20, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text(`Dr. ${rx.employees?.name || "Unknown"}`, 20, 35);
    doc.text(`Patient: ${patientData.name} (Age: ${patientData.age})`, 20, 45);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12);
    doc.text(`Diagnosis: ${rx.diagnosis}`, 20, 60);
    doc.text(`Medicines: ${rx.medicines}`, 20, 75);
    doc.text(`Dosage Instructions: ${rx.dosage_instructions}`, 20, 90);
    doc.text(`Notes: ${rx.notes || "N/A"}`, 20, 105);
    doc.save(`${patientData.name}_Rx.pdf`);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (!patientData) return (
    <div className="flex h-screen items-center justify-center bg-white text-gray-900 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black tracking-tight text-xl">MEDICARE <span className="text-blue-600">HMS</span></p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* HEADER */}
        <header className="flex justify-between items-center bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Hello, {patientData.name}</h1>   
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-2 flex items-center gap-2">
               Patient Profile <span className="w-1 h-1 rounded-full bg-blue-600"></span> ID: {patientData.id}
            </p>
          </div>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition transform hover:-translate-y-1">
            Logout
          </button>
        </header>

        {/* QUICK ACTIONS */}
        <div className="bg-blue-600 p-12 rounded-[3.5rem] shadow-2xl shadow-blue-200 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:scale-110"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight">Need a Consultation?</h2>
            <p className="text-blue-100 font-medium mt-2 max-w-md">Request an online appointment. Our front desk will assign a specialist to your case shortly.</p>
          </div>
          <button onClick={handleRequestAppointment} className="relative z-10 w-full md:w-auto bg-white text-blue-600 px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-900/20 transition transform hover:-translate-y-1 active:scale-95">
            Book Appointment
          </button>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="grid md:grid-cols-2 gap-12 text-black">
          
          {/* PRESCRIPTIONS */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-black italic shadow-sm shadow-blue-100">Rx</span>
               Prescription History
            </h3>
            {prescriptions.length === 0 ? <p className="text-sm text-gray-400 font-medium p-8 bg-gray-50 rounded-[2rem] text-center border-2 border-dashed border-gray-100">No medical records found.</p> : (
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-6 border border-gray-50 rounded-[2rem] bg-gray-50/50 hover:bg-white hover:shadow-xl hover:shadow-gray-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <p className="font-black text-blue-600 text-xs uppercase tracking-widest">{new Date(rx.created_at).toLocaleDateString()}</p>
                      <button onClick={() => downloadPDF(rx)} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition">PDF</button>
                    </div>
                    <p className="text-lg font-black text-gray-900 tracking-tight mb-1">Dr. {rx.employees?.name || "Unknown"}</p>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest truncate">{rx.diagnosis}</p>
                    <button onClick={() => setSelectedPrescription(rx)} className="mt-4 w-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-blue-600 transition">View Full Details</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* APPOINTMENT STATUS */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 text-black">
            <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-black italic shadow-sm shadow-blue-100 italic text-black">OPD</span>
               Appointment Status
            </h3>
            {appointments.length === 0 ? <p className="text-sm text-gray-400 font-medium p-8 bg-gray-50 rounded-[2rem] text-center border-2 border-dashed border-gray-100">No active appointments.</p> : (
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-50"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody>
                  {appointments.map(app => (
                    <tr key={app.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-5 font-bold text-gray-600">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${app.status === "Pending" ? "bg-orange-50 text-orange-600 border border-orange-100" : app.status === "Waiting" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-green-50 text-green-600 border border-green-100"}`}>{app.status}</span>
                      </td>
                      <td className="px-4 py-5 text-right">{(app.status === "Pending" || app.status === "Waiting") && <button onClick={() => handleCancelAppointment(app.id)} className="text-red-500 font-black text-xs hover:underline uppercase tracking-widest">Cancel</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* PRESCRIPTION MODAL */}
        {selectedPrescription && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative text-black">
              <div className="p-10 bg-blue-600 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Prescription</h3>
                  <p className="text-xs font-black opacity-80 uppercase tracking-[0.2em] mt-1">{new Date(selectedPrescription.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedPrescription(null)} className="relative z-10 bg-white/20 hover:bg-white/40 p-3 rounded-2xl transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-12 space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Physician</label>
                  <p className="text-3xl font-black text-gray-900 tracking-tight">Dr. {selectedPrescription.employees?.name || "Unknown"}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100"><label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Diagnosis</label><p className="font-bold text-gray-900">{selectedPrescription.diagnosis}</p></div>
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100"><label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Instructions</label><p className="font-bold text-gray-900">{selectedPrescription.dosage_instructions}</p></div>
                  <div className="col-span-2 p-6 bg-gray-50 rounded-[2rem] border border-gray-100"><label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Medicines</label><p className="font-bold text-gray-900 whitespace-pre-wrap">{selectedPrescription.medicines}</p></div>
                  {selectedPrescription.notes && <div className="col-span-2 p-6 bg-gray-50 rounded-[2rem] border border-gray-100"><label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Follow-up Notes</label><p className="font-bold text-gray-900">{selectedPrescription.notes}</p></div>}
                </div>
                <button onClick={() => downloadPDF(selectedPrescription)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] transition transform hover:-translate-y-1 shadow-2xl shadow-blue-100 uppercase tracking-widest text-sm">Download Official Document</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
