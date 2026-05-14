"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 relative overflow-hidden">
      {/* Subtle background circles */}
      <div className="absolute top-[-15%] right-[-10%] w-96 h-96 rounded-full bg-blue-700 opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-8%] w-80 h-80 rounded-full bg-indigo-600 opacity-10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />

          <div className="px-8 pt-8 pb-9">
            {/* Brand */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-xl tracking-tight">DS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Destiny Springs</h1>
              <p className="text-slate-500 text-sm mt-1">Seclusion &amp; Restraint Documentation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@destinysprings.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In →"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-5">
          Destiny Springs Behavioral Health &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
