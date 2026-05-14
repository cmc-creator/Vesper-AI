import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function SRPacketsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const packets = await prisma.sRPacket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patient: true,
      physicianOrder: { select: { id: true, isPhysicalRestraint: true, isSeclusion: true, isChemicalRestraint: true } },
      incidentReport: { select: { id: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">S&amp;R Packets</h1>
          <p className="text-sm text-gray-500 mt-1">Seclusion / Physical Hold / Chemical Restraint Documentation</p>
        </div>
        <Link
          href="/dashboard/sr-packets/new"
          className="bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm"
        >
          + New Packet
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {packets.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg mb-2">No S&amp;R packets yet</p>
            <Link href="/dashboard/sr-packets/new" className="text-blue-600 hover:underline text-sm">
              Create your first packet
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-600 px-5 py-3">Patient</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">MRN</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Type</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Linked Incident</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Date Created</th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packets.map((p) => {
                  const types = [
                    p.physicianOrder?.isPhysicalRestraint && "Physical",
                    p.physicianOrder?.isSeclusion && "Seclusion",
                    p.physicianOrder?.isChemicalRestraint && "Chemical",
                  ].filter((t): t is string => Boolean(t));
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-medium text-gray-900">{p.patient.fullName}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.patient.mrn}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {types.length > 0 ? types.map((t) => (
                            <span key={t} className="bg-purple-50 text-purple-700 border border-purple-100 text-xs px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          )) : <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.incidentReport ? (
                          <Link href={`/dashboard/incidents/${p.incidentReport.id}`} className="text-blue-600 hover:underline text-xs font-mono">
                            {p.incidentReport.id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(new Date(p.createdAt), "MM/dd/yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs px-2 py-0.5 rounded-full">
                          In Progress
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/sr-packets/${p.id}`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
