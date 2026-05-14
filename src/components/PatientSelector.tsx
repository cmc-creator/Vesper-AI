"use client";
import { useEffect, useState } from "react";

interface Patient {
  id: string;
  fullName: string;
  dob: string;
  mrn: string;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export default function PatientSelector({ value, onChange }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: "", dob: "", mrn: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {});
  }, []);

  async function createPatient() {
    if (!form.fullName || !form.dob || !form.mrn) return;
    setSaving(true);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const patient = await res.json();
    setPatients((prev) => [...prev, patient]);
    onChange(patient.id);
    setShowCreate(false);
    setSaving(false);
  }

  const selected = patients.find((p) => p.id === value);

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Select Patient</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — MRN {p.mrn}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + New Patient
          </button>
        </div>
      </div>

      {selected && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm">
          <strong>{selected.fullName}</strong> &nbsp;·&nbsp; DOB: {new Date(selected.dob).toLocaleDateString()} &nbsp;·&nbsp; MRN: {selected.mrn}
        </div>
      )}

      {showCreate && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Add New Patient</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">MRN</label>
              <input
                value={form.mrn}
                onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={createPatient}
              disabled={saving}
              className="bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-800 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Patient"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
