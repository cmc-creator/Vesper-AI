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
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user.name?.split(" ")[0]}
          </h1>
        </div>
        <Link
          href="/dashboard/sr-packets/new"
          className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition"
        >
          + New S&amp;R Packet
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total S&R Packets"
          value={srCount}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          accentClass="bg-blue-50 text-blue-700 border-blue-100"
          iconClass="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/sr-packets/new"
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-xl p-3 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition">New S&amp;R Packet</p>
              <p className="text-sm text-slate-500 mt-0.5">Start a new Seclusion/Restraint documentation</p>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 ml-auto transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/dashboard/sr-packets"
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="bg-slate-50 group-hover:bg-slate-100 text-slate-600 rounded-xl p-3 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition">View All Packets</p>
              <p className="text-sm text-slate-500 mt-0.5">Browse and manage existing S&amp;R records</p>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 ml-auto transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Recent Records */}
      <div>
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="font-semibold text-slate-800">Recent S&amp;R Packets</h2>
            <Link href="/dashboard/sr-packets" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition">
              View all →
            </Link>
          </div>
          {recentPackets.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No S&amp;R packets yet.</p>
              <Link href="/dashboard/sr-packets/new" className="text-blue-600 hover:underline text-sm mt-1">
                Create your first packet →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPackets.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/sr-packets/${p.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {p.patient.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition">{p.patient.fullName}</p>
                        <p className="text-xs text-slate-400">MRN {p.patient.mrn}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {format(new Date(p.createdAt), "MMM d, yyyy")}
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

function StatCard({
  label, value, icon, accentClass, iconClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
  iconClass: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accentClass} flex items-start justify-between`}>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm font-medium mt-1 opacity-75">{label}</p>
      </div>
      <div className={`rounded-lg p-2.5 ${iconClass}`}>
        {icon}
      </div>
    </div>
  );
}
