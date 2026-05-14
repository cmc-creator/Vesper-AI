import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default async function IncidentListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let incidents: Awaited<ReturnType<typeof prisma.incidentReport.findMany<{ include: { patient: true; reportedBy: { select: { name: true } } } }>>> = [];
  try {
    incidents = await prisma.incidentReport.findMany({
      include: { patient: true, reportedBy: { select: { name: true } } },
      orderBy: { incidentDate: "desc" },
    });
  } catch {
    // DB not available locally
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incident Reports</h1>
        <Link href="/dashboard/incidents/new" className="bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-800 transition">
          + New Incident
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {incidents.length === 0 ? (
          <p className="px-6 py-10 text-center text-gray-400">No incident reports yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">MRN</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Unit</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Reported By</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Level</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.map((ir) => (
                <tr key={ir.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{ir.patient.fullName}</td>
                  <td className="px-5 py-3 text-gray-500">{ir.patient.mrn}</td>
                  <td className="px-5 py-3 text-gray-500">{ir.unit}</td>
                  <td className="px-5 py-3 text-gray-500">{format(new Date(ir.incidentDate), "MM/dd/yyyy")}</td>
                  <td className="px-5 py-3 text-gray-500">{ir.reportedBy.name}</td>
                  <td className="px-5 py-3">
                    {ir.incidentLevel ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        Level {ir.incidentLevel}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/dashboard/incidents/${ir.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
