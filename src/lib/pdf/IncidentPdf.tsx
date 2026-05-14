import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  orgName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  orgSub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docSub: { fontSize: 8, color: "#6b7280", textAlign: "right", marginTop: 2 },
  confidential: {
    marginTop: 5,
    fontSize: 7,
    color: "#dc2626",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
  // ── Sections ────────────────────────────────────────────────────────────
  section: {
    marginBottom: 10,
    border: "1 solid #e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionBody: { paddingVertical: 7, paddingHorizontal: 8 },
  // ── Rows ────────────────────────────────────────────────────────────────
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#6b7280", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  value: { flex: 1, color: "#111827" },
  grid2: { flexDirection: "row", gap: 10 },
  grid3: { flexDirection: "row", gap: 8 },
  cell: { flex: 1 },
  cellLabel: { color: "#6b7280", fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 1 },
  cellValue: { color: "#111827", fontSize: 9 },
  // ── Table ────────────────────────────────────────────────────────────────
  table: { marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#374151" },
  td: { fontSize: 8.5, color: "#111827" },
  // ── Categories ──────────────────────────────────────────────────────────
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  tag: {
    backgroundColor: "#eff6ff",
    borderWidth: 0.5,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 7.5, color: "#1d4ed8" },
  // ── Body text ───────────────────────────────────────────────────────────
  bodyText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    paddingTop: 4,
  },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

interface IncidentData {
  id: string;
  reportDate: string | Date;
  reporterName: string;
  reportedBy: { name: string; title?: string | null };
  patient: { fullName: string; dob: string | Date; mrn: string };
  incidentDate: string | Date;
  incidentTime: string;
  unit: string;
  location: string;
  locationOther?: string | null;
  categories: string[];
  summaryOfEvent: string;
  witnesses: { name: string; isStaff: boolean; contactOrOther: string }[];
  nursingAssessmentNA?: boolean;
  nursingAssessment?: string | null;
  painScale?: number | null;
  patientDeniesPain?: boolean;
  notifications: { party: string; name: string; contactMethod: string; date: string; time: string }[];
  incidentLevel?: string | null;
  reviewedByName?: string | null;
  qmReviewInitials?: string | null;
  qmComments?: string | null;
}

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function IncidentPdf({ ir }: { ir: IncidentData }) {
  const catList = ir.categories ?? [];
  const witnessList = (ir.witnesses ?? []).filter((w) => w.name);
  const notifList = (ir.notifications ?? []).filter((n) => n.name || n.contactMethod);

  return (
    <Document title={`Incident Report – ${ir.patient.fullName}`}>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.orgName}>Destiny Springs</Text>
              <Text style={styles.orgSub}>Behavioral Health</Text>
            </View>
            <View>
              <Text style={styles.docTitle}>Incident Report</Text>
              <Text style={styles.docSub}>ID: {ir.id.slice(0, 16)}</Text>
            </View>
          </View>
          <Text style={styles.confidential}>CONFIDENTIAL — DO NOT COPY OR DISTRIBUTE</Text>
        </View>

        {/* ── Staff & Patient ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff &amp; Patient Information</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.grid2}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Reported By</Text>
                <Text style={styles.cellValue}>{ir.reporterName} ({ir.reportedBy.title ?? ir.reportedBy.name})</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Report Date</Text>
                <Text style={styles.cellValue}>{fmt(ir.reportDate)}</Text>
              </View>
            </View>
            <View style={[styles.grid3, { marginTop: 6 }]}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Patient Name</Text>
                <Text style={styles.cellValue}>{ir.patient.fullName}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Date of Birth</Text>
                <Text style={styles.cellValue}>{fmt(ir.patient.dob)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>MRN</Text>
                <Text style={styles.cellValue}>{ir.patient.mrn}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Incident Info ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incident Information</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.grid3}>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Date</Text>
                <Text style={styles.cellValue}>{fmt(ir.incidentDate)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Time</Text>
                <Text style={styles.cellValue}>{ir.incidentTime}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>Unit</Text>
                <Text style={styles.cellValue}>{ir.unit}</Text>
              </View>
            </View>
            <View style={[styles.row, { marginTop: 5 }]}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{ir.location}{ir.locationOther ? ` – ${ir.locationOther}` : ""}</Text>
            </View>
          </View>
        </View>

        {/* ── Incident Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incident Type</Text>
          </View>
          <View style={styles.sectionBody}>
            {catList.length === 0 ? (
              <Text style={{ color: "#9ca3af", fontSize: 8 }}>None selected</Text>
            ) : (
              <View style={styles.tagRow}>
                {catList.map((c, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Summary of Event</Text>
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.bodyText}>{ir.summaryOfEvent}</Text>
          </View>
        </View>

        {/* ── Witnesses ── */}
        {witnessList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Witnesses / Other Parties</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Type</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Contact</Text>
                </View>
                {witnessList.map((w, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2 }]}>{w.name}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{w.isStaff ? "Staff" : "Other"}</Text>
                    <Text style={[styles.td, { flex: 2 }]}>{w.contactOrOther}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Nursing Assessment ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nursing Assessment</Text>
          </View>
          <View style={styles.sectionBody}>
            {ir.nursingAssessmentNA ? (
              <Text style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</Text>
            ) : (
              <>
                <Text style={styles.bodyText}>{ir.nursingAssessment ?? "—"}</Text>
                {(ir.painScale != null || ir.patientDeniesPain) && (
                  <View style={[styles.row, { marginTop: 4 }]}>
                    {ir.painScale != null && (
                      <Text style={[styles.label, { width: 80 }]}>Pain Scale: {ir.painScale}</Text>
                    )}
                    {ir.patientDeniesPain && (
                      <Text style={{ color: "#16a34a" }}>Patient denies pain</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* ── Notifications ── */}
        {notifList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.5 }]}>Party</Text>
                  <Text style={[styles.th, { flex: 1.5 }]}>Name</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Method</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Date/Time</Text>
                </View>
                {notifList.map((n, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 1.5 }]}>{n.party}</Text>
                    <Text style={[styles.td, { flex: 1.5 }]}>{n.name}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{n.contactMethod}</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{n.date} {n.time}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── QM Review ── */}
        {ir.incidentLevel && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>QM Review</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.grid3}>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>Incident Level</Text>
                  <Text style={styles.cellValue}>Level {ir.incidentLevel}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>Reviewed By</Text>
                  <Text style={styles.cellValue}>{ir.reviewedByName ?? "—"}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>QM Initials</Text>
                  <Text style={styles.cellValue}>{ir.qmReviewInitials ?? "—"}</Text>
                </View>
              </View>
              {ir.qmComments && (
                <View style={[styles.row, { marginTop: 5 }]}>
                  <Text style={styles.label}>Comments</Text>
                  <Text style={styles.value}>{ir.qmComments}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Destiny Springs — Confidential Incident Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderIncidentPdf(ir: IncidentData): Promise<Buffer> {
  return renderToBuffer(<IncidentPdf ir={ir} />);
}
