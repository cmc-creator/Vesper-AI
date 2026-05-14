"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded-lg text-sm transition flex items-center gap-2"
    >
      🖨 Print
    </button>
  );
}
