import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();

  const [recentPackets, srCount] = await Promise.all([
    prisma.sRPacket.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { patient: true },
    }),
    prisma.sRPacket.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="S&R Packets" value={srCount} color="bg-purple-50 text-purple-700" />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/sr-packets/new"
          className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition group"
        >
          <div className="bg-purple-100 text-purple-700 rounded-lg p-3 text-2xl">🔒</div>
          <div>
            <p className="font-semibold text-gray-900 group-hover:text-purple-700">New S&amp;R Packet</p>
            <p className="text-sm text-gray-500">Start a new Seclusion/Restraint documentation packet</p>
          </div>
        </Link>
      </div>

      {/* Recent Records */}
      <div className="grid gap-6">
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent S&amp;R Packets</h2>
            <Link href="/dashboard/sr-packets" className="text-sm text-blue-600 hover:underline">View all →</Link>
          </div>
          {recentPackets.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No S&amp;R packets yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentPackets.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/sr-packets/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.patient.fullName}</p>
                      <p className="text-xs text-gray-400">MRN {p.patient.mrn}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(p.createdAt), "MM/dd/yyyy")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color} bg-opacity-30`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}
