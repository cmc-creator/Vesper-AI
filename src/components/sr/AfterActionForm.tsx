"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

const CHECKLIST_ITEMS: { num: number; text: string }[] = [
  { num: 1, text: "Patient was an immediate risk to physical safety of self or others" },
  { num: 2, text: "A Code Support was called" },
  { num: 3, text: "Physician order(s) obtained (complete)" },
  { num: 4, text: "In-person evaluation conducted by RN or Physician within one hour" },
  { num: 5, text: "Attending/covering physician provided in-person evaluation information" },
  { num: 6, text: "Documentation indicates that less restrictive measures failed or were not appropriate" },
  { num: 7, text: "All personal items which could be used for self-harm are removed" },
  { num: 8, text: "1:1 Personal restraint observation was conducted every 15 minutes" },
  { num: 9, text: "Correct CPI techniques were used" },
  { num: 10, text: "Staff in the area participated in the event as needed" },
  { num: 11, text: "Patient was monitored in-person throughout the physical restraint/seclusion episode" },
  { num: 12, text: "Required interventions were provided and documented on the 1:1 S/R Observation & Monitoring form" },
  { num: 13, text: "The patient was released from restraint when criteria for release or early release were met" },
  { num: 14, text: "Documentation reflects timely reassessment and justification; order obtained from Physician to continue if applicable" },
  { num: 15, text: "Patient's family or legal representative notified, as applicable" },
  { num: 16, text: "Patient debriefed" },
  { num: 17, text: "Staff Team debriefing with staff involved" },
  { num: 18, text: "Patient Injury" },
  { num: 19, text: "Staff Injury" },
  { num: 20, text: "Incident report completed" },
  { num: 21, text: "Camera review completed by Risk Management" },
];

type ChecklistEntry = { answer: "YES" | "NO" | "NA" | ""; comments: string };
type FormValues = {
  checklist: ChecklistEntry[];
  recommendations: string;
  completedByName: string;
  completedByDate: string;
  reviewedByName: string;
  reviewedByDate: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function AfterActionForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      checklist: CHECKLIST_ITEMS.map(() => ({ answer: "", comments: "" })),
    },
  });

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.completedByName?.trim()) missing.push("Completed by name");
    if (!data.completedByDate) missing.push("Completed by date");
    const unanswered = data.checklist?.filter((c) => !c.answer);
    if (unanswered?.length > 0) missing.push(`All 21 checklist items must be answered (${unanswered.length} unanswered)`);
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/after-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          completedByDate: data.completedByDate ? new Date(data.completedByDate).toISOString() : null,
          reviewedByDate: data.reviewedByDate ? new Date(data.reviewedByDate).toISOString() : null,
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
      <SRSection title="After Action Critique">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          *Completed by House Supervisor or Designee*
        </p>
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          DO NOT FILE IN PATIENT RECORD
        </p>

        {/* Checklist */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Item</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">Yes</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">No</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">N/A</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Comments</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ITEMS.map((item, i) => (
                <tr key={item.num} className="border border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{item.num}</td>
                  <td className="px-3 py-2">{item.text}</td>
                  {(["YES", "NO", "NA"] as const).map((opt) => (
                    <td key={opt} className="px-3 py-2 text-center">
                      <input type="radio" value={opt} {...register(`checklist.${i}.answer` as const)} className="accent-blue-700" />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input {...register(`checklist.${i}.comments` as const)} placeholder="Comments…" className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SRField label="Recommendations for Improvement">
          <textarea {...register("recommendations")} rows={4} className={`${inp} resize-y`} />
        </SRField>

        {/* Signatures */}
        <div className="grid md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Completed By</p>
            <SRField label="Print Name"><input {...register("completedByName")} className={inp} /></SRField>
            <SRField label="Date"><input type="date" {...register("completedByDate")} className={inp} /></SRField>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Reviewed By QM/Risk Management</p>
            <SRField label="Signature (Print Name)"><input {...register("reviewedByName")} type="text" className={inp} placeholder="Print name for record" /></SRField>
            <SRField label="Date"><input type="date" {...register("reviewedByDate")} className={inp} /></SRField>
          </div>
        </div>
      </SRSection>

      {error && <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded px-4 py-3 whitespace-pre-line">{error}</div>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Complete Packet ✓"}</button>
      </div>
    </form>
  );
}
