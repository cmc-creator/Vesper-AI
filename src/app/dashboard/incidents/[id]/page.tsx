import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Role } from "@prisma/client";
import QMReviewSection from "@/components/QMReviewSection";
import SupervisorReviewSection from "@/components/SupervisorReviewSection";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const ir = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      patient: true,
      reportedBy: { select: { name: true, title: true } },
      srPackets: { include: { physicianOrder: true } },
    },
  });

  if (!ir) notFound();

  const canEditQM =
    session.user.role === Role.ADMIN || session.user.role === Role.SUPERVISOR;

  const categories = (ir.categories as string[]) ?? [];
  const witnesses = (ir.witnesses as { name: string; isStaff: boolean; contactOrOther: string }[]) ?? [];
  const notifications = (ir.notifications as { party: string; name: string; contactMethod: string; date: string; time: string }[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/incidents" className="text-sm text-blue-600 hover:underline">← All Incidents</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Incident Report</h1>
          <p className="text-gray-500 text-sm">
            {ir.patient.fullName} &middot; MRN {ir.patient.mrn} &middot; {format(new Date(ir.incidentDate), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/api/incidents/${ir.id}/pdf`}
            download
            className="border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5"
          >
            ↓ Export PDF
          </a>
          <Link
            href={`/dashboard/sr-packets/new?incidentId=${ir.id}&patientId=${ir.patientId}`}
            className="bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-purple-800 transition"
          >
            + S&amp;R Packet
          </Link>
        </div>
      </div>

      <DetailCard title="Staff & Patient Info">
        <Row label="Reported By" value={`${ir.reporterName} (${ir.reportedBy.title ?? ir.reportedBy.name})`} />
        <Row label="Report Date" value={format(new Date(ir.reportDate), "MM/dd/yyyy")} />
        <Row label="Patient" value={ir.patient.fullName} />
        <Row label="DOB" value={format(new Date(ir.patient.dob), "MM/dd/yyyy")} />
        <Row label="MRN" value={ir.patient.mrn} />
        <Row label="Incident Date" value={format(new Date(ir.incidentDate), "MM/dd/yyyy")} />
        <Row label="Incident Time" value={ir.incidentTime} />
        <Row label="Unit" value={ir.unit} />
        <Row label="Location" value={ir.location + (ir.locationOther ? ` – ${ir.locationOther}` : "")} />
      </DetailCard>

      <DetailCard title="Incident Categories">
        {categories.length === 0 ? (
          <p className="text-gray-400 text-sm">None selected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100">
                {c}
              </span>
            ))}
          </div>
        )}
      </DetailCard>

      <DetailCard title="Summary of Event">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ir.summaryOfEvent}</p>
      </DetailCard>

      {witnesses.length > 0 && (
        <DetailCard title="Witnesses">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {witnesses.map((w, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2">{w.name}</td>
                  <td className="py-2">{w.isStaff ? "Staff" : "Other"}</td>
                  <td className="py-2">{w.contactOrOther}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DetailCard>
      )}

      <DetailCard title="Nursing Assessment">
        {ir.nursingAssessmentNA ? (
          <p className="text-gray-400 text-sm italic">N/A</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{ir.nursingAssessment}</p>
            <div className="flex gap-6 text-sm text-gray-600">
              <span>Pain Scale: {ir.painScale ?? "—"}</span>
              {ir.patientDeniesPain && <span className="text-green-600">Patient denies pain</span>}
            </div>
            {(ir.nurseAssessorName || ir.nurseAssessorDate) && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm text-gray-600">
                {ir.nurseAssessorName && <span>Nurse: {ir.nurseAssessorName}</span>}
                {ir.nurseAssessorDate && <span>Date: {format(new Date(ir.nurseAssessorDate), "MM/dd/yyyy")}</span>}
                {ir.nurseAssessorTime && <span>Time: {ir.nurseAssessorTime}</span>}
              </div>
            )}
          </>
        )}
      </DetailCard>

      <DetailCard title="Interventions / Treatment Given">
        {ir.interventionsNA ? (
          <p className="text-gray-400 text-sm italic">N/A – No interventions or treatment needed</p>
        ) : (() => {
          const INTERVENTION_LABELS: [keyof typeof ir, string][] = [
            ["interventionPrnMed", "PRN Med"],
            ["interventionLos", "Placed on LOS"],
            ["interventionOneToOne", "Placed on 1:1"],
            ["interventionUnitRestriction", "Unit Restriction"],
            ["interventionUnitChange", "Unit Change"],
            ["interventionRoomChange", "Room Change"],
            ["interventionTreatmentRefused", "Treatment Refused"],
            ["interventionSAndR", "S&R"],
            ["interventionXray", "X-ray"],
            ["interventionFirstAid", "First Aid"],
            ["interventionAdminDischarge", "Administrative Discharge"],
          ];
          const checked = INTERVENTION_LABELS.filter(([key]) => ir[key] === true);
          return (
            <>
              {checked.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {checked.map(([, label]) => (
                    <span key={label} className="bg-orange-50 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full border border-orange-100">
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {checked.length === 0 && !ir.interventionPrecautions && !ir.interventionTransferHosp && !ir.interventionOther && (
                <p className="text-gray-400 text-sm italic">None recorded</p>
              )}
              <div className="space-y-1 mt-1">
                {ir.interventionPrecautions && <Row label="Precautions Added" value={ir.interventionPrecautions} />}
                {ir.interventionTransferHosp && <Row label="Transfer to Hospital" value={ir.interventionTransferHosp} />}
                {ir.interventionTransferVia && <Row label="Transfer Via" value={ir.interventionTransferVia} />}
                {ir.interventionOtherBH && <Row label="Other BH Treatment" value={ir.interventionOtherBH} />}
                {ir.interventionOther && <Row label="Other" value={ir.interventionOther} />}
              </div>
            </>
          );
        })()}
      </DetailCard>

      {notifications.filter((n) => n.name || n.contactMethod).length > 0 && (
        <DetailCard title="Notifications">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left py-2">Party</th>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {notifications
                .filter((n) => n.name || n.contactMethod)
                .map((n, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{n.party}</td>
                    <td className="py-2">{n.name}</td>
                    <td className="py-2">{n.contactMethod}</td>
                    <td className="py-2">{n.date} {n.time}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </DetailCard>
      )}

      {/* Reporter & Nurse Signatures */}
      {(ir.signature || ir.nurseSignature) && (
        <div className="grid md:grid-cols-2 gap-4">
          {ir.signature && (
            <DetailCard title="Reporter Signature">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ir.signature} alt="Reporter signature" className="max-h-20 border border-gray-200 rounded bg-white" />
            </DetailCard>
          )}
          {ir.nurseSignature && (
            <DetailCard title="Nurse Signature">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ir.nurseSignature} alt="Nurse signature" className="max-h-20 border border-gray-200 rounded bg-white" />
            </DetailCard>
          )}
        </div>
      )}

      {/* House Supervisor Review */}
      <SupervisorReviewSection
        incidentId={ir.id}
        canEdit={canEditQM}
        initial={{
          supervisorName: ir.supervisorName,
          supervisorTitle: ir.supervisorTitle,
          supervisorDate: ir.supervisorDate?.toISOString() ?? null,
          supervisorComments: ir.supervisorComments,
          supervisorSignature: ir.supervisorSignature,
        }}
      />

      {/* QM / Risk Management Review */}
      <QMReviewSection
        incidentId={ir.id}
        canEdit={canEditQM}
        initial={{
          reviewedByName: ir.reviewedByName,
          reviewedByDate: ir.reviewedByDate?.toISOString() ?? null,
          incidentLevel: ir.incidentLevel,
          qmReviewInitials: ir.qmReviewInitials,
          qmComments: ir.qmComments,
          qmSignature: ir.qmSignature,
        }}
      />

      {ir.srPackets.length > 0 && (
        <DetailCard title="Linked S&R Packets">
          <ul className="space-y-2">
            {ir.srPackets.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/sr-packets/${p.id}`} className="text-blue-600 hover:underline text-sm">
                  S&R Packet — {format(new Date(p.createdAt), "MM/dd/yyyy HH:mm")}
                </Link>
              </li>
            ))}
          </ul>
        </DetailCard>
      )}
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1 text-sm border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
