import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import SubmitPacketButton from "@/components/sr/SubmitPacketButton";

function SectionStatus({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm border ${
      complete
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-slate-50 border-slate-200 text-slate-500"
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          complete ? "bg-emerald-500" : "border-2 border-slate-300"
        }`}>
          {complete && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${complete ? "text-emerald-600" : "text-slate-400"}`}>
        {complete ? "Complete" : "Incomplete"}
      </span>
    </div>
  );
}

export default async function SRPacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;
  let packet: Awaited<ReturnType<typeof prisma.sRPacket.findUnique<{ where: { id: string }; include: { patient: true; incidentReport: { select: { id: true; incidentDate: true } }; createdBy: { select: { name: true; title: true } }; physicianOrder: true; faceToFaceEval: true; monitoringLogs: { include: { entries: true } }; terminationSummary: true; patientDebriefing: true; staffDebriefing: true; afterActionCritique: true } }>>> | null = null;
  try {
    packet = await prisma.sRPacket.findUnique({
      where: { id },
      include: {
        patient: true,
        incidentReport: { select: { id: true, incidentDate: true } },
        createdBy: { select: { name: true, title: true } },
        physicianOrder: true,
        faceToFaceEval: true,
        monitoringLogs: { include: { entries: true } },
        terminationSummary: true,
        patientDebriefing: true,
        staffDebriefing: true,
        afterActionCritique: true,
      },
    });
  } catch {
    // DB not available locally
  }

  if (!packet) notFound();

  const sections = [
    { label: "Physician Order", complete: !!packet.physicianOrder },
    { label: "1-Hr Face-to-Face Evaluation", complete: !!packet.faceToFaceEval },
    { label: "1:1 S/R Observation & Monitoring", complete: packet.monitoringLogs.length > 0 },
    { label: "Termination Summary", complete: !!packet.terminationSummary },
    { label: "Patient Debriefing", complete: !!packet.patientDebriefing },
    { label: "Staff Debriefing", complete: !!packet.staffDebriefing },
    { label: "After Action Critique", complete: !!packet.afterActionCritique },
  ];

  const totalComplete = sections.filter((s) => s.complete).length;
  const isFullyComplete = totalComplete === sections.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/sr-packets" className="text-sm text-gray-400 hover:text-gray-600">
              ← All Packets
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">S&amp;R Packet</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{packet.id}</p>
        </div>
        <div className="flex gap-2 items-start flex-wrap">
          {packet.submittedAt ? (
            <Link
              href={`/dashboard/sr-packets/${packet.id}/print`}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5"
            >
              🖨 Print / View
            </Link>
          ) : isFullyComplete ? (
            <SubmitPacketButton packetId={packet.id} />
          ) : null}
          <a
            href={`/api/sr-packets/${packet.id}/pdf`}
            download
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5"
          >
            ↓ Export PDF
          </a>
          {!packet.submittedAt && (
            <Link
              href={`/dashboard/sr-packets/new?packetId=${packet.id}&patientId=${packet.patientId}`}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition"
            >
              Edit / Continue
            </Link>
          )}
        </div>
      </div>

      {/* Completion / Submission status */}
      {packet.submittedAt ? (
        <div className="rounded-xl border bg-green-50 border-green-300 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">✓ Submitted — Pending Provider Sign-Off</p>
            <p className="text-sm text-green-700 mt-0.5">
              Submitted {format(new Date(packet.submittedAt), "MM/dd/yyyy 'at' h:mm a")}
            </p>
          </div>
          <Link
            href={`/dashboard/sr-packets/${packet.id}/print`}
            className="text-sm text-green-700 underline hover:text-green-900"
          >
            Print for signature →
          </Link>
        </div>
      ) : (
          <div className={`rounded-xl border p-4 ${isFullyComplete ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center justify-between">
            <p className={`font-semibold ${isFullyComplete ? "text-green-800" : "text-yellow-800"}`}>
              {isFullyComplete ? "✓ All sections complete — ready to submit" : `${totalComplete} / ${sections.length} sections complete`}
            </p>
            <div className="h-2 w-40 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isFullyComplete ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${(totalComplete / sections.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Patient */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-500 mb-3 text-xs uppercase tracking-wider">Patient</h2>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Name</span><p className="font-medium">{packet.patient.fullName}</p></div>
          <div><span className="text-gray-500">MRN</span><p className="font-mono font-medium">{packet.patient.mrn}</p></div>
          <div><span className="text-gray-500">DOB</span><p className="font-medium">{format(new Date(packet.patient.dob), "MM/dd/yyyy")}</p></div>
        </div>
        {packet.incidentReport && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Linked Incident: </span>
            <Link href={`/dashboard/incidents/${packet.incidentReport.id}`} className="text-blue-600 hover:underline font-mono">
              {packet.incidentReport.id.slice(0, 12)}…
            </Link>
            {packet.incidentReport.incidentDate && (
              <span className="text-gray-400 ml-2">({format(new Date(packet.incidentReport.incidentDate), "MM/dd/yyyy")})</span>
            )}
          </div>
        )}
      </div>

      {/* Section statuses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-500 mb-3 text-xs uppercase tracking-wider">Documentation Sections</h2>
        <div className="space-y-2">
          {sections.map((s) => (
            <SectionStatus key={s.label} label={s.label} complete={s.complete} />
          ))}
        </div>
      </div>

      {/* Physician Order summary */}
      {packet.physicianOrder && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Physician Order</h3>
          </div>
          <div className="px-5 py-4 text-sm space-y-2">
            <div className="flex gap-3 flex-wrap">
              {packet.physicianOrder.isPhysicalRestraint && <Badge color="purple">Physical Restraint</Badge>}
              {packet.physicianOrder.isSeclusion && <Badge color="blue">Seclusion</Badge>}
              {packet.physicianOrder.isChemicalRestraint && <Badge color="orange">Chemical Restraint</Badge>}
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-gray-700">
              <p><span className="font-medium">Nurse: </span>{packet.physicianOrder.nurseName ?? "—"}</p>
              <p><span className="font-medium">Physician: </span>{packet.physicianOrder.physicianName ?? "—"}</p>
              {packet.physicianOrder.reasonDescription && (
                <p className="md:col-span-2"><span className="font-medium">Reason: </span>{packet.physicianOrder.reasonDescription}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* F2F summary */}
      {packet.faceToFaceEval && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Face-to-Face Evaluation</h3>
          </div>
          <div className="px-5 py-4 text-sm grid md:grid-cols-2 gap-3 text-gray-700">
            <p><span className="font-medium">Date: </span>{format(new Date(packet.faceToFaceEval.evalDate), "MM/dd/yyyy")}</p>
            <p><span className="font-medium">Time: </span>{packet.faceToFaceEval.evalTime ?? "—"}</p>
            <p><span className="font-medium">RN: </span>{packet.faceToFaceEval.rnName ?? "—"}</p>
            <p><span className="font-medium">B/P: </span>{packet.faceToFaceEval.vitalsBP ?? "—"} &nbsp;|&nbsp; <span className="font-medium">Pulse: </span>{packet.faceToFaceEval.vitalsPulse ?? "—"}</p>
          </div>
        </div>
      )}

      {/* Monitoring summary */}
      {packet.monitoringLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">1:1 Monitoring Logs</h3>
          </div>
          <div className="px-5 py-4 text-sm text-gray-700">
            {packet.monitoringLogs.map((log, i) => (
              <p key={log.id}><span className="font-medium">Log {i + 1}: </span>{format(new Date(log.logDate), "MM/dd/yyyy")} &mdash; {log.entries.length} entries &mdash; {log.location ?? "—"}</p>
            ))}
          </div>
        </div>
      )}

      {/* Termination summary */}
      {packet.terminationSummary && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Termination Summary</h3>
          </div>
          <div className="px-5 py-4 text-sm grid md:grid-cols-3 gap-3 text-gray-700">
            <p><span className="font-medium">Total minutes: </span>{packet.terminationSummary.totalMinutes ?? "—"}</p>
            <p><span className="font-medium">RN: </span>{packet.terminationSummary.rnName ?? "—"}</p>
            <p><span className="font-medium">Airway: </span>{packet.terminationSummary.physAirwayIntact ? "✓" : "—"} &nbsp;|&nbsp; <span className="font-medium">Circulation: </span>{packet.terminationSummary.physCirculationGood ? "✓" : "—"}</p>
          </div>
        </div>
      )}

      {/* Created by */}
      <div className="text-xs text-gray-400 text-right pb-4">
        Created by {packet.createdBy.name} {packet.createdBy.title ? `(${packet.createdBy.title})` : ""} &bull; {format(new Date(packet.createdAt), "MM/dd/yyyy h:mm a")}
      </div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
  };
  return (
    <span className={`border text-xs px-2 py-0.5 rounded-full ${colors[color] ?? ""}`}>
      {children}
    </span>
  );
}
