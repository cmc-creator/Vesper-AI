"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

type StaffRow = { name: string; title: string };
type FormValues = {
  debriefDate: string;
  debriefTime: string;
  isPhysicalRestraint: boolean;
  isSeclusion: boolean;
  isChemicalRestraint: boolean;
  reasonDTO: boolean;
  reasonDTS: boolean;
  staffInvolved: StaffRow[];
  patientName: string;
  participatingStaff: StaffRow[];
  informationDiscussed: string;
  descriptionOfEvents: string;
  preventionStrategies: string;
  patientRefused: boolean;
  rnName: string;
  rnDate: string;
  rnTime: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function PatientDebriefingForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      staffInvolved: Array.from({ length: 6 }, () => ({ name: "", title: "" })),
      participatingStaff: Array.from({ length: 6 }, () => ({ name: "", title: "" })),
    },
  });

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.debriefDate) missing.push("Debrief date");
    if (!data.debriefTime) missing.push("Debrief time");
    if (!data.rnName?.trim()) missing.push("RN name");
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/patient-debriefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          debriefDate: new Date(data.debriefDate).toISOString(),
          rnDate: data.rnDate ? new Date(data.rnDate).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onNext();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SRSection title="Patient Debriefing">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          *Instructions: This form must be completed within the first 24 hours of release by the RN*
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <SRField label="Date"><input type="date" {...register("debriefDate", { required: true })} className={inp} /></SRField>
          <SRField label="Time"><input type="time" {...register("debriefTime")} className={inp} /></SRField>
        </div>

        {/* Type of Intervention */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Type of Intervention</p>
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" {...register("isPhysicalRestraint")} className="accent-blue-700" /> Physical Restraint</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("isSeclusion")} className="accent-blue-700" /> Seclusion</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("isChemicalRestraint")} className="accent-blue-700" /> Chemical Restraint</label>
          </div>
        </div>

        {/* Reason */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Reason</p>
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" {...register("reasonDTO")} className="accent-blue-700" /> Danger to Others</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("reasonDTS")} className="accent-blue-700" /> Danger to Self</label>
          </div>
        </div>

        {/* Staff Involved */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Staff Involved in the Seclusion/Restraint</p>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <SRField label={`Name ${i + 1}`}><input {...register(`staffInvolved.${i}.name` as const)} className={inp} /></SRField>
                <SRField label="Title"><input {...register(`staffInvolved.${i}.title` as const)} className={inp} /></SRField>
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Participants in Debriefing</p>
          <SRField label="Patient Name"><input {...register("patientName")} className={`${inp} mb-3`} /></SRField>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <SRField label={`Staff Name ${i + 1}`}><input {...register(`participatingStaff.${i}.name` as const)} className={inp} /></SRField>
                <SRField label="Title"><input {...register(`participatingStaff.${i}.title` as const)} className={inp} /></SRField>
              </div>
            ))}
          </div>
        </div>

        {/* Debriefing Sections */}
        <SRField label="1. Information Discussed During Debriefing">
          <textarea {...register("informationDiscussed")} rows={4} className={`${inp} resize-y`} />
        </SRField>

        <SRField label="2. Description of Events that Led Up to the Intervention">
          <textarea {...register("descriptionOfEvents")} rows={4} className={`${inp} resize-y`} />
        </SRField>

        <SRField label="3. Intervention/Strategies to Prevent Repeat Incident">
          <textarea {...register("preventionStrategies")} rows={4} className={`${inp} resize-y`} />
        </SRField>

        {/* Signatures */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">Patient Signature</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("patientRefused")} className="accent-blue-700" /> Patient Refused
            </label>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="col-span-1"><SRField label="RN Signature"><input {...register("rnName")} type="text" className={inp} placeholder="Print name" /></SRField></div>
            <SRField label="Date"><input type="date" {...register("rnDate")} className={inp} /></SRField>
            <SRField label="Time"><input type="time" {...register("rnTime")} className={inp} /></SRField>
          </div>
        </div>
      </SRSection>

      {error && <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded px-4 py-3 whitespace-pre-line">{error}</div>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save & Next →"}</button>
      </div>
    </form>
  );
}
