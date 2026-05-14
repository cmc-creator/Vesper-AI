"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitPacketButton({ packetId }: { packetId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!confirm("Submit this S&R packet? This will mark it as finalized and ready for provider sign-off. You will not be able to edit it after submission.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sr-packets/${packetId}/submit`, { method: "PATCH" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submit failed");
      }
      router.refresh();
      router.push(`/dashboard/sr-packets/${packetId}/print`);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60 flex items-center gap-2"
      >
        {loading ? "Submitting…" : "✓ Submit & Print"}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
