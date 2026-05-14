"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import PatientSelector from "@/components/PatientSelector";
import SignaturePad from "@/components/SignaturePad";

// All incident category codes from the form
const INCIDENT_CATEGORIES = {
  "1 – Patient Care/Treatment": [
    { code: "1a", label: "Patient Injured – No Classification" },
    { code: "1b_actual", label: "Self Harm – Actual" },
    { code: "1b_attempted", label: "Self Harm – Attempted" },
    { code: "1c", label: "Recreational Injury" },
    { code: "1d_pp", label: "Physical Abuse/Neglect/Exploitation – Patient/Patient" },
    { code: "1d_ps", label: "Physical Abuse/Neglect/Exploitation – Patient/Staff" },
    { code: "1d_sp", label: "Physical Abuse/Neglect/Exploitation – Staff/Patient" },
    { code: "1e_pp", label: "Verbal Abuse – Patient/Patient" },
    { code: "1e_ps", label: "Verbal Abuse – Patient/Staff" },
    { code: "1e_sp", label: "Verbal Abuse – Staff/Patient" },
    { code: "1h", label: "Suicide Gesture" },
    { code: "1i", label: "Suicide Attempt" },
    { code: "1j_pre", label: "Medical/Psych Transfer (MOT) – Prior to Admissions" },
    { code: "1j_during", label: "Medical/Psych Transfer (MOT) – During Stay" },
    { code: "1k", label: "Change in Patient Condition" },
    { code: "1l", label: "Orders not carried out" },
    { code: "1m", label: "Seizure" },
    { code: "1n", label: "Patient in Unauthorized Area" },
    { code: "1o_signed", label: "AMA – Signed but rescinded" },
    { code: "1o_completed", label: "AMA – Completed" },
    { code: "1p", label: "Code Blue" },
  ],
  "2 – After Discharge Death": [
    { code: "2a", label: "Accidental" },
    { code: "2b", label: "Suicide" },
    { code: "2c", label: "Homicide" },
  ],
  "3 – Active Patient Death": [
    { code: "3a", label: "Accidental" },
    { code: "3b", label: "Suicide" },
    { code: "3c", label: "Homicide" },
    { code: "3d", label: "Medical" },
    { code: "3e", label: "Unknown – To be determined" },
  ],
  "4 – Boundary Allegations - Sexual": [
    { code: "4a", label: "Patient/Patient – Sexual Misconduct" },
    { code: "4b", label: "Patient/Staff or Staff/Patient – Sexual Misconduct" },
    { code: "4c", label: "Patient/Visitor – Sexual Misconduct" },
    { code: "4d", label: "Patient/Patient – Sexual Intercourse" },
    { code: "4e", label: "Patient/Staff or Staff/Patient – Sexual Intercourse" },
    { code: "4f", label: "Patient/Visitor – Sexual Intercourse" },
    { code: "4g", label: "Adult Consensual Intercourse" },
  ],
  "5 – Boundary Allegations - Non-Sexual": [
    { code: "5a", label: "Patient/Patient" },
    { code: "5b", label: "Patient/Staff or Staff/Patient" },
    { code: "5c", label: "Patient/Visitor" },
  ],
  "6 – Elopement": [
    { code: "6a", label: "Elopement Attempt" },
    { code: "6b", label: "Elopement Completion" },
  ],
  "7 – Laboratory": [
    { code: "7a", label: "Specimen Lost" },
    { code: "7b", label: "Specimen Not Collected" },
    { code: "7c", label: "Test Report Delay" },
    { code: "7d", label: "Test Results Not Found in the EMR" },
  ],
  "8 – Physical Confrontation – with injury": [
    { code: "8a", label: "Patient/Patient" },
    { code: "8b", label: "Patient/Staff" },
    { code: "8c", label: "Patient/Visitor" },
  ],
  "9 – Physical Confrontation - without injury": [
    { code: "9a", label: "Patient/Patient" },
    { code: "9b", label: "Patient/Staff" },
    { code: "9c", label: "Patient/Visitor" },
  ],
  "10 – Contraband": [
    { code: "10a", label: "Milieu Contraband" },
    { code: "10b", label: "Dangerous Contraband/Weapon" },
    { code: "10c", label: "Drugs/Illicit substances" },
  ],
  "11 – Medication Variance": [
    { code: "11a", label: "Incorrect Medication" },
    { code: "11b", label: "Incorrect Patient" },
    { code: "11c", label: "Incorrect Dosage" },
    { code: "11d", label: "Incorrect Time" },
    { code: "11e", label: "Incorrect Route" },
    { code: "11f", label: "Omitted Medication" },
    { code: "11g", label: "Transcription" },
    { code: "11h", label: "Administered w/o proper consent" },
    { code: "11i", label: "Adverse Drug Reaction" },
    { code: "11j", label: "Drug Count Variance" },
  ],
  "12 – Pharmacy": [
    { code: "12a", label: "Incorrect Medication Dispensed" },
    { code: "12b", label: "Incorrect Label" },
    { code: "12c", label: "Dispense Delay" },
    { code: "12d", label: "Unavailable Medication" },
  ],
  "13 – Falls": [
    { code: "13a_pt", label: "Observed Fall – Patient" },
    { code: "13a_vis", label: "Observed Fall – Visitor" },
    { code: "13b_pt", label: "Unobserved Fall – Patient" },
    { code: "13b_vis", label: "Unobserved Fall – Visitor" },
  ],
  "14 – Security/Information Management": [
    { code: "14a", label: "Personal Property Stolen" },
    { code: "14b", label: "Facility Property Stolen" },
    { code: "14c", label: "Lost or Missing Keys" },
    { code: "14d", label: "HIPAA Violation" },
    { code: "14e", label: "Equipment Malfunction" },
    { code: "14f", label: "Improper Needle Disposal" },
    { code: "14g", label: "Threat of Legal Action" },
    { code: "14h", label: "Infection Control Issue" },
    { code: "14i", label: "Property Damage" },
  ],
  "15 – External Abuse Disclosure (Pre-Admission/Non-Facility Related)": [
    { code: "15a", label: "Parent/Guardian" },
    { code: "15b", label: "Other (e.g., foster care, teacher, peer)" },
    { code: "15c", label: "Another Facility/Setting" },
  ],
  "16 – Other": [{ code: "16", label: "Other (describe in summary)" }],
};

const UNITS = ["Koi", "Monarch", "Cicada", "Phoenix", "Intake", "Lotus", "Reception"];
const LOCATIONS = [
  "Courtyard", "Hallway", "Patient's Room", "Art Room", "Day Room", "Lobby",
  "Seclusion", "Bathroom", "Entrance", "Nurse's Station", "Sensory Room",
  "Café", "Gym", "Office", "Other",
];
const NOTIFICATION_PARTIES = [
  "Police/Fire", "Family", "Guardian", "External Agency",
  "Maintenance", "Provider", "Treatment Team", "AOC", "Other",
];

type FormValues = {
  patientId: string;
  reporterName: string;
  incidentDate: string;
  incidentTime: string;
  unit: string;
  location: string;
  locationOther: string;
  categories: string[];
  summaryOfEvent: string;
  noOtherWitnesses: boolean;
  witnesses: { name: string; isStaff: boolean; contactOrOther: string }[];
  // Page 2
  nursingAssessmentNA: boolean;
  nursingAssessment: string;
  painScale: string;
  patientDeniesPain: boolean;
  nurseAssessorName: string;
  nurseAssessorDate: string;
  nurseAssessorTime: string;
  interventionsNA: boolean;
  interventionPrnMed: boolean;
  interventionLos: boolean;
  interventionOneToOne: boolean;
  interventionUnitRestriction: boolean;
  interventionUnitChange: boolean;
  interventionRoomChange: boolean;
  interventionTreatmentRefused: boolean;
  interventionSAndR: boolean;
  interventionPrecautions: string;
  interventionXray: boolean;
  interventionFirstAid: boolean;
  interventionAdminDischarge: boolean;
  interventionTransferHosp: string;
  interventionTransferVia: string;
  interventionOtherBH: string;
  interventionOther: string;
  notificationsNA: boolean;
  notifications: { party: string; name: string; contactMethod: string; date: string; time: string }[];
  signature: string;
  nurseSignature: string;
};

export default function NewIncidentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState(false);
  const [signatureError, setSignatureError] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      patientId: "",
      reporterName: session?.user.name ?? "",
      categories: [],
      witnesses: [],
      noOtherWitnesses: false,
      notifications: NOTIFICATION_PARTIES.map((p) => ({ party: p, name: "", contactMethod: "", date: "", time: "" })),
      notificationsNA: false,
      interventionsNA: false,
      nursingAssessmentNA: false,
      signature: "",
      nurseSignature: "",
    },
  });

  const { fields: witnessFields, append: addWitness, remove: removeWitness } = useFieldArray({ control, name: "witnesses" });
  const categories = watch("categories") ?? [];
  const signature = watch("signature");
  const nurseSignature = watch("nurseSignature");
  const noOtherWitnesses = watch("noOtherWitnesses");
  const notificationsNA = watch("notificationsNA");
  const nursingAssessmentNA = watch("nursingAssessmentNA");
  const interventionsNA = watch("interventionsNA");
  const location = watch("location");

  function toggleCategory(code: string) {
    if (categories.includes(code)) {
      setValue("categories", categories.filter((c) => c !== code));
    } else {
      setValue("categories", [...categories, code]);
    }
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          signature: data.signature || null,
          nurseSignature: data.nurseSignature || null,
          painScale: data.painScale ? parseInt(data.painScale) : null,
          incidentDate: new Date(data.incidentDate).toISOString(),
          nurseAssessorDate: data.nurseAssessorDate ? new Date(data.nurseAssessorDate).toISOString() : null,
          witnesses: data.noOtherWitnesses ? [] : data.witnesses,
          notifications: data.notificationsNA
            ? []
            : data.notifications.filter((n) => n.name || n.contactMethod),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const report = await res.json();
      router.push(`/dashboard/incidents/${report.id}`);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Report</h1>
          <p className="text-sm text-gray-500">One IR per patient. No sections left blank.</p>
        </div>
        <div className="flex gap-2">
          <PageTab n={1} current={page} onClick={() => setPage(1)} label="Page 1" />
          <PageTab n={2} current={page} onClick={() => setPage(2)} label="Page 2" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {page === 1 && (
          <>
            {/* Staff Reporting */}
            <Section title="Staff Reporting Incident">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Name (Print)" error={errors.reporterName?.message}>
                  <input {...register("reporterName", { required: "Name is required" })} className={input} />
                </Field>
                <Field label="Date">
                  <input type="date" disabled value={new Date().toISOString().split("T")[0]} className={`${input} bg-gray-50`} />
                </Field>
              </div>
            </Section>

            {/* Patient */}
            <Section title="Patient Information">
              <PatientSelector
                value={watch("patientId")}
                onChange={(id) => setValue("patientId", id, { shouldValidate: true })}
              />
              <input type="hidden" {...register("patientId", { required: "Patient is required" })} />
              {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
            </Section>

            {/* Incident Information */}
            <Section title="Incident Information">
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Date" error={errors.incidentDate?.message}>
                  <input type="date" {...register("incidentDate", { required: "Date is required" })} className={input} />
                </Field>
                <Field label="Time" error={errors.incidentTime?.message}>
                  <input type="time" {...register("incidentTime", { required: "Time is required" })} className={input} />
                </Field>
                <Field label="Unit" error={errors.unit?.message}>
                  <select {...register("unit", { required: "Unit is required" })} className={input}>
                    <option value="">Select unit…</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Location" error={errors.location?.message}>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LOCATIONS.map((loc) => (
                    <label key={loc} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        value={loc}
                        {...register("location", { required: "Location is required" })}
                        className="accent-blue-700"
                      />
                      {loc}
                    </label>
                  ))}
                </div>
              </Field>
              {location === "Other" && (
                <Field label="Other Location">
                  <input {...register("locationOther")} placeholder="Specify location…" className={input} />
                </Field>
              )}
            </Section>

            {/* Incident Categories */}
            <Section title="Incident Type (Check all that apply)">
              <div className="space-y-4">
                {Object.entries(INCIDENT_CATEGORIES).map(([group, items]) => (
                  <div key={group} className="border border-blue-200 rounded-md p-3 bg-blue-50/30">
                    <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">{group}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                      {items.map((item) => (
                        <label key={item.code} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={categories.includes(item.code)}
                            onChange={() => toggleCategory(item.code)}
                            className="accent-blue-700 rounded"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {(categories.length === 0 || categoryError) && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {categoryError ? "At least one incident type must be selected before proceeding." : "At least one category should be selected."}
                </p>
              )}
            </Section>

            {/* Summary */}
            <Section title="Summary of Event">
              <textarea
                {...register("summaryOfEvent", { required: "Summary is required" })}
                rows={5}
                className={`${input} resize-y`}
                placeholder="Describe the event in detail…"
              />
              {errors.summaryOfEvent && <p className="text-red-500 text-xs mt-1">{errors.summaryOfEvent.message}</p>}
            </Section>

            {/* Witnesses */}
            <Section title="Witnesses / Other Parties">
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" {...register("noOtherWitnesses")} className="accent-blue-700" />
                Not applicable, no other witnesses involved
              </label>
              {!noOtherWitnesses && (
                <div className="space-y-3">
                  {witnessFields.map((f, i) => (
                    <div key={f.id} className="grid md:grid-cols-4 gap-2 items-end">
                      <Field label="Name">
                        <input {...register(`witnesses.${i}.name`)} className={input} />
                      </Field>
                      <Field label="Type">
                        <select {...register(`witnesses.${i}.isStaff`)} className={input}>
                          <option value="false">Other</option>
                          <option value="true">Staff</option>
                        </select>
                      </Field>
                      <Field label="Contact # / Other">
                        <input {...register(`witnesses.${i}.contactOrOther`)} className={input} />
                      </Field>
                      <button type="button" onClick={() => removeWitness(i)} className="text-red-500 text-sm pb-1 hover:underline">Remove</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addWitness({ name: "", isStaff: false, contactOrOther: "" })}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add Witness
                  </button>
                </div>
              )}
            </Section>

            {/* Reporter Signature */}
            <Section title="Reporter Signature">
              <SignaturePad
                value={signature}
                onChange={(v) => { setValue("signature", v); if (v) setSignatureError(false); }}
                error={signatureError ? "Signature is required before proceeding" : undefined}
              />
            </Section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  const page1Fields: (keyof FormValues)[] = [
                    "reporterName", "patientId", "incidentDate",
                    "incidentTime", "unit", "location", "summaryOfEvent",
                  ];
                  const valid = await trigger(page1Fields);
                  const hasCategories = categories.length > 0;
                  const hasSig = !!signature;
                  setCategoryError(!hasCategories);
                  setSignatureError(!hasSig);
                  if (valid && hasCategories && hasSig) setPage(2);
                }}
                className={btnPrimary}
              >
                Next: Page 2 →
              </button>
            </div>
          </>
        )}

        {page === 2 && (
          <>
            {/* Nursing Assessment */}
            <Section title="Nursing Assessment">
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" {...register("nursingAssessmentNA")} className="accent-blue-700" />
                Not applicable
              </label>
              {!nursingAssessmentNA && (
                <>
                  <textarea {...register("nursingAssessment")} rows={4} className={`${input} resize-y`} placeholder="Describe nursing assessment findings…" />
                  <div className="flex flex-wrap gap-4 mt-3">
                    <Field label="Pain Scale (0–10)">
                      <input type="number" min={0} max={10} {...register("painScale")} className={`${input} w-24`} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm self-end pb-2">
                      <input type="checkbox" {...register("patientDeniesPain")} className="accent-blue-700" />
                      Patient denies pain; no physical evidence noted
                    </label>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Field label="Nurse's Name">
                      <input {...register("nurseAssessorName")} className={input} />
                    </Field>
                    <Field label="Date">
                      <input type="date" {...register("nurseAssessorDate")} className={input} />
                    </Field>
                    <Field label="Time">
                      <input type="time" {...register("nurseAssessorTime")} className={input} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <SignaturePad
                      label="Nurse's Signature"
                      value={nurseSignature}
                      onChange={(v) => setValue("nurseSignature", v)}
                      error={errors.nurseSignature?.message}
                    />
                  </div>
                </>
              )}
            </Section>

            {/* Interventions */}
            <Section title="Interventions or Treatment Given">
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" {...register("interventionsNA")} className="accent-blue-700" />
                Not applicable, no interventions or treatment needed/given
              </label>
              {!interventionsNA && (
                <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border border-blue-200 rounded-md p-3 bg-blue-50/30">
                    {[
                      ["interventionPrnMed", "PRN Med"],
                      ["interventionLos", "Placed on LOS"],
                      ["interventionOneToOne", "Placed on 1:1"],
                      ["interventionUnitRestriction", "Unit Restriction"],
                      ["interventionUnitChange", "Unit Change"],
                      ["interventionRoomChange", "Room Change"],
                      ["interventionTreatmentRefused", "Treatment Refused"],
                      ["interventionSAndR", "S&R"],
                      ["interventionXray", "X-ray"],
                      ["interventionFirstAid", "First Aid"],
                      ["interventionAdminDischarge", "Administrative Discharge"],
                    ].map(([name, label]) => (
                      <label key={name} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" {...register(name as keyof FormValues)} className="accent-blue-700" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <Field label="Precautions added">
                      <input {...register("interventionPrecautions")} className={input} />
                    </Field>
                    <Field label="Transfer to Med/Surg Hospital">
                      <input {...register("interventionTransferHosp")} className={input} placeholder="Hospital name…" />
                    </Field>
                    <Field label="Transfer Via (EMT / Facility Vehicle / Other)">
                      <input {...register("interventionTransferVia")} className={input} />
                    </Field>
                    <Field label="Other Behavioral Health Treatment">
                      <input {...register("interventionOtherBH")} className={input} />
                    </Field>
                    <Field label="Other">
                      <input {...register("interventionOther")} className={input} />
                    </Field>
                  </div>
                </div>
              )}
            </Section>

            {/* Notifications */}
            <Section title="Notifications">
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" {...register("notificationsNA")} className="accent-blue-700" />
                Not applicable, notification not required
              </label>
              {!notificationsNA && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700 w-8">Yes</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">Party</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">Name</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">Contact Method</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">Date</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIFICATION_PARTIES.map((party, i) => (
                        <tr key={party} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 border border-gray-200 text-center">
                            <input type="checkbox" className="accent-blue-700" />
                          </td>
                          <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-700">{party}</td>
                          <td className="px-3 py-1.5 border border-gray-200">
                            <input {...register(`notifications.${i}.name`)} className="w-full border-0 outline-none text-sm" />
                          </td>
                          <td className="px-3 py-1.5 border border-gray-200">
                            <input {...register(`notifications.${i}.contactMethod`)} className="w-full border-0 outline-none text-sm" />
                          </td>
                          <td className="px-3 py-1.5 border border-gray-200">
                            <input type="date" {...register(`notifications.${i}.date`)} className="w-full border-0 outline-none text-sm" />
                          </td>
                          <td className="px-3 py-1.5 border border-gray-200">
                            <input type="time" {...register(`notifications.${i}.time`)} className="w-full border-0 outline-none text-sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setPage(1)} className={btnSecondary}>
                ← Back to Page 1
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Saving…" : "Submit Incident Report"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
}

function PageTab({ n, current, onClick, label }: { n: number; current: number; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
        current === n ? "bg-blue-700 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

const input = "w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const btnPrimary = "bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60";
const btnSecondary = "border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition";
