"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

type FormValues = {
  physRestTimeIn: string;
  physRestTimeOut: string;
  seclusionTimeIn: string;
  seclusionTimeOut: string;
  chemTimeGiven: string;
  chemIMLocation: string;
  totalMinutes: string;
  behavioralStatus: string;
  physAirway: boolean;
  physCirculation: boolean;
  physMusculoskeletal: boolean;
  complaintsOfInjury: string;
  complaintsDescription: string;
  familyNotified: string;
  familyName: string;
  familyNotifiedExplanation: string;
  notificationDate: string;
  notificationTime: string;
  rnName: string;
  rnDate: string;
  rnTime: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function TerminationForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch } = useForm<FormValues>();

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.totalMinutes?.trim()) missing.push("Total minutes");
    if (!data.rnName?.trim()) missing.push("RN name");
    if (!data.rnDate) missing.push("RN date");
    if (!data.rnTime) missing.push("RN time");
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/termination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          notificationDate: data.notificationDate ? new Date(data.notificationDate).toISOString() : null,
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
      <SRSection title="Termination Summary">

        {/* Intervention utilized */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Intervention Utilized</h4>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Physical Restraint</p>
            <div className="grid grid-cols-2 gap-3">
              <SRField label="Time In"><input type="time" {...register("physRestTimeIn")} className={inp} /></SRField>
              <SRField label="Time Out"><input type="time" {...register("physRestTimeOut")} className={inp} /></SRField>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Seclusion</p>
            <div className="grid grid-cols-2 gap-3">
              <SRField label="Time In"><input type="time" {...register("seclusionTimeIn")} className={inp} /></SRField>
              <SRField label="Time Out"><input type="time" {...register("seclusionTimeOut")} className={inp} /></SRField>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Chemical Restraint</p>
            <div className="grid grid-cols-2 gap-3">
              <SRField label="Time Given"><input type="time" {...register("chemTimeGiven")} className={inp} /></SRField>
              <SRField label="Location IM Administered"><input {...register("chemIMLocation")} className={inp} /></SRField>
            </div>
          </div>

          <SRField label="Total time in minutes">
            <input type="number" {...register("totalMinutes")} className={inp} />
          </SRField>
        </div>

        {/* Behavioral/Psychological Status */}
        <SRField label="Behavioral/Psychological Status at Termination">
          <textarea {...register("behavioralStatus")} rows={4} className={`${inp} resize-y`}
            placeholder="Describe patient's behavioral/psychological status at time of termination…" />
        </SRField>

        {/* Physical Status */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Physical Status at Termination</p>
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" {...register("physAirway")} className="accent-blue-700" /> Airway fully intact</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("physCirculation")} className="accent-blue-700" /> Circulation good</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("physMusculoskeletal")} className="accent-blue-700" /> Musculoskeletal system intact</label>
          </div>
        </div>

        {/* Complaints of Injury */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Complaints of Injury/Pain:</p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-1"><input type="radio" value="false" {...register("complaintsOfInjury")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-1"><input type="radio" value="true" {...register("complaintsOfInjury")} className="accent-blue-700" /> Yes, describe:</label>
          </div>
          {watch("complaintsOfInjury") === "true" && (
            <input {...register("complaintsDescription")} className={inp} />
          )}
        </div>

        {/* Notifications */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Notifications: Patient/Family/Guardian</p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-1"><input type="radio" value="yes" {...register("familyNotified")} className="accent-blue-700" /> Yes</label>
            <label className="flex items-center gap-1"><input type="radio" value="no" {...register("familyNotified")} className="accent-blue-700" /> No</label>
          </div>
          {watch("familyNotified") === "yes" && (
            <SRField label="Name"><input {...register("familyName")} className={inp} /></SRField>
          )}
          {watch("familyNotified") === "no" && (
            <SRField label="Explain why not notified"><input {...register("familyNotifiedExplanation")} className={inp} /></SRField>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <SRField label="Date"><input type="date" {...register("notificationDate")} className={inp} /></SRField>
            <SRField label="Time"><input type="time" {...register("notificationTime")} className={inp} /></SRField>
          </div>
        </div>

        {/* RN Signature */}
        <div className="border-t border-gray-100 pt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <SRField label="RN Name (Print)"><input {...register("rnName")} className={inp} /></SRField>
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
