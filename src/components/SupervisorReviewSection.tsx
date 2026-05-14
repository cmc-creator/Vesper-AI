"use client";

import { useState, useRef, useEffect } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";

interface SupervisorReviewData {
  supervisorName?: string | null;
  supervisorTitle?: string | null;
  supervisorDate?: Date | string | null;
  supervisorComments?: string | null;
  supervisorSignature?: string | null;
}

interface Props {
  incidentId: string;
  initial: SupervisorReviewData;
  canEdit: boolean;
}

export default function SupervisorReviewSection({ incidentId, initial, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SupervisorReviewData>(initial);

  const [name, setName] = useState(initial.supervisorName ?? "");
  const [title, setTitle] = useState(initial.supervisorTitle ?? "");
  const [date, setDate] = useState(
    initial.supervisorDate
      ? format(new Date(initial.supervisorDate as string), "yyyy-MM-dd")
      : ""
  );
  const [comments, setComments] = useState(initial.supervisorComments ?? "");
  const [sigError, setSigError] = useState(false);
  const sigRef = useRef<ReactSignatureCanvas>(null);

  useEffect(() => {
    if (editing && initial.supervisorSignature && sigRef.current) {
      sigRef.current.fromDataURL(initial.supervisorSignature, {
        width: 520,
        height: 110,
      });
    }
  }, [editing, initial.supervisorSignature]);

  async function save() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setSigError(true);
      return;
    }
    setSigError(false);
    setSaving(true);

    const supervisorSignature = sigRef.current.getTrimmedCanvas().toDataURL("image/png");

    const res = await fetch(`/api/incidents/${incidentId}/supervisor-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supervisorName: name,
        supervisorTitle: title,
        supervisorDate: date || null,
        supervisorComments: comments,
        supervisorSignature,
      }),
    });

    if (res.ok) {
      setData({
        supervisorName: name,
        supervisorTitle: title,
        supervisorDate: date || null,
        supervisorComments: comments,
        supervisorSignature,
      });
      setEditing(false);
    }
    setSaving(false);
  }

  const hasReview = !!(data.supervisorName || data.supervisorSignature);

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            House Supervisor Review
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
            <p className="text-sm text-gray-400 italic">No supervisor review recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {data.supervisorName && (
                <Row
                  label="Supervisor"
                  value={data.supervisorTitle ? `${data.supervisorName} — ${data.supervisorTitle}` : data.supervisorName}
                />
              )}
              {data.supervisorDate && (
                <Row
                  label="Review Date"
                  value={format(new Date(data.supervisorDate as string), "MM/dd/yyyy")}
                />
              )}
              {data.supervisorComments && <Row label="Comments" value={data.supervisorComments} />}
              {data.supervisorSignature && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">House Supervisor Signature</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.supervisorSignature}
                    alt="Supervisor signature"
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
          House Supervisor Review
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supervisor Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RN, House Supervisor"
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
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            House Supervisor — Electronic Signature
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
