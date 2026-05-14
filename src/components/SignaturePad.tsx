"use client";
import { useRef, useEffect } from "react";
import ReactSignatureCanvas from "react-signature-canvas";

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  error?: string;
}

export default function SignaturePad({ value, onChange, label, error }: SignaturePadProps) {
  const sigRef = useRef<ReactSignatureCanvas>(null);

  // Pre-populate canvas if a value exists (e.g. after navigating back)
  useEffect(() => {
    if (value && sigRef.current && sigRef.current.isEmpty()) {
      sigRef.current.fromDataURL(value);
    }
  }, [value]);

  function handleEnd() {
    if (sigRef.current) {
      onChange(sigRef.current.getTrimmedCanvas().toDataURL("image/png"));
    }
  }

  function handleClear() {
    sigRef.current?.clear();
    onChange("");
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
      )}
      <div
        className={`border rounded-lg overflow-hidden bg-white ${
          error ? "border-red-400" : "border-gray-400"
        }`}
      >
        <ReactSignatureCanvas
          ref={sigRef}
          penColor="#1d3461"
          canvasProps={{
            width: 520,
            height: 110,
            style: { display: "block", width: "100%", height: 110, touchAction: "none" },
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">Sign above using your mouse or touchscreen</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-red-500 hover:underline"
        >
          Clear
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
}
