import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: "#111827" },
  header: { borderBottomWidth: 2, borderBottomColor: "#1e3a8a", paddingBottom: 8, marginBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  orgName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  orgSub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docSub: { fontSize: 8, color: "#6b7280", textAlign: "right", marginTop: 2 },
  confidential: { marginTop: 5, fontSize: 7, color: "#dc2626", textAlign: "center", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 9, border: "1 solid #e5e7eb", borderRadius: 4 },
  sH: { backgroundColor: "#f1f5f9", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  sT: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.8 },
  sB: { paddingVertical: 7, paddingHorizontal: 8 },
  row: { flexDirection: "row", marginBottom: 3 },
  lbl: { width: 120, color: "#6b7280", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  val: { flex: 1, color: "#111827" },
  g2: { flexDirection: "row", gap: 10, marginBottom: 4 },
  g3: { flexDirection: "row", gap: 8, marginBottom: 4 },
  g4: { flexDirection: "row", gap: 6, marginBottom: 4 },
  cell: { flex: 1 },
  cL: { color: "#6b7280", fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 1 },
  cV: { color: "#111827", fontSize: 9 },
  statusComplete: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6, backgroundColor: "#f0fdf4", borderWidth: 0.5, borderColor: "#86efac", borderRadius: 3, marginBottom: 2 },
  statusPending: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6, backgroundColor: "#f9fafb", borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 3, marginBottom: 2 },
  statusLblC: { fontSize: 8.5, color: "#15803d" },
  statusLblP: { fontSize: 8.5, color: "#6b7280" },
  statusValC: { fontSize: 8, color: "#16a34a", fontFamily: "Helvetica-Bold" },
  statusValP: { fontSize: 8, color: "#9ca3af" },
  bodyText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  tH: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 3, paddingHorizontal: 4 },
  tR: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6", paddingVertical: 3, paddingHorizontal: 4 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#374151" },
  td: { fontSize: 8.5, color: "#111827" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#d1d5db", paddingTop: 4 },
  fT: { fontSize: 7, color: "#9ca3af" },
  badgePurple: { backgroundColor: "#f5f3ff", borderWidth: 0.5, borderColor: "#ddd6fe", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1.5, marginRight: 4 },
  badgeBlue: { backgroundColor: "#eff6ff", borderWidth: 0.5, borderColor: "#bfdbfe", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1.5, marginRight: 4 },
  badgeOrange: { backgroundColor: "#fff7ed", borderWidth: 0.5, borderColor: "#fed7aa", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1.5, marginRight: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 5 },
});

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
function fmtTime(t: string | null | undefined) { return t ?? "—"; }

interface SRData {
  id: string;
  createdAt: string | Date;
  patient: { fullName: string; dob: string | Date; mrn: string };
  createdBy: { name: string; title?: string | null };
  incidentReport?: { id: string; incidentDate: string | Date } | null;
  physicianOrder?: {
    isPhysicalRestraint: boolean; isSeclusion: boolean; isChemicalRestraint: boolean;
    physRestDate?: string | Date | null; physRestStartTime?: string | null; physRestEndTime?: string | null;
    seclusionDate?: string | Date | null; seclusionStartTime?: string | null; seclusionEndTime?: string | null;
    reasonDTO: boolean; reasonDTS: boolean; reasonDescription?: string | null;
    nurseName?: string | null; nurseDate?: string | Date | null; physicianName?: string | null; physicianDate?: string | Date | null;
  } | null;
  faceToFaceEval?: {
    evalDate: string | Date; evalTime?: string | null; rnName?: string | null;
    vitalsBP?: string | null; vitalsPulse?: string | null; vitalsResp?: string | null; vitalsTemp?: string | null;
    evaluatorName?: string | null;
  } | null;
  monitoringLogs?: { id: string; logDate: string | Date; location?: string | null; entries: { id: string }[] }[];
  terminationSummary?: {
    totalMinutes?: number | null; rnName?: string | null;
    physAirwayIntact: boolean; physCirculationGood: boolean; physMusculoskeletal: boolean;
    injuryComplaints?: boolean | null;
  } | null;
  patientDebriefing?: {
    debriefDate: string | Date; patientRefused: boolean; rnName?: string | null;
  } | null;
  staffDebriefing?: {
    debriefDate: string | Date; facilitatorName?: string | null;
  } | null;
  afterActionCritique?: {
    completedByName?: string | null; reviewedByName?: string | null;
  } | null;
}

const SECTIONS = [
  "Physician Order", "1-Hr Face-to-Face Evaluation", "1:1 S/R Observation & Monitoring",
  "Termination Summary", "Patient Debriefing", "Staff Debriefing", "After Action Critique",
];

export function SRPacketPdf({ packet }: { packet: SRData }) {
  const complete = [
    !!packet.physicianOrder,
    !!packet.faceToFaceEval,
    (packet.monitoringLogs?.length ?? 0) > 0,
    !!packet.terminationSummary,
    !!packet.patientDebriefing,
    !!packet.staffDebriefing,
    !!packet.afterActionCritique,
  ];
  const totalComplete = complete.filter(Boolean).length;

  return (
    <Document title={`S&R Packet – ${packet.patient.fullName}`}>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.orgName}>Destiny Springs</Text>
              <Text style={s.orgSub}>Behavioral Health</Text>
            </View>
            <View>
              <Text style={s.docTitle}>Seclusion &amp; Restraint Packet</Text>
              <Text style={s.docSub}>ID: {packet.id.slice(0, 16)}</Text>
            </View>
          </View>
          <Text style={s.confidential}>CONFIDENTIAL — DO NOT FILE IN PATIENT RECORD (After Action)</Text>
        </View>

        {/* Patient */}
        <View style={s.section}>
          <View style={s.sH}><Text style={s.sT}>Patient Information</Text></View>
          <View style={s.sB}>
            <View style={s.g3}>
              <View style={s.cell}><Text style={s.cL}>Patient Name</Text><Text style={s.cV}>{packet.patient.fullName}</Text></View>
              <View style={s.cell}><Text style={s.cL}>Date of Birth</Text><Text style={s.cV}>{fmt(packet.patient.dob)}</Text></View>
              <View style={s.cell}><Text style={s.cL}>MRN</Text><Text style={s.cV}>{packet.patient.mrn}</Text></View>
            </View>
            <View style={s.g2}>
              <View style={s.cell}><Text style={s.cL}>Packet Created</Text><Text style={s.cV}>{fmt(packet.createdAt)}</Text></View>
              <View style={s.cell}><Text style={s.cL}>Created By</Text><Text style={s.cV}>{packet.createdBy.name}{packet.createdBy.title ? ` (${packet.createdBy.title})` : ""}</Text></View>
            </View>
            {packet.incidentReport && (
              <View style={s.row}>
                <Text style={s.lbl}>Linked Incident</Text>
                <Text style={s.val}>{packet.incidentReport.id.slice(0, 12)} — {fmt(packet.incidentReport.incidentDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Completion Status */}
        <View style={s.section}>
          <View style={s.sH}><Text style={s.sT}>Documentation Status ({totalComplete}/{SECTIONS.length} complete)</Text></View>
          <View style={s.sB}>
            {SECTIONS.map((sec, i) => (
              <View key={i} style={complete[i] ? s.statusComplete : s.statusPending}>
                <Text style={complete[i] ? s.statusLblC : s.statusLblP}>{sec}</Text>
                <Text style={complete[i] ? s.statusValC : s.statusValP}>{complete[i] ? "✓ Complete" : "Incomplete"}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Physician Order */}
        {packet.physicianOrder && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>Physician Order</Text></View>
            <View style={s.sB}>
              <View style={s.badgeRow}>
                {packet.physicianOrder.isPhysicalRestraint && <View style={s.badgePurple}><Text style={{ fontSize: 8, color: "#7c3aed" }}>Physical Restraint</Text></View>}
                {packet.physicianOrder.isSeclusion && <View style={s.badgeBlue}><Text style={{ fontSize: 8, color: "#1d4ed8" }}>Seclusion</Text></View>}
                {packet.physicianOrder.isChemicalRestraint && <View style={s.badgeOrange}><Text style={{ fontSize: 8, color: "#c2410c" }}>Chemical Restraint</Text></View>}
              </View>
              {packet.physicianOrder.isPhysicalRestraint && (
                <View style={s.g3}>
                  <View style={s.cell}><Text style={s.cL}>Phys. Restraint Date</Text><Text style={s.cV}>{fmt(packet.physicianOrder.physRestDate)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>Start</Text><Text style={s.cV}>{fmtTime(packet.physicianOrder.physRestStartTime)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>End</Text><Text style={s.cV}>{fmtTime(packet.physicianOrder.physRestEndTime)}</Text></View>
                </View>
              )}
              {packet.physicianOrder.isSeclusion && (
                <View style={s.g3}>
                  <View style={s.cell}><Text style={s.cL}>Seclusion Date</Text><Text style={s.cV}>{fmt(packet.physicianOrder.seclusionDate)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>Start</Text><Text style={s.cV}>{fmtTime(packet.physicianOrder.seclusionStartTime)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>End</Text><Text style={s.cV}>{fmtTime(packet.physicianOrder.seclusionEndTime)}</Text></View>
                </View>
              )}
              {packet.physicianOrder.reasonDescription && (
                <View style={s.row}><Text style={s.lbl}>Reason</Text><Text style={s.val}>{packet.physicianOrder.reasonDescription}</Text></View>
              )}
              <View style={s.g2}>
                <View style={s.cell}><Text style={s.cL}>Nurse</Text><Text style={s.cV}>{packet.physicianOrder.nurseName ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Physician</Text><Text style={s.cV}>{packet.physicianOrder.physicianName ?? "—"}</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Face-to-Face */}
        {packet.faceToFaceEval && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>1-Hour Face-to-Face Evaluation</Text></View>
            <View style={s.sB}>
              <View style={s.g4}>
                <View style={s.cell}><Text style={s.cL}>Date</Text><Text style={s.cV}>{fmt(packet.faceToFaceEval.evalDate)}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Time</Text><Text style={s.cV}>{fmtTime(packet.faceToFaceEval.evalTime)}</Text></View>
                <View style={s.cell}><Text style={s.cL}>RN</Text><Text style={s.cV}>{packet.faceToFaceEval.rnName ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Evaluator</Text><Text style={s.cV}>{packet.faceToFaceEval.evaluatorName ?? "—"}</Text></View>
              </View>
              <View style={s.g4}>
                <View style={s.cell}><Text style={s.cL}>B/P</Text><Text style={s.cV}>{packet.faceToFaceEval.vitalsBP ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Pulse</Text><Text style={s.cV}>{packet.faceToFaceEval.vitalsPulse ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Resp</Text><Text style={s.cV}>{packet.faceToFaceEval.vitalsResp ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Temp</Text><Text style={s.cV}>{packet.faceToFaceEval.vitalsTemp ?? "—"}</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Monitoring */}
        {(packet.monitoringLogs?.length ?? 0) > 0 && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>1:1 S/R Observation &amp; Monitoring</Text></View>
            <View style={s.sB}>
              <View style={s.tH}>
                <Text style={[s.th, { flex: 1.5 }]}>Date</Text>
                <Text style={[s.th, { flex: 2 }]}>Location</Text>
                <Text style={[s.th, { flex: 1 }]}>Entries</Text>
              </View>
              {packet.monitoringLogs!.map((log, i) => (
                <View key={i} style={s.tR}>
                  <Text style={[s.td, { flex: 1.5 }]}>{fmt(log.logDate)}</Text>
                  <Text style={[s.td, { flex: 2 }]}>{log.location ?? "—"}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{log.entries.length}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Termination */}
        {packet.terminationSummary && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>Termination Summary</Text></View>
            <View style={s.sB}>
              <View style={s.g3}>
                <View style={s.cell}><Text style={s.cL}>Total Minutes</Text><Text style={s.cV}>{packet.terminationSummary.totalMinutes ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>RN</Text><Text style={s.cV}>{packet.terminationSummary.rnName ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Injury Complaints</Text><Text style={s.cV}>{packet.terminationSummary.injuryComplaints ? "Yes" : "No"}</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Debriefings */}
        {(packet.patientDebriefing || packet.staffDebriefing) && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>Debriefings</Text></View>
            <View style={s.sB}>
              {packet.patientDebriefing && (
                <View style={[s.g2, { marginBottom: 4 }]}>
                  <View style={s.cell}><Text style={s.cL}>Patient Debriefing Date</Text><Text style={s.cV}>{fmt(packet.patientDebriefing.debriefDate)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>RN</Text><Text style={s.cV}>{packet.patientDebriefing.rnName ?? "—"}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>Patient Refused</Text><Text style={s.cV}>{packet.patientDebriefing.patientRefused ? "Yes" : "No"}</Text></View>
                </View>
              )}
              {packet.staffDebriefing && (
                <View style={s.g2}>
                  <View style={s.cell}><Text style={s.cL}>Staff Debriefing Date</Text><Text style={s.cV}>{fmt(packet.staffDebriefing.debriefDate)}</Text></View>
                  <View style={s.cell}><Text style={s.cL}>Facilitator</Text><Text style={s.cV}>{packet.staffDebriefing.facilitatorName ?? "—"}</Text></View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* After Action */}
        {packet.afterActionCritique && (
          <View style={s.section}>
            <View style={s.sH}><Text style={s.sT}>After Action Critique</Text></View>
            <View style={s.sB}>
              <View style={s.g2}>
                <View style={s.cell}><Text style={s.cL}>Completed By</Text><Text style={s.cV}>{packet.afterActionCritique.completedByName ?? "—"}</Text></View>
                <View style={s.cell}><Text style={s.cL}>Reviewed By QM/Risk</Text><Text style={s.cV}>{packet.afterActionCritique.reviewedByName ?? "—"}</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.fT}>Destiny Springs — Confidential S&amp;R Packet</Text>
          <Text style={s.fT} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderSRPacketPdf(packet: SRData): Promise<Buffer> {
  return renderToBuffer(<SRPacketPdf packet={packet} />);
}
