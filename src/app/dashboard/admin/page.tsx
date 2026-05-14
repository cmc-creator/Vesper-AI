"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type UserRow = { id: string; name: string; email: string; role: string; title: string | null; unit: string | null; createdAt: string };

const ROLES = ["STAFF", "PROVIDER", "SUPERVISOR", "ADMIN"];
const UNITS = ["Koi", "Monarch", "Cicada", "Phoenix", "Intake", "Lotus", "Reception"];

type CreateForm = { name: string; email: string; password: string; role: string; title: string; unit: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    defaultValues: { role: "STAFF" },
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function onCreate(data: CreateForm) {
    setCreating(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create user.");
    } else {
      const newUser = await res.json();
      setUsers((u) => [newUser, ...u]);
      setSuccess(`User "${data.name}" created.`);
      reset({ role: "STAFF" });
      setShowForm(false);
    }
    setCreating(false);
  }

  if (status === "loading" || loading) {
    return <div className="p-8 text-gray-400 text-center">Loading…</div>;
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "bg-red-50 text-red-700 border-red-100",
      SUPERVISOR: "bg-orange-50 text-orange-700 border-orange-100",
      PROVIDER: "bg-blue-50 text-blue-700 border-blue-100",
      STAFF: "bg-gray-50 text-gray-600 border-gray-200",
    };
    return map[role] ?? "bg-gray-100 text-gray-600";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users and system access</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); setSuccess(""); }}
          className="bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm"
        >
          {showForm ? "Cancel" : "+ New User"}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Create New User</h2>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                <input
                  type="password"
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Min 8 characters" } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <select
                  {...register("role", { required: true })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title / Credentials</label>
                <input
                  {...register("title")}
                  placeholder="e.g. RN, MD, MHT"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <select
                  {...register("unit")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— All Units —</option>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-800 transition disabled:opacity-60 text-sm"
              >
                {creating ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3 mb-4">
          {success}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">All Users ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-600 px-5 py-3">Name</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Email</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Role</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Title</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Unit</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`border text-xs px-2 py-0.5 rounded-full ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.title ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.unit ?? "All"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
