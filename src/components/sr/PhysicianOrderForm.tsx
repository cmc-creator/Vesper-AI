"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { useState } from "react";

const LESS_RESTRICTIVE = [
  "Separated from Group/Milieu", "Allowing to pace and vent", "Distraction",
  "Express feelings appropriately", "Physical Activity", "Time Out (Voluntary)",
  "Conflict Resolution", "Verbal De-escalation", "Relaxation Activity",
  "Redirect Patient's Focus", "Offering food or drinks", "Team Support",
  "Offering PRN Medication", "1:1 Processing", "Other",
];

const RELEASE_CRITERIA = [
  "No risk for danger to self", "No risk for danger to others",
  "Improvement of mental status", "Medication administration completed.",
  "Able to follow verbal commands.", "Meets all criteria for release.",
];

type ChemMed = { date: string; time: string; medication: string; dosage: string; route: string };
type FormValues = {
  isPhysicalRestraint: boolean;
  physRestDate: string;
  physRestStartTime: string;
  physRestEndTime: string;
  isSeclusion: boolean;
  seclusionDate: string;
  seclusionStartTime: string;
  seclusionEndTime: string;
  isChemicalRestraint: boolean;
  chemPatientVoluntary: string;
  chemAllergiesVerified: boolean;
  chemMedications: ChemMed[];
  medicalConditionContraindication: boolean;
  medicalConditionExplanation: string;
  reasonDTO: boolean;
  reasonDTS: boolean;
  reasonDescription: string;
  lessRestrictiveMeans: string[];
  criteriaForRelease: string[];
  criteriaOther: string;
  criteriaNA: boolean;
  patientInformedYes: boolean;
  patientInformedNo: boolean;
  patientInformedNA: boolean;
  isTelephoneOrder: boolean;
  isReadBack: boolean;
  nurseName: string;
  nurseDate: string;
  nurseTime: string;
  physicianName: string;
  physicianDate: string;
  physicianTime: string;
};

interface Props { srPacketId: string; onNext: () => void; onBack: () => void; }

export default function PhysicianOrderForm({ srPacketId, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      chemMedications: [{ date: "", time: "", medication: "", dosage: "", route: "IM" }],
      lessRestrictiveMeans: [],
      criteriaForRelease: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: undefined as unknown as ReturnType<typeof useForm>["control"], name: "chemMedications" } as Parameters<typeof useFieldArray>[0]);
  // Note: workaround — using watch for arrays
  const lrm = watch("lessRestrictiveMeans") ?? [];
  const criteria = watch("criteriaForRelease") ?? [];

  function toggleArray(field: "lessRestrictiveMeans" | "criteriaForRelease", val: string) {
    const arr = field === "lessRestrictiveMeans" ? lrm : criteria;
    if (arr.includes(val)) {
      setValue(field, arr.filter((v) => v !== val));
    } else {
      setValue(field, [...arr, val]);
    }
  }

  async function onSubmit(data: FormValues) {
    // Required field validation
    const missing: string[] = [];
    if (!data.isPhysicalRestraint && !data.isSeclusion && !data.isChemicalRestraint) {
      missing.push("Type of intervention must be selected (Physical Restraint, Seclusion, or Chemical Restraint)");
    }
    if (!data.reasonDescription?.trim()) missing.push("Reason for intervention description");
    if (!data.nurseName?.trim()) missing.push("Nurse name");
    if (!data.nurseDate) missing.push("Nurse date");
    if (!data.nurseTime) missing.push("Nurse time");
    if (!data.physicianName?.trim()) missing.push("Physician name");
    if (!data.physicianDate) missing.push("Physician date");
    if (!data.physicianTime) missing.push("Physician time");
    if (missing.length > 0) {
      setError("Please complete required fields:\n• " + missing.join("\n• "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sr-packets/physician-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          srPacketId,
          physRestDate: data.physRestDate ? new Date(data.physRestDate).toISOString() : null,
          seclusionDate: data.seclusionDate ? new Date(data.seclusionDate).toISOString() : null,
          nurseDate: data.nurseDate ? new Date(data.nurseDate).toISOString() : null,
          physicianDate: data.physicianDate ? new Date(data.physicianDate).toISOString() : null,
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
      <SRSection title="Seclusion & Restraint Physician Order">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
          An order must be obtained for every episode of SECLUSION, RESTRAINT or CHEMICAL RESTRAINT, no longer than 30 minutes after initiation.
          ****If a gap of 15 minutes or greater exists between interventions, a NEW S&amp;R packet must be completed.****
        </p>

        {/* Type of Intervention */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Type of Intervention</h4>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 font-medium text-sm">
              <input type="checkbox" {...register("isPhysicalRestraint")} className="accent-blue-700" />
              Physical Restraint
            </label>
            {watch("isPhysicalRestraint") && (
              <div className="grid grid-cols-3 gap-3 ml-6">
                <SRField label="Date"><input type="date" {...register("physRestDate")} className={inp} /></SRField>
                <SRField label="Start Time"><input type="time" {...register("physRestStartTime")} className={inp} /></SRField>
                <SRField label="End Time"><input type="time" {...register("physRestEndTime")} className={inp} /></SRField>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 font-medium text-sm">
              <input type="checkbox" {...register("isSeclusion")} className="accent-blue-700" />
              Seclusion
            </label>
            {watch("isSeclusion") && (
              <div className="grid grid-cols-3 gap-3 ml-6">
                <SRField label="Date"><input type="date" {...register("seclusionDate")} className={inp} /></SRField>
                <SRField label="Start Time"><input type="time" {...register("seclusionStartTime")} className={inp} /></SRField>
                <SRField label="End Time"><input type="time" {...register("seclusionEndTime")} className={inp} /></SRField>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 font-medium text-sm">
              <input type="checkbox" {...register("isChemicalRestraint")} className="accent-blue-700" />
              Chemical Restraint
            </label>
            {watch("isChemicalRestraint") && (
              <div className="ml-6 space-y-3">
                <div className="flex gap-4 items-center text-sm">
                  <span>Did patient take medication voluntarily?</span>
                  <label className="flex items-center gap-1"><input type="radio" value="true" {...register("chemPatientVoluntary")} className="accent-blue-700" /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" value="false" {...register("chemPatientVoluntary")} className="accent-blue-700" /> No</label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("chemAllergiesVerified")} className="accent-blue-700" />
                  Patients&apos; allergies were verified prior to obtaining orders for chemical restraint.
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-5 gap-2">
                      <SRField label="Date"><input type="date" {...register(`chemMedications.${i}.date` as const)} className={inp} /></SRField>
                      <SRField label="Time"><input type="time" {...register(`chemMedications.${i}.time` as const)} className={inp} /></SRField>
                      <SRField label="Medication"><input {...register(`chemMedications.${i}.medication` as const)} className={inp} /></SRField>
                      <SRField label="Dosage"><input {...register(`chemMedications.${i}.dosage` as const)} className={inp} /></SRField>
                      <SRField label="Route">
                        <select {...register(`chemMedications.${i}.route` as const)} className={inp}>
                          <option>IM</option>
                          <option>PO</option>
                        </select>
                      </SRField>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical Condition */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Medical Condition</p>
          <p className="text-xs text-gray-500 mb-2">Does the patient have any medical history/condition that could be adversely affected by a seclusion and/or restraint?</p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-1"><input type="radio" value="false" {...register("medicalConditionContraindication")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-1"><input type="radio" value="true" {...register("medicalConditionContraindication")} className="accent-blue-700" /> Yes (5 min observation required)</label>
          </div>
          {watch("medicalConditionContraindication") && (
            <SRField label="Explain">
              <input {...register("medicalConditionExplanation")} className={inp} />
            </SRField>
          )}
        </div>

        {/* Reason */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Reason for Intervention</p>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" {...register("reasonDTO")} className="accent-blue-700" /> DTO</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register("reasonDTS")} className="accent-blue-700" /> DTS</label>
          </div>
          <textarea
            {...register("reasonDescription")}
            rows={3}
            className={`${inp} resize-y`}
            placeholder="Describe facts/behaviors justifying the use of restraint or seclusion. Be descriptive (e.g., 'hitting and kicking staff')…"
          />
        </div>

        {/* Less Restrictive Means */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Less Restrictive Means Tried Prior to Intervention</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30">
            {LESS_RESTRICTIVE.map((item) => (
              <label key={item} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={lrm.includes(item)}
                  onChange={() => toggleArray("lessRestrictiveMeans", item)}
                  className="accent-blue-700"
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        {/* Criteria for Release */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Criteria for Release</p>
          <p className="text-xs text-blue-700 font-medium mb-2">
            2 HOURS FOR INDIVIDUALS 9–17 &nbsp;|&nbsp; 3 HOURS FOR INDIVIDUALS 18 AND OLDER
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30 mb-2">
            {RELEASE_CRITERIA.map((item) => (
              <label key={item} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={criteria.includes(item)}
                  onChange={() => toggleArray("criteriaForRelease", item)}
                  className="accent-blue-700"
                />
                {item}
              </label>
            ))}
          </div>
          <div className="flex gap-4 items-center">
            <SRField label="Other"><input {...register("criteriaOther")} className={`${inp} w-48`} /></SRField>
            <label className="flex items-center gap-1.5 text-sm self-end pb-1">
              <input type="checkbox" {...register("criteriaNA")} className="accent-blue-700" /> NA – Chemical only
            </label>
          </div>
        </div>

        {/* Patient Informed */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Patient informed of reason for seclusion/restraint and criteria for release:</p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" value="yes" {...register("patientInformedYes")} className="accent-blue-700" /> Yes</label>
            <label className="flex items-center gap-1"><input type="radio" value="no" {...register("patientInformedYes")} className="accent-blue-700" /> No</label>
            <label className="flex items-center gap-1"><input type="radio" value="na" {...register("patientInformedNA")} className="accent-blue-700" /> NA (Chemical restraint)</label>
          </div>
        </div>

        {/* Telephone Order */}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" {...register("isTelephoneOrder")} className="accent-blue-700" /> Telephone Order</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...register("isReadBack")} className="accent-blue-700" /> Order Read Back, if necessary</label>
        </div>

        {/* Signatures */}
        <div className="border-t border-gray-100 pt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Nurse</p>
              <SRField label="Name"><input {...register("nurseName")} className={inp} /></SRField>
              <div className="grid grid-cols-2 gap-2">
                <SRField label="Date"><input type="date" {...register("nurseDate")} className={inp} /></SRField>
                <SRField label="Time"><input type="time" {...register("nurseTime")} className={inp} /></SRField>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Physician</p>
              <SRField label="Name"><input {...register("physicianName")} className={inp} /></SRField>
              <div className="grid grid-cols-2 gap-2">
                <SRField label="Date"><input type="date" {...register("physicianDate")} className={inp} /></SRField>
                <SRField label="Time"><input type="time" {...register("physicianTime")} className={inp} /></SRField>
              </div>
            </div>
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

export function SRSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

export function SRField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
      {children}
    </div>
  );
}

export const inp = "w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
export const btnPrimary = "bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60";
export const btnSecondary = "border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition";
