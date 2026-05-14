"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { SRSection, SRField, inp, btnPrimary, btnSecondary } from "./PhysicianOrderForm";

const MOODS = ["Euthymic", "Depressed", "Euphoric", "Anxious", "Angry", "Irritable", "Other"];
const AFFECTS = ["Appropriate", "Inappropriate", "Labile", "Elated", "Constricted", "Blunted", "Expansive", "Other"];
const DISCONTINUE_CRITERIA = [
  "No longer danger to self or others",
  "Comprehends behavior that warranted intervention",
  "1:1 Supervision",
  "Comprehends expected behaviors for release",
  "Improved mental status",
];

type FormValues = {
  evalDate: string;
  evalTime: string;
  patientResponse: string;
  vitalsBP: string;
  vitalsPulse: string;
  vitalsRespirations: string;
  vitalsPatientRefused: boolean;
  unstableMedical: string;
  unstableComment: string;
  adverseDrug: string;
  adverseDrugComment: string;
  respCardiac: string;
  respCardiacComment: string;
  painNeuro: string;
  painNeuroComment: string;
  limitedROM: string;
  limitedROMComment: string;
  skinBreakage: string;
  skinBreakageComment: string;
  injuriesFromRestraint: string;
  injuriesComment: string;
  orientPerson: boolean;
  orientPlace: boolean;
  orientTime: boolean;
  orientSituation: boolean;
  mood: string[];
  moodOther: string;
  affect: string[];
  affectOther: string;
  behaviorCooperative: string;
  abnormalFindings: string;
  abnormalComment: string;
  actionsTaken: string;
  healthReviewFactors: string;
  healthReviewDescription: string;
  continuedNeedNA: boolean;
  continuedNeedYes: boolean;
  continuedNeedNo: boolean;
  continuedNeedExplanation: string;
  discontinueCriteria: string[];
  discontinueOther: string;
  practitionerName: string;
  practitionerDate: string;
  practitionerTime: string;
  additionalOrders: string;
  additionalOrdersDescription: string;
  rnName: string;
  rnDate: string;
  rnTime: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function FaceToFaceForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: { mood: [], affect: [], discontinueCriteria: [] },
  });

  const mood = watch("mood") ?? [];
  const affect = watch("affect") ?? [];
  const discontinueCriteria = watch("discontinueCriteria") ?? [];

  function toggleArr(field: "mood" | "affect" | "discontinueCriteria", val: string) {
    const arr = field === "mood" ? mood : field === "affect" ? affect : discontinueCriteria;
    setValue(field, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function onSubmit(data: FormValues) {
    const missing: string[] = [];
    if (!data.evalDate) missing.push("Evaluation date");
    if (!data.evalTime) missing.push("Evaluation time");
    if (!data.practitionerName?.trim()) missing.push("Practitioner name");
    if (missing.length > 0) { setError("Please complete required fields:\n• " + missing.join("\n• ")); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/face-to-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          evalDate: new Date(data.evalDate).toISOString(),
          practitionerDate: data.practitionerDate ? new Date(data.practitionerDate).toISOString() : null,
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

  const YNField = ({ label, name, commentName }: { label: string; name: keyof FormValues; commentName: keyof FormValues }) => (
    <div className="flex items-start gap-3 text-sm py-1">
      <span className="w-64 shrink-0">{label}</span>
      <label className="flex items-center gap-1"><input type="radio" value="false" {...register(name)} className="accent-blue-700" /> No</label>
      <label className="flex items-center gap-1"><input type="radio" value="true" {...register(name)} className="accent-blue-700" /> Yes</label>
      <input {...register(commentName)} placeholder="Comments…" className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SRSection title="One Hour Face to Face Evaluation">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          *Must be completed within 1 hour of the START of the intervention*
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <SRField label="Date"><input type="date" {...register("evalDate", { required: true })} className={inp} /></SRField>
          <SRField label="Time"><input type="time" {...register("evalTime", { required: true })} className={inp} /></SRField>
        </div>

        {/* Patient Response */}
        <SRField label="Patient Response to the Intervention">
          <textarea {...register("patientResponse")} rows={3} className={`${inp} resize-y`}
            placeholder="Describe the patient's response including toleration, positive/negative behaviors, adverse psychological or physical reactions…" />
        </SRField>

        {/* Vital Signs */}
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium text-gray-700">Vital Signs</span>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" {...register("vitalsPatientRefused")} className="accent-blue-700" /> Patient Refused
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SRField label="B/P"><input {...register("vitalsBP")} className={inp} /></SRField>
            <SRField label="Pulse"><input {...register("vitalsPulse")} className={inp} /></SRField>
            <SRField label="Respirations"><input {...register("vitalsRespirations")} className={inp} /></SRField>
          </div>
        </div>

        {/* Signs/Symptoms */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Signs/Symptoms</p>
          <YNField label="Unstable medical condition:" name="unstableMedical" commentName="unstableComment" />
          <YNField label="Adverse drug reaction:" name="adverseDrug" commentName="adverseDrugComment" />
          <YNField label="Respiratory or cardiac distress:" name="respCardiac" commentName="respCardiacComment" />
          <YNField label="Pain/neurological abnormalities:" name="painNeuro" commentName="painNeuroComment" />
          <YNField label="Limited ROM upper/lower extremities:" name="limitedROM" commentName="limitedROMComment" />
          <YNField label="Skin Breakage:" name="skinBreakage" commentName="skinBreakageComment" />
          <YNField label="Injuries from restraint:" name="injuriesFromRestraint" commentName="injuriesComment" />
        </div>

        {/* Mental Status */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Mental Status/Behavioral Assessment</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Orientation</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30 text-sm">
                {["orientPerson", "orientPlace", "orientTime", "orientSituation"].map((f) => (
                  <label key={f} className="flex items-center gap-1.5">
                    <input type="checkbox" {...register(f as keyof FormValues)} className="accent-blue-700" />
                    {f.replace("orient", "")}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Behavior</p>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5"><input type="radio" value="cooperative" {...register("behaviorCooperative")} className="accent-blue-700" /> Cooperative</label>
                <label className="flex items-center gap-1.5"><input type="radio" value="uncooperative" {...register("behaviorCooperative")} className="accent-blue-700" /> Uncooperative</label>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Mood</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30 text-sm">
                {MOODS.map((m) => (
                  <label key={m} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={mood.includes(m)} onChange={() => toggleArr("mood", m)} className="accent-blue-700" />
                    {m}
                  </label>
                ))}
              </div>
              {mood.includes("Other") && <input {...register("moodOther")} placeholder="Other mood…" className={`${inp} mt-1`} />}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Affect</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30 text-sm">
                {AFFECTS.map((a) => (
                  <label key={a} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={affect.includes(a)} onChange={() => toggleArr("affect", a)} className="accent-blue-700" />
                    {a}
                  </label>
                ))}
              </div>
              {affect.includes("Other") && <input {...register("affectOther")} placeholder="Other affect…" className={`${inp} mt-1`} />}
            </div>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <div className="flex gap-3 items-center text-sm">
              <span>Abnormal findings:</span>
              <label className="flex items-center gap-1"><input type="radio" value="false" {...register("abnormalFindings")} className="accent-blue-700" /> No</label>
              <label className="flex items-center gap-1"><input type="radio" value="true" {...register("abnormalFindings")} className="accent-blue-700" /> Yes</label>
              <input {...register("abnormalComment")} placeholder="Comments…" className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" />
            </div>
          </div>
          <SRField label="Actions taken"><input {...register("actionsTaken")} className={`${inp} mt-1`} /></SRField>
        </div>

        {/* Health Review */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Review of Health Information/History</p>
          <p className="text-xs text-gray-500 mb-2">
            Are there any factors contributing to the patient&apos;s violent or self-destructive behavior?
          </p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-1"><input type="radio" value="false" {...register("healthReviewFactors")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-1"><input type="radio" value="true" {...register("healthReviewFactors")} className="accent-blue-700" /> Yes, describe:</label>
          </div>
          {watch("healthReviewFactors") === "true" && (
            <textarea {...register("healthReviewDescription")} rows={2} className={`${inp} resize-y`} />
          )}
        </div>

        {/* Criteria to Continue/Discontinue */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Criteria to Continue/Discontinue Restraint/Seclusion</p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" {...register("continuedNeedNA")} className="accent-blue-700" /> NA (chem restraint)</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("continuedNeedNo")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("continuedNeedYes")} className="accent-blue-700" /> Yes (explain):</label>
          </div>
          {watch("continuedNeedYes") && (
            <input {...register("continuedNeedExplanation")} className={`${inp} mb-3`} />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30 text-sm mb-2">
            {DISCONTINUE_CRITERIA.map((c) => (
              <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={discontinueCriteria.includes(c)} onChange={() => toggleArr("discontinueCriteria", c)} className="accent-blue-700" />
                {c}
              </label>
            ))}
            <div className="flex items-center gap-2">
              <span>Other:</span>
              <input {...register("discontinueOther")} className="border border-gray-200 rounded px-2 py-1 text-xs w-40" />
            </div>
          </div>
        </div>

        {/* Practitioner Notification */}
        <div className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Practitioner Notification</p>
          <div className="grid md:grid-cols-3 gap-3">
            <SRField label="Practitioner Name"><input {...register("practitionerName")} className={inp} /></SRField>
            <SRField label="Date"><input type="date" {...register("practitionerDate")} className={inp} /></SRField>
            <SRField label="Time"><input type="time" {...register("practitionerTime")} className={inp} /></SRField>
          </div>
          <div className="flex gap-4 text-sm">
            <span>Additional orders/direction received?</span>
            <label className="flex items-center gap-1"><input type="radio" value="false" {...register("additionalOrders")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-1"><input type="radio" value="true" {...register("additionalOrders")} className="accent-blue-700" /> Yes, describe:</label>
          </div>
          {watch("additionalOrders") === "true" && (
            <textarea {...register("additionalOrdersDescription")} rows={2} className={`${inp} resize-y`} />
          )}
        </div>

        {/* RN Signature */}
        <div className="grid md:grid-cols-3 gap-4">
          <SRField label="RN Name (Print)"><input {...register("rnName")} className={inp} /></SRField>
          <SRField label="Date"><input type="date" {...register("rnDate")} className={inp} /></SRField>
          <SRField label="Time"><input type="time" {...register("rnTime")} className={inp} /></SRField>
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
