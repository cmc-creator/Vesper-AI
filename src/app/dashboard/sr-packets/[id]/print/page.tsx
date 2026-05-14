import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import PrintButton from "./PrintButton";

export default async function SRPacketPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  let packet: Awaited<ReturnType<typeof prisma.sRPacket.findUnique<{ where: { id: string }; include: { patient: true; createdBy: { select: { name: true; title: true } }; physicianOrder: true; faceToFaceEval: true; monitoringLogs: { include: { entries: true } }; terminationSummary: true; patientDebriefing: true; staffDebriefing: true; afterActionCritique: true } }>>> | null = null;
  try {
    packet = await prisma.sRPacket.findUnique({
      where: { id },
      include: {
        patient: true,
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

  const p = packet.patient;

  return (
    <div className="print-container max-w-4xl mx-auto px-6 py-4 text-sm text-gray-900">
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { font-size: 11pt; }
          .print-container { max-width: 100%; padding: 0; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Print / Back Controls */}
      <div className="no-print flex items-center gap-3 mb-6">
        <a href={`/dashboard/sr-packets/${packet.id}`} className="text-sm text-gray-500 hover:text-gray-800">← Back to Packet</a>
        <PrintButton />
      </div>

      {/* Title */}
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wide">Seclusion &amp; Restraint Documentation Packet</h1>
        <p className="text-xs text-gray-600 mt-1">Destiny Springs Behavioral Health — CONFIDENTIAL</p>
        {packet.submittedAt && (
          <p className="text-xs text-gray-500 mt-1">Submitted: {format(new Date(packet.submittedAt), "MM/dd/yyyy h:mm a")}</p>
        )}
      </div>

      {/* Patient Info */}
      <Section title="Patient Information">
        <Grid>
          <Field label="Patient Name" value={p.fullName} />
          <Field label="MRN" value={p.mrn} />
          <Field label="Date of Birth" value={format(new Date(p.dob), "MM/dd/yyyy")} />
          <Field label="Created By" value={`${packet.createdBy.name}${packet.createdBy.title ? ` (${packet.createdBy.title})` : ""}`} />
          <Field label="Packet Created" value={format(new Date(packet.createdAt), "MM/dd/yyyy h:mm a")} />
        </Grid>
      </Section>

      {/* Physician Order */}
      {packet.physicianOrder && (
        <Section title="Section 1 — Physician Order">
          <div className="space-y-2">
            <div className="flex gap-3 flex-wrap">
              {packet.physicianOrder.isPhysicalRestraint && <TypeBadge>Physical Restraint</TypeBadge>}
              {packet.physicianOrder.isSeclusion && <TypeBadge>Seclusion</TypeBadge>}
              {packet.physicianOrder.isChemicalRestraint && <TypeBadge>Chemical Restraint</TypeBadge>}
            </div>
            <Grid>
              <Field label="Nurse Name" value={packet.physicianOrder.nurseName} />
              <Field label="Nurse Date/Time" value={`${fmtDate(packet.physicianOrder.nurseDate)} ${packet.physicianOrder.nurseTime ?? ""}`} />
              <Field label="Physician Name" value={packet.physicianOrder.physicianName} />
              <Field label="Physician Date/Time" value={`${fmtDate(packet.physicianOrder.physicianDate)} ${packet.physicianOrder.physicianTime ?? ""}`} />
            </Grid>
            {packet.physicianOrder.reasonDescription && (
              <div>
                <span className="font-semibold">Reason: </span>{packet.physicianOrder.reasonDescription}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Face-to-Face */}
      {packet.faceToFaceEval && (
        <Section title="Section 2 — 1-Hr Face-to-Face Evaluation">
          <Grid>
            <Field label="Eval Date" value={fmtDate(packet.faceToFaceEval.evalDate)} />
            <Field label="Eval Time" value={packet.faceToFaceEval.evalTime} />
            <Field label="Practitioner" value={packet.faceToFaceEval.practitionerName} />
            <Field label="Practitioner Date/Time" value={`${fmtDate(packet.faceToFaceEval.practitionerDate)} ${packet.faceToFaceEval.practitionerTime ?? ""}`} />
            <Field label="RN Name" value={packet.faceToFaceEval.rnName} />
            <Field label="B/P" value={packet.faceToFaceEval.vitalsBP} />
            <Field label="Pulse" value={packet.faceToFaceEval.vitalsPulse} />
            <Field label="Resp" value={packet.faceToFaceEval.vitalsRespirations} />
            <Field label="Patient Refused Vitals" value={packet.faceToFaceEval.vitalsPatientRefused ? "Yes" : "No"} />
          </Grid>
        </Section>
      )}

      {/* Monitoring Logs */}
      {packet.monitoringLogs.length > 0 && (
        <Section title="Section 3 — 1:1 S/R Observation &amp; Monitoring">
          {packet.monitoringLogs.map((log, i) => (
            <div key={log.id} className="mb-3">
              <p className="font-semibold text-xs uppercase text-gray-600 mb-1">Log {i + 1} — {fmtDate(log.logDate)} — {log.location ?? ""}</p>
              {log.entries.length > 0 && (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border border-gray-300">
                      <th className="border border-gray-300 px-2 py-1 text-left">Time</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Behavior</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Intervention</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.entries.map((e, j) => (
                      <tr key={j} className="border border-gray-300">
                        <td className="border border-gray-300 px-2 py-0.5">{e.militaryTime}</td>
                        <td className="border border-gray-300 px-2 py-0.5">{e.behaviorCode}</td>
                        <td className="border border-gray-300 px-2 py-0.5">{e.interventionCode}</td>
                        <td className="border border-gray-300 px-2 py-0.5">{e.staffInitials}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Termination */}
      {packet.terminationSummary && (
        <Section title="Section 4 — Termination of S/R">
          <Grid>
            <Field label="Total Minutes" value={packet.terminationSummary.totalMinutes?.toString()} />
            <Field label="RN Name" value={packet.terminationSummary.rnName} />
            <Field label="RN Date/Time" value={`${fmtDate(packet.terminationSummary.rnDate)} ${packet.terminationSummary.rnTime ?? ""}`} />
            <Field label="Behavioral/Psych Status" value={packet.terminationSummary.behaviorPsychStatus} />
            <Field label="Airway Intact" value={packet.terminationSummary.physAirwayIntact ? "Yes" : "No"} />
            <Field label="Circulation OK" value={packet.terminationSummary.physCirculationGood ? "Yes" : "No"} />
          </Grid>
        </Section>
      )}

      {/* Patient Debriefing */}
      {packet.patientDebriefing && (
        <Section title="Section 5 — Patient Debriefing">
          <Grid>
            <Field label="Date" value={fmtDate(packet.patientDebriefing.debriefDate)} />
            <Field label="Time" value={packet.patientDebriefing.debriefTime} />
            <Field label="Patient Refused" value={packet.patientDebriefing.patientRefused ? "Yes" : "No"} />
          </Grid>
        </Section>
      )}

      {/* Staff Debriefing */}
      {packet.staffDebriefing && (
        <Section title="Section 6 — Staff Debriefing">
          <Grid>
            <Field label="Date" value={fmtDate(packet.staffDebriefing.debriefDate)} />
            <Field label="Time" value={packet.staffDebriefing.debriefTime} />
          </Grid>
        </Section>
      )}

      {/* After Action */}
      {packet.afterActionCritique && (
        <Section title="Section 7 — After Action Critique">
          <Grid>
            <Field label="Completed By" value={packet.afterActionCritique.completedByName} />
            <Field label="Date" value={fmtDate(packet.afterActionCritique.completedDate)} />
          </Grid>
        </Section>
      )}

      {/* Provider Sign-Off */}
      <div className="page-break" />
      <Section title="Provider Sign-Off">
        <p className="text-xs text-gray-600 mb-4">
          By signing below, the reviewing provider attests that this Seclusion &amp; Restraint documentation packet has been reviewed and is complete and accurate to the best of their knowledge.
        </p>
        <div className="space-y-6 mt-4">
          <SignLine label="Provider Signature" />
          <SignLine label="Printed Name" />
          <SignLine label="Title / Credentials" />
          <SignLine label="Date" />
          <SignLine label="Time" />
        </div>
      </Section>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-3 mt-6 text-xs text-gray-500 text-center">
        Packet ID: {packet.id} &bull; Printed: {format(new Date(), "MM/dd/yyyy h:mm a")} &bull; CONFIDENTIAL — FOR AUTHORIZED USE ONLY
      </div>
    </div>
  );
}

// Helpers
function fmtDate(val: Date | string | null | undefined): string {
  if (!val) return "—";
  try { return format(new Date(val), "MM/dd/yyyy"); } catch { return String(val); }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-bold text-sm uppercase tracking-wide bg-gray-100 px-3 py-1.5 border border-gray-300 mb-2">{title}</h2>
      <div className="px-1">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-gray-400 text-xs px-2 py-0.5 rounded font-medium">{children}</span>
  );
}

function SignLine({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-4">
      <span className="text-sm font-medium w-48 flex-shrink-0">{label}:</span>
      <div className="flex-1 border-b border-gray-600 h-6" />
    </div>
  );
}
