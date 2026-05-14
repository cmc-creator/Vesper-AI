"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PatientSelector from "@/components/PatientSelector";
import PhysicianOrderForm from "@/components/sr/PhysicianOrderForm";
import FaceToFaceForm from "@/components/sr/FaceToFaceForm";
import MonitoringLogForm from "@/components/sr/MonitoringLogForm";
import TerminationForm from "@/components/sr/TerminationForm";
import PatientDebriefingForm from "@/components/sr/PatientDebriefingForm";
import StaffDebriefingForm from "@/components/sr/StaffDebriefingForm";
import AfterActionForm from "@/components/sr/AfterActionForm";

const STEPS = [
  "Cover Sheet",
  "Physician Order",
  "1-Hr Face-to-Face",
  "1:1 Monitoring",
  "Termination",
  "Patient Debriefing",
  "Staff Debriefing",
  "After Action Critique",
];

function NewSRPacketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState(searchParams.get("patientId") ?? "");
  const incidentId = searchParams.get("incidentId");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createPacket() {
    if (!patientId) { setError("Please select a patient."); return; }
    setCreating(true);
    setError("");
    const res = await fetch("/api/sr-packets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, incidentReportId: incidentId ?? null }),
    });
    if (!res.ok) { setError("Failed to create packet."); setCreating(false); return; }
    const packet = await res.json();
    setPacketId(packet.id);
    setStep(1);
    setCreating(false);
  }

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function prev() { setStep((s) => Math.max(s - 1, 0)); }
  function finish() { router.push(`/dashboard/sr-packets/${packetId}`); }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">S&amp;R Packet</h1>
        <p className="text-sm text-gray-500">Seclusion / Physical Hold / Chemical Restraint Documentation</p>
      </div>

      {/* Stepper */}
      <div className="flex overflow-x-auto gap-1 mb-8 pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={packetId === null && i > 0}
            onClick={() => packetId && setStep(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              i === step
                ? "bg-blue-700 text-white"
                : i < step
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="font-bold text-lg text-gray-900 mb-1">Cover Sheet</h2>
            <p className="text-sm text-gray-500">
              The following forms must be completed for ANY seclusion/personal or chemical restraint.
              Ensure to include the incident report associated with the S&amp;R.
            </p>
          </div>
          {incidentId && (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-lg px-4 py-2">
              Linked to Incident Report: <strong>{incidentId}</strong>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Patient</p>
            <PatientSelector value={patientId} onChange={setPatientId} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={createPacket}
              disabled={creating}
              className="bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-800 transition disabled:opacity-60"
            >
              {creating ? "Creating…" : "Start Packet →"}
            </button>
          </div>
        </div>
      )}

      {step === 1 && packetId && (
        <PhysicianOrderForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 2 && packetId && (
        <FaceToFaceForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 3 && packetId && (
        <MonitoringLogForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 4 && packetId && (
        <TerminationForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 5 && packetId && (
        <PatientDebriefingForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 6 && packetId && (
        <StaffDebriefingForm srPacketId={packetId} onNext={next} onBack={prev} />
      )}
      {step === 7 && packetId && (
        <AfterActionForm srPacketId={packetId} onNext={finish} onBack={prev} />
      )}
    </div>
  );
}

export default function NewSRPacketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
      <NewSRPacketContent />
    </Suspense>
  );
}
