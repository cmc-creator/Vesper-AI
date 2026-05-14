"use client";

import { useState, useRef, useEffect } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";

interface QMReviewData {
  reviewedByName?: string | null;
  reviewedByDate?: Date | string | null;
  incidentLevel?: string | null;
  qmReviewInitials?: string | null;
  qmComments?: string | null;
  qmSignature?: string | null;
}

interface Props {
  incidentId: string;
  initial: QMReviewData;
  canEdit: boolean;
}

const LEVELS = ["I", "II", "III", "IV"] as const;

export default function QMReviewSection({ incidentId, initial, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<QMReviewData>(initial);

  // form state
  const [name, setName] = useState(initial.reviewedByName ?? "");
  const [date, setDate] = useState(
    initial.reviewedByDate
      ? format(new Date(initial.reviewedByDate as string), "yyyy-MM-dd")
      : ""
  );
  const [level, setLevel] = useState(initial.incidentLevel ?? "");
  const [initials, setInitials] = useState(initial.qmReviewInitials ?? "");
  const [comments, setComments] = useState(initial.qmComments ?? "");
  const [sigError, setSigError] = useState(false);
  const sigRef = useRef<ReactSignatureCanvas>(null);

  // Pre-populate canvas if there's an existing sig
  useEffect(() => {
    if (editing && initial.qmSignature && sigRef.current) {
      sigRef.current.fromDataURL(initial.qmSignature, {
        width: 520,
        height: 110,
      });
    }
  }, [editing, initial.qmSignature]);

  async function save() {
    const sigEmpty =
      !sigRef.current || sigRef.current.isEmpty();
    if (sigEmpty) {
      setSigError(true);
      return;
    }
    setSigError(false);
    setSaving(true);

    const qmSignature = sigRef.current!.getTrimmedCanvas().toDataURL("image/png");

    const res = await fetch(`/api/incidents/${incidentId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewedByName: name,
        reviewedByDate: date || null,
        incidentLevel: level || null,
        qmReviewInitials: initials,
        qmComments: comments,
        qmSignature,
      }),
    });

    if (res.ok) {
      setData({
        reviewedByName: name,
        reviewedByDate: date || null,
        incidentLevel: level || null,
        qmReviewInitials: initials,
        qmComments: comments,
        qmSignature,
      });
      setEditing(false);
    }
    setSaving(false);
  }

  const hasReview = !!(data.reviewedByName || data.incidentLevel);

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            QM / Risk Management Review
          </h3>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {hasReview ? "Edit Review" : "+ Add Review"}
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {!hasReview ? (
            <p className="text-sm text-gray-400 italic">No QM review recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {data.incidentLevel && <Row label="Incident Level" value={`Level ${data.incidentLevel}`} />}
              {data.reviewedByName && <Row label="Reviewed By" value={data.reviewedByName} />}
              {data.reviewedByDate && (
                <Row
                  label="Review Date"
                  value={format(new Date(data.reviewedByDate as string), "MM/dd/yyyy")}
                />
              )}
              {data.qmReviewInitials && <Row label="QM Initials" value={data.qmReviewInitials} />}
              {data.qmComments && <Row label="Comments" value={data.qmComments} />}
              {data.qmSignature && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">QM / Risk Reviewer Signature</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.qmSignature}
                    alt="QM signature"
                    className="border border-gray-200 rounded bg-white"
                    style={{ maxHeight: 80 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      <div className="bg-blue-50 border-b border-blue-200 px-5 py-3">
        <h3 className="font-semibold text-blue-900 text-sm uppercase tracking-wide">
          QM / Risk Management Review
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reviewed By (Name)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Review Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Incident Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">— Select Level —</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">QM Initials</label>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">QM Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          />
        </div>

        {/* Signature */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            QM / Risk Reviewer — Electronic Signature
          </p>
          <div
            className={`border rounded-lg overflow-hidden inline-block ${
              sigError ? "border-red-400" : "border-gray-300"
            }`}
          >
            <ReactSignatureCanvas
              ref={sigRef}
              penColor="#1d3461"
              canvasProps={{ width: 520, height: 110, className: "bg-white" }}
              onEnd={() => setSigError(false)}
            />
          </div>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
            {sigError && (
              <span className="text-red-500 text-xs">Signature is required</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save Review"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1 text-sm border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
