"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

const CPI_QUESTIONS: { num: number; text: string }[] = [
  { num: 7, text: "Were other patients removed from the area?" },
  { num: 8, text: "Did the staff utilize appropriate holds?" },
  { num: 9, text: "Did the team leader remind the patient of choices/options?" },
  { num: 10, text: "Did the team leader plan and control the intervention?" },
  { num: 11, text: "Did the team respond to the team leader direction?" },
  { num: 12, text: "Did the team follow the CPI process?" },
  { num: 13, text: "Was the team leader or assigned staff the only one communicating with the patient?" },
  { num: 14, text: "Did the team leader allow patient alternatives?" },
];

type StaffRow = { name: string; credentials: string };
type CPIResponse = { answer: "YES" | "NO" | "NA" | "" };
type FormValues = {
  debriefDate: string;
  debriefTime: string;
  staffRows: StaffRow[];
  eventInitiators: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  cpiResponses: CPIResponse[];
  cpiExplanation: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function StaffDebriefingForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      staffRows: [
        { name: "", credentials: "" }, // LEADER
        { name: "", credentials: "" },
        { name: "", credentials: "" },
        { name: "", credentials: "" },
        { name: "", credentials: "" },
        { name: "", credentials: "" },
      ],
      cpiResponses: Array.from({ length: 8 }, () => ({ answer: "" })),
    },
  });

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.debriefDate) missing.push("Debrief date");
    if (!data.debriefTime) missing.push("Debrief time");
    if (!data.staffRows?.[0]?.name?.trim()) missing.push("Team leader name (Staff row 1)");
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/staff-debriefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          debriefDate: new Date(data.debriefDate).toISOString(),
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

  const staffLabels = ["LEADER", "Staff 2", "Staff 3", "Staff 4", "Staff 5", "Staff 6"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SRSection title="Staff Debriefing">
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          DO NOT FILE IN PATIENT RECORD
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <SRField label="Date"><input type="date" {...register("debriefDate", { required: true })} className={inp} /></SRField>
          <SRField label="Time"><input type="time" {...register("debriefTime")} className={inp} /></SRField>
        </div>

        {/* Staff Table */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Staff Present</p>
          <div className="space-y-2">
            {staffLabels.map((label, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <SRField label={label}><input {...register(`staffRows.${i}.name` as const)} placeholder="Name" className={inp} /></SRField>
                <SRField label="Credentials"><input {...register(`staffRows.${i}.credentials` as const)} className={inp} /></SRField>
              </div>
            ))}
          </div>
        </div>

        <SRField label="Name(s) of Individual(s) Who Initiated the Event">
          <input {...register("eventInitiators")} className={inp} />
        </SRField>

        {/* Numbered Questions */}
        {[
          { key: "q1", label: "1. Identify intervention opportunities that may have prevented the incident:" },
          { key: "q2", label: "2. Things that were done well and/or team strengths:" },
          { key: "q3", label: "3. Ways the team could strengthen their response to future incidents:" },
          { key: "q4", label: "4. Information discussed during debriefing (events + strategies):" },
          { key: "q5", label: "5. Procedures that can be implemented to prevent reoccurrence:" },
          { key: "q6", label: "6. Outcome of debriefing (actions to avoid future S/R, alternatives):" },
        ].map(({ key, label }) => (
          <SRField key={key} label={label}>
            <textarea {...register(key as keyof FormValues)} rows={3} className={`${inp} resize-y`} />
          </SRField>
        ))}

        {/* CPI Questions 7-14 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">CPI / Process Questions</p>
          <div className="space-y-2">
            {CPI_QUESTIONS.map((q, i) => (
              <div key={q.num} className="flex items-start gap-4 text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="w-8 shrink-0 font-medium text-gray-500">{q.num}.</span>
                <span className="flex-1">{q.text}</span>
                <div className="flex gap-3 shrink-0">
                  {(["YES", "NO", "NA"] as const).map((opt) => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" value={opt} {...register(`cpiResponses.${i}.answer` as const)} className="accent-blue-700" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <SRField label="Explain any NO responses (#7–#14):">
          <textarea {...register("cpiExplanation")} rows={3} className={`${inp} resize-y`} />
        </SRField>
      </SRSection>

      {error && <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded px-4 py-3 whitespace-pre-line">{error}</div>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save & Next →"}</button>
      </div>
    </form>
  );
}
