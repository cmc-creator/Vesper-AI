"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

const BEHAVIORS: { code: string; label: string }[] = [
  { code: "A", label: "A. Hitting door" },
  { code: "B", label: "B. Yelling" },
  { code: "C", label: "C. Crying" },
  { code: "D", label: "D. Cursing" },
  { code: "E", label: "E. Laughing" },
  { code: "F", label: "F. Singing" },
  { code: "G", label: "G. Mumbling" },
  { code: "H", label: "H. Standing Still" },
  { code: "I", label: "I. Walking/Pacing" },
  { code: "J", label: "J. Lying/Sitting" },
  { code: "K", label: "K. Quiet" },
  { code: "L", label: "L. Sleeping" },
  { code: "M", label: "M. Threatening" },
  { code: "N", label: "N. Disrobing" },
  { code: "O", label: "O. Combative" },
];

const INTERVENTIONS: { code: string; label: string }[] = [
  { code: "1", label: "1. Placed in Seclusion" },
  { code: "2", label: "2. Released from Seclusion" },
  { code: "3", label: "3. Placed in Restraint" },
  { code: "4", label: "4. Released from Restraint" },
  { code: "5", label: "5. Attempted release from restraint" },
  { code: "6", label: "6. Meal Offered/Accepted" },
  { code: "7", label: "7. Meal Offered/Refused" },
  { code: "8", label: "8. Fluids Offered/Accepted" },
  { code: "9", label: "9. Fluids Offered/Refused" },
  { code: "10", label: "10. Toilet Offered/Accepted" },
  { code: "11", label: "11. Toilet Offered/Refused" },
  { code: "12", label: "12. Bathing Offered/Accepted" },
  { code: "13", label: "13. Bathing Offered/Refused" },
  { code: "14", label: "14. Ambulated" },
  { code: "15", label: "15. Circulation ✓'ed" },
  { code: "16", label: "16. Vitals Taken" },
  { code: "17", label: "17. Repositioned" },
  { code: "18", label: "18. ROM exercises" },
  { code: "19", label: "19. Chemical Restraint" },
];

type Entry = { militaryTime: string; behaviorCode: string; interventionCode: string; staffInitials: string };
type StaffSig = { name: string; position: string; initials: string };
type FormValues = {
  logDate: string;
  location: string;
  notApplicable: boolean;
  entries: Entry[];
  staffSignatures: StaffSig[];
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function MonitoringLogForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    defaultValues: {
      entries: Array.from({ length: 12 }, () => ({ militaryTime: "", behaviorCode: "", interventionCode: "", staffInitials: "" })),
      staffSignatures: [{ name: "", position: "", initials: "" }, { name: "", position: "", initials: "" }],
    },
  });

  const { fields: entryFields } = useFieldArray({ control, name: "entries" });
  const { fields: sigFields, append: addSig } = useFieldArray({ control, name: "staffSignatures" });

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.logDate) missing.push("Log date");
    if (!data.notApplicable && !data.entries.some((e) => e.militaryTime?.trim())) missing.push("At least one monitoring log entry");
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          logDate: new Date(data.logDate).toISOString(),
          entries: data.entries.filter((e) => e.militaryTime),
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
      <SRSection title="1:1 Seclusion/Restraint Observation & Monitoring">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("notApplicable")} className="accent-blue-700" />
          Not applicable – Chemical restraint ONLY
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <SRField label="Date"><input type="date" {...register("logDate", { required: true })} className={inp} /></SRField>
          <SRField label="Location(s)"><input {...register("location")} className={inp} /></SRField>
        </div>

        <p className="text-xs text-gray-500">
          Document behaviors and interventions every <strong>15 minutes</strong> while in restraint or seclusion.
          If patient has a medical condition that could be adversely affected, monitor every <strong>5 minutes</strong>.
        </p>

        {/* Code key */}
        <div className="grid md:grid-cols-2 gap-4 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div>
            <p className="font-semibold text-gray-600 mb-1">Behaviors (B code)</p>
            {BEHAVIORS.map((b) => <div key={b.code}>{b.label}</div>)}
          </div>
          <div>
            <p className="font-semibold text-gray-600 mb-1">Interventions (I code)</p>
            {INTERVENTIONS.map((i) => <div key={i.code}>{i.label}</div>)}
          </div>
        </div>

        {/* Entry table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Military Time</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">B (Behavior)</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">I (Intervention)</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Initials</th>
              </tr>
            </thead>
            <tbody>
              {entryFields.map((f, i) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1">
                    <input {...register(`entries.${i}.militaryTime`)} placeholder="e.g. 1430" className="w-full border-0 outline-none text-sm" />
                  </td>
                  <td className="border border-gray-200 px-2 py-1">
                    <input {...register(`entries.${i}.behaviorCode`)} placeholder="A-O" className="w-full border-0 outline-none text-sm" />
                  </td>
                  <td className="border border-gray-200 px-2 py-1">
                    <input {...register(`entries.${i}.interventionCode`)} placeholder="1-19" className="w-full border-0 outline-none text-sm" />
                  </td>
                  <td className="border border-gray-200 px-2 py-1">
                    <input {...register(`entries.${i}.staffInitials`)} placeholder="Initials" className="w-full border-0 outline-none text-sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Staff signatures */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Staff Signatures</p>
          <div className="space-y-2">
            {sigFields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-3 gap-3">
                <SRField label="Staff Name"><input {...register(`staffSignatures.${i}.name`)} className={inp} /></SRField>
                <SRField label="Position"><input {...register(`staffSignatures.${i}.position`)} className={inp} /></SRField>
                <SRField label="Initials"><input {...register(`staffSignatures.${i}.initials`)} className={inp} /></SRField>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addSig({ name: "", position: "", initials: "" })} className="text-sm text-blue-600 hover:underline mt-2">
            + Add Staff
          </button>
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
